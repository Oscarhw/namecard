const sequelize = require('sequelize');
const Op = sequelize.Op;
const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

const db = require('../models');
let helper = require("../config/helper");

//models
const Users = db.users;
const chatRoom = db.chat_room;
const chatMessage = db.chat_message;
const groupMember = db.group_member;
const pushNotification = require("./../notification/pushnotificaion");
const { parse } = require('path');

//relation
chatRoom.hasOne(chatMessage, { foreignKey: 'room_id' });
chatRoom.hasMany(groupMember, { foreignKey: 'room_id' });
chatRoom.hasOne(Users, { foreignKey: 'id' , sourceKey: 'sender_id' });

module.exports = {
    allRegisterUserList: async (req, res) => {
        try {
            let userDetails = await Users.findAll({
                attributes: ['id', 'user_name', 'user_email', 'telephone_num' , 'profile'],
                where: { id: { [Op.notIn]: [req.user.id] }, user_name: { [Op.ne]: "" }, role: 1 }
            });

            return helper.success(res, "Users fetched successfully..!!", userDetails);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    createChatRoom: async (req, res) => {
        console.log("******************** createChatRoom..!! *************************");
        try {
            const required = { receiver_id } = req.body;
            const nonRequired = {}
            await helper.vaildObject(required, nonRequired);

            let userChat = await chatRoom.findOrCreate({
                attributes: ['id', 'sender_id', 'receiver_id'],
                where: {
                    [Op.or]: [
                        {
                            [Op.and]: [
                                { sender_id: req.user.id },
                                { receiver_id: req.body.receiver_id },
                            ],
                        },
                        {
                            [Op.and]: [
                                { sender_id: req.body.receiver_id },
                                { receiver_id: req.user.id },
                            ]
                        }
                    ]
                },
                defaults: {
                    id: uuidv4(),
                    chat_room_type: req.body.chat_room_type,
                    sender_id: req.user.id,
                    receiver_id: req.body.receiver_id
                }
            });

            let userDetails = await Users.findOne({
                where: {
                    id: req.user.id
                }
            })

            return helper.success(res, "chat room create successfully", { room_id: userChat[0].id, sender_name: userDetails.user_name });
        } catch (err) {
            return helper.error(res, err);
        }
    },
/* 
Note: 
    msg_type => 1 - text,  2 - media ,  3 - video , 4 - file , 5 - location
    Media => Accept the below file format only: pdf, jpg, jpeg, tiff, png, mp4, mov, avi Max file size: 5 MB
    File  => Max file size: 5 MB -> Only allow to send one file each time with the standard file picker
*/
    sendMessage: async (req, res) => {
        try {
            const required = {
                room_id: req.body.room_id,
                receiver_id: req.body.receiver_id,
                msgArrayObj: req.body.msgArrayObj
            }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);

            req.body.sender_id = req.user.id;
            let msgArrayObj_length = req.body.msgArrayObj.length;

            for (var i = 0; i < msgArrayObj_length; i++) {
                req.body.msg_type = req.body.msgArrayObj[i].msg_type;
                req.body.message = req.body.msgArrayObj[i].message;
                req.body.media_text = req.body.msgArrayObj[i].media_text;
                chatMessage.create(req.body);
            }

            return helper.success(res, "Add message successfully");
        } catch (err) {
            helper.error(res, err);
        }
    },

    getMessage: async (req, res) => {
        try {
            const required = { room_id } = req.query;
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);

            let allMsg = await chatMessage.findAll({
                where: { room_id: req.query.room_id }
            });

            return helper.success(res, "Message fetched successfully..!!", allMsg);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    chatList: async (req, res) => {
        try {
            let allChat = await chatRoom.findAll({
                attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id',
                    [sequelize.literal(`( IFNULL(( case when chat_room.sender_id =  ` + req.user.id + ` then (select user_name from users where users.id = chat_room.receiver_id) else (select user_name from users where users.id = chat_room.sender_id) end ), ''))`), 'userName'],
                    [sequelize.literal(`( IFNULL(( select created_at from chat_message where chat_message.room_id = chat_room.id order by id desc limit 1), ''))`), 'lastMsg'],
                    [sequelize.literal(`( IFNULL(( select created_at from chat_message where chat_message.room_id = chat_room.id order by id desc limit 1), ''))`), 'lastCreatedAt']
                ],
                where: {
                    [Op.or]: [
                        { sender_id: req.user.id },
                        { receiver_id: req.user.id },
                    ],
                },
                group: ['id']
            });

            return helper.success(res, "chat fetched successfully..!!", allChat);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    saveMediaUrl_onServer: async (req, res) => {
        try {
            const required = {}
            const nonRequired = { url: req.body.url };
            await helper.vaildObject(required, nonRequired);

            req.body.sender_id = req.user.id;
            if (req.files) {
                let files = await helper.multipleFileUpload(req.files);
                return helper.success(res, "Media store on server successfully", files);
            } else {
                return res.json({ success: 400, message: 'You must select at least 1 file', body: [] });
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },

    testing_crypto: async (req, res) => {
        try {
            const required = { message: req.body.message }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);

            let encryptedData = await helper.encryptedData_fn(req.body.message);
            let decryptedData = await helper.decryptedData_fn(encryptedData);

            return helper.success(res, "done");
        } catch (err) {
            helper.error(res, err);
        }
    },

    receive_HoldMsg: async (req, res) => {
        const socket = req.app.get('io');
        try {
            let msgArray = [];
            let userId = req.body.userId;

            const allUnsendMsg = await db.sequelize.query(`SELECT  room_id, chat_room_type, sender_id, receiver_id, reply_message, ( IFNULL(( select user_name from users where users.id = chat_message.sender_id limit 1), '')) AS sender_name, ( IFNULL(( select profile from users where users.id = chat_message.sender_id limit 1), '')) AS sender_picture FROM chat_message AS chat_message WHERE chat_message.receiver_id = ${userId}  or FIND_IN_SET(${userId}, members) GROUP BY room_id`, { type: QueryTypes.SELECT });

            for (var i = 0; i < allUnsendMsg.length; i++) {
                var room_id = allUnsendMsg[i]["room_id"];
                var chat_room_type = allUnsendMsg[i]["chat_room_type"];

                let where;
                if (chat_room_type == 'group') {
                    where = `room_id = '${room_id}' and FIND_IN_SET(${userId}, members)`;
                } else {
                    where = `room_id = '${room_id}' and receiver_status = '0' `;
                }

                let senderMsg = await chatMessage.findAll({
                    attributes: ['notify_group_msg', 'receiver_status', 'message', 'msg_type', 'media_text', 'lat', 'long', 'edit_message', 'reply_id', 'message_id', 'created_at'],
                    where: sequelize.literal(where)
                });

                if (senderMsg.length > 0) {
                    allUnsendMsg[i]["msgArrayObj"] = senderMsg;
                    msgArray.push(allUnsendMsg[i]);
                }
            }
            
            const sendUserSocket = onlineUsers.get(userId.toString());
            socket.to(sendUserSocket).emit("msg-recieve", {message: msgArray});
            return helper.success(res, "donee", {message: msgArray})
        } catch (err) {
            return helper.error(res, err);
        }
    },

    createGroup: async (req, res) => {
        const socket = req.app.get('io');
        try {
            const required = {
                group_name: req.body.group_name,
                group_privacy: req.body.group_privacy,  //'private','public'
                // group_description: req.body.group_description,
            }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);

            if (req.body.members) {
                let room_id = uuidv4();
                req.body.sender_id = req.user.id;
                req.body.chat_room_type = 'group';
                req.body.id = room_id;

                chatRoom.create(req.body);
                let members_length = req.body.members.length;
                console.log("group members: ",members_length);

                for (var i = 0; i < members_length; i++) {
                    await groupMember.create({
                        room_id: room_id,
                        join_status: req.body.members[i].join_status,  //1 - owner, 2 - member
                        member_id: req.body.members[i].member_id
                    });

                    if(req.body.members[i].member_id != req.user.id){
                        let userData = await Users.findOne({
                            where: {
                                id: req.body.members[i].member_id
                            }
                        })
                        pushNotification(userData.deviceToken, "A new group created", {});
                    }
                }

                let allGroupInfo = await chatRoom.findOne({
                    attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id', 'group_name', 'group_privacy', 'group_description', 'created_at'],
                    where: { id: room_id },
                    include: [{
                        model: groupMember,
                        attributes: ['room_id', 'join_status', 'member_id',
                            [sequelize.literal(`( IFNULL(( select user_name from users where users.id = group_members.member_id limit 1), ''))`), 'member_name'],
                            [sequelize.literal(`( IFNULL(( select profile from users where users.id = group_members.member_id limit 1), ''))`), 'member_picture']
                        ]
                    },{
                        model: Users,
                        attributes: ['id', 'user_name','user_email'],
                        where: {
                            id: req.user.id,
                        }
                    },
                ]
                });

                

                var offLine_members = 0;
                var arr = [];
                req.body.members.forEach((element) => {
                    let userId = element.member_id;
                    const sendUserSocket = onlineUsers.get(userId.toString());
                    if (sendUserSocket) {
                        //join_status => 1 - owner, 2 - member
                        if (element.join_status == 2) {
                            socket.to(sendUserSocket).emit("recieve-group-data", allGroupInfo);
                        }
                    } else {
                        arr.push(userId);
                    }
                });

                offLine_members = arr.join(",");

                if(offLine_members) {
                    await chatMessage.create({
                        room_id: room_id,
                        chat_room_type: 'group',
                        members: offLine_members,
                        notify_group_msg: 'create-group',
                        receiver_status: 0,
                        sender_id: req.user.id,
                        receiver_id: 0,
                        msg_type: 1,
                        message: `Group created by (${req.user.user_name})`,
                        created_at: req.body.created_at
                    });
                }
                return helper.success(res, "Group added successfully", allGroupInfo);
            } else {
                return helper.error(res, "member field id required");
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },

    updateGroup: async (req, res) => {
        const socket = req.app.get('io');
        try {
            const required = {
                group_name: req.body.group_name,
                group_privacy: req.body.group_privacy,  //'private','public'
                room_id: req.body.room_id,
               
            }
            const nonRequired = {
                group_description: req.body.group_description,
            };
            await helper.vaildObject(required, nonRequired);

            await chatRoom.update({
                group_name: req.body.group_name,
                group_privacy:req.body.group_privacy,
                group_description: req.body.group_description,
            }, {
                where: {
                    id: req.body.room_id
                }
            });

            let allGroupInfo = await chatRoom.findOne({
                attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id', 'group_name', 'group_privacy', 'group_description', 'created_at'],
                where: { id: req.body.room_id },
                include: {
                    model: groupMember,
                    attributes: ['room_id', 'join_status', 'member_id',
                        [sequelize.literal(`( IFNULL(( select user_name from users where users.id = group_members.member_id limit 1), ''))`), 'member_name'],
                        [sequelize.literal(`( IFNULL(( select profile from users where users.id = group_members.member_id limit 1), ''))`), 'member_picture']
                    ]
                }
            });


            var offLine_members = 0;
            var arr = [];

            (allGroupInfo.group_members).forEach(element => {
                let userId = element.member_id;
                const sendUserSocket = onlineUsers.get(userId.toString());
                if (sendUserSocket) {
                        socket.to(sendUserSocket).emit("recieve-group-data", allGroupInfo);
                } else {
                    arr.push(userId);
                }
            });

            offLine_members = arr.join(",");

                if(offLine_members) {
                    await chatMessage.create({
                        room_id: req.body.room_id,
                        chat_room_type: 'group',
                        members: offLine_members,
                        notify_group_msg: 'update-group',
                        receiver_status: 0,
                        sender_id: req.user.id,
                        receiver_id: 0,
                        msg_type: 1,
                        message: '',
                    });
                }


            return helper.success(res, "Group updated successfully", allGroupInfo);

        } catch (err) {
            return helper.error(res, err);
        }
    },

    groupDetail: async (req, res) => {
        try {
            const required = {
                room_id: req.query.room_id
            }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);
            
            let allGroupInfo = await chatRoom.findOne({
                attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id', 'group_name', 'group_privacy', 'group_description', 'created_at'],
                where: { id: req.query.room_id },
                include: {
                    model: groupMember,
                    attributes: ['room_id', 'join_status', 'member_id',
                        [sequelize.literal(`( IFNULL(( select user_name from users where users.id = group_members.member_id limit 1), ''))`), 'member_name'],
                        [sequelize.literal(`( IFNULL(( select profile from users where users.id = group_members.member_id limit 1), ''))`), 'member_picture']
                    ]
                }
            });

            return helper.success(res, "Group detail..!!", allGroupInfo);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    addMember: async (req, res) => {
        const socket = req.app.get('io');
        let newMembers = [];
        let groupMambers = [];
        try {
            const required = {
                room_id: req.body.room_id,
                created_at: req.body.created_at
            }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);
            
            if (req.body.members) {
                let members_length = req.body.members.length;

                // new members added into group.
                for (var i = 0; i < members_length; i++) {
                    await groupMember.create({
                        room_id: req.body.room_id,
                        join_status: 2,  //1 - owner, 2 - member
                        member_id: req.body.members[i].member_id
                    });
                    let mem = await Users.findOne({
                        where: {
                            id: req.body.members[i].member_id
                        },
                        row:true
                    })
                    groupMambers.push(mem)
                    newMembers.push(parseInt(req.body.members[i].member_id));
                }

                let allGroupInfo = await chatRoom.findOne({
                    attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id', 'group_name', 'group_privacy', 'group_description', 'created_at'],
                    where: { id: req.body.room_id },
                    include: {
                        model: groupMember,
                        attributes: ['room_id', 'join_status', 'member_id',
                            [sequelize.literal(`( IFNULL(( select user_name from users where users.id = group_members.member_id limit 1), ''))`), 'member_name'],
                            [sequelize.literal(`( IFNULL(( select profile from users where users.id = group_members.member_id limit 1), ''))`), 'member_picture']
                        ],
                    }
                });


                let groupData = {
                    id: allGroupInfo.id,
                    chat_room_type:allGroupInfo.chat_room_type,
                    sender_id:allGroupInfo.sender_id,
                    receiver_id:allGroupInfo.receiver_id,
                    group_name:allGroupInfo.group_name,
                    group_privacy:allGroupInfo.group_privacy,
                    group_description:allGroupInfo.group_description,
                    created_at:allGroupInfo.created_at,
                    group_members:allGroupInfo.group_members,
                    add_user_id:groupMambers,
                }

                var arr = [];
                allGroupInfo.group_members.forEach((element) => {
                    let userId = element.member_id;
                    const sendUserSocket = onlineUsers.get(userId.toString());
                    if (sendUserSocket) {
                        socket.to(sendUserSocket).emit("recieve-group-data", groupData);
                    } else {
                        arr.push(userId);
                    }
                });
                var offLine_members = arr.join(",");

                let loginMembersDetails = await Users.findOne({
                    where: {
                        id: req.user.id,
                    }
                })

                let groupMambersName = loginMembersDetails.user_name+" added ";

                groupMambers.forEach(element => {
                    groupMambersName = groupMambersName+", "+element.dataValues.user_name;
                });


                // (req.body.members).forEach(async (element) => {
                //     console.log("groupMambers: ",element.member_id);

                //     
                // });

                groupMambersName = groupMambersName+" into group.";

                req.body.members.forEach(async (element) => {
                    console.log("groupMambersName: ",groupMambersName);
                    await chatMessage.create({
                        room_id: req.body.room_id,
                        chat_room_type: 'group',
                        members: offLine_members,
                        notify_group_msg: 'add-member',
                        receiver_status: 0,
                        sender_id: req.user.id,
                        receiver_id: element.member_id,
                        msg_type: 1,
                        message: groupMambersName,
                        created_at: req.body.created_at
                    });
                });

                return helper.success(res, "Member added successfully", groupData);
            } else {
                return helper.error(res, "Please select atleast one member");
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },

    leaveGroup: async (req, res) => {
        const socket = req.app.get('io');
        let newMembers = [];
        try {
            const required = { room_id: req.body.room_id, members: req.body.members , created_at: req.body.created_at}
            await helper.vaildObject(required, {});
    
            await groupMember.destroy({
                where: { room_id: req.body.room_id, member_id: req.body.members }
            });
        
            let allGroupInfo = await chatRoom.findOne({
                attributes: ['id', 'chat_room_type', 'sender_id', 'receiver_id', 'group_name', 'group_privacy', 'group_description', 'created_at'],
                where: { id: req.body.room_id },
                include: {
                    model: groupMember,
                    attributes: ['room_id', 'join_status', 'member_id',
                        [sequelize.literal(`( IFNULL(( select user_name from users where users.id = group_members.member_id limit 1), ''))`), 'member_name'],
                        [sequelize.literal(`( IFNULL(( select profile from users where users.id = group_members.member_id limit 1), ''))`), 'member_picture']
                    ],
                }
            });

            let leaveGroupMambers = await Users.findAll({
                where: { id: req.body.members }
            })

            let loginMembersDetails = await Users.findOne({
                where: {
                    id: req.user.id,
                }
            })

            let groupData = {
                id: allGroupInfo.id,
                chat_room_type:allGroupInfo.chat_room_type,
                sender_id:allGroupInfo.sender_id,
                receiver_id:allGroupInfo.receiver_id,
                group_name:allGroupInfo.group_name,
                group_privacy:allGroupInfo.group_privacy,
                group_description:allGroupInfo.group_description,
                group_members:allGroupInfo.group_members,
                removed_user_id:leaveGroupMambers,
                created_at: req.body.created_at,
            }

            var arr = [];
            allGroupInfo.group_members.forEach((element) => {
                let userId = element.member_id;
                const sendUserSocket = onlineUsers.get(userId.toString());
                if (sendUserSocket) {
                    socket.to(sendUserSocket).emit("recieve-group-data", groupData);
                } else {
                    arr.push(userId);
                }
            });

            var offLine_members = arr.join(",");
            let message= leaveGroupMambers[0].user_name +" left the group.";


            (offLine_members.split(",")).forEach(async (element) => {
                await chatMessage.create({
                    room_id: req.body.room_id,
                    chat_room_type: 'group',
                    members: offLine_members,
                    notify_group_msg: 'leave-group',
                    receiver_status: 0,
                    sender_id: req.user.id,
                    receiver_id: element,
                    msg_type: 1,
                    message: message,
                });
            })
            

            return helper.success(res, "Member removed successfully", groupData);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    update_holdMsg_status: async (req, res) => {
        try {
            let userId = req.body.userId;
            const allUnsend_readMsg = await db.sequelize.query(`SELECT * FROM chat_message AS chat_message WHERE chat_message.receiver_id = ${userId}  or FIND_IN_SET(${userId}, members)`, { type: QueryTypes.SELECT });
            for (var i = 0; i < allUnsend_readMsg.length; i++) {
                let chat_room_type = allUnsend_readMsg[i]["chat_room_type"];
                let unique_msg_id = allUnsend_readMsg[i]["id"];
                let members = allUnsend_readMsg[i]["members"];
                if (chat_room_type == 'group') {
                    let left_member = removeValue(members, userId);
                    if (left_member) {
                        chatMessage.update({
                            members: left_member
                        }, { 
                            where: { id: unique_msg_id } 
                        });

                    } else {
                        chatMessage.destroy({ where: { id: unique_msg_id } });
                    }
                } else {
                    chatMessage.destroy({ where: { id: unique_msg_id } });
                }
            }
            return helper.success(res, "Successfully updated hold messages..!!");
        } catch (err) {
            return helper.error(res, err);
        }
    },

    onlineStatus: async(req, res) => {
        const socket = req.app.get('io');
        try {
            const required = {
                userId: req.body.user_id,
            }
            const nonRequired = {};
            await helper.vaildObject(required, nonRequired);

            let userStatus = [];
            (req.body.user_id).forEach(element => {
                console.log("element:",element);
                if(!!onlineUsers.get((element).toString())) {
                    userStatus.push({user_id: element, status: "online" })
                } else {
                    userStatus.push({user_id: element, status: "offline" })
                }

            });
        
            return helper.success(res, "User online status", userStatus);
        } catch (err) {
            return helper.error(res, err);
        }
        
    }

}

function removeValue(list, value) {
    return list.replace(new RegExp(",?" + value + ",?"), function (match) {
        var first_comma = match.charAt(0) === ',',
            second_comma;
        if (first_comma &&
            (second_comma = match.charAt(match.length - 1) === ',')) {
            return ',';
        }
        return '';
    });
};