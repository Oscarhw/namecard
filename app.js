require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var fileupload = require("express-fileupload");
const pushNotification = require("./notification/pushnotificaion");

const db = require("./models");
const sequelize = require("sequelize");

//models
const Users = db.users;
const chatMessage = db.chat_message;
const groupMember = db.group_member;

//Relations --:
var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth");
var cardRouter = require("./routes/card");
var chatRouter = require("./routes/chat");

var app = express();
app.use(fileupload());

// view engine setup and middlewares
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/card", cardRouter);
app.use("/api/v1/chat", chatRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.render("error");
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  const env = (process.env.APP_ENV || "development");
  res.locals.message = err.message;
  res.locals.error = env === "development" ? err : {};
  
  res.status(err.status || 500);
  res.render("error");
});


const server = app.listen(process.env.APP_PORT, () => {
  console.log("Server running on : " + process.env.APP_PORT);
});

/************************ start socket connection  ************************/
const io = require("socket.io")(server);
app.set("io", io);
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("onlineUsers: ", onlineUsers);
  socket.on("disconnect", function () {
    function getByValue(value) {
      let resp = [...onlineUsers].find(([key, val]) => val == value);
      return !!resp ? resp[0] : 0;
    }
    if (getByValue(socket.id) > 0) {
      onlineUsers.delete(getByValue(socket.id));
    }
    
    console.log("onlineUsers: ",onlineUsers)
  });


  socket.on('connect', function() { 
    console.log('connected', socket.id);
 });
 socket.on('error', function (e) {
  console.log('System', e ? e : 'A unknown error occurred');
});

  global.chatSocket = socket;

  /*************** Add user with socket ***************/
  socket.on("set-online-user", async (userId) => {
    let msgArray = [];
    const online_receiverSocketId = onlineUsers.set(userId.toString() , socket.id);
    
    /********************* when user connect with server or online get all HOLD MESSAGES..!! ***************************/
    let allUnsendMsg = await chatMessage.findAll({
      attributes: [
          "room_id","sender_id", "receiver_id",
        [
          sequelize.literal(`( IFNULL(( select user_name from users where users.id = chat_message.sender_id limit 1), ''))`), "sender_name",
        ],
        [
          sequelize.literal(`( IFNULL(( select profile from users where users.id = chat_message.sender_id limit 1), ''))`), "sender_picture",
        ],
      ],
      where: { receiver_id: userId, receiver_status: 0 },
      group: ["sender_id"],
    });

    for (var i = 0; i < allUnsendMsg.length; i++) {
      var sender_id = allUnsendMsg[i]["sender_id"];
      let senderMsg = await chatMessage.findAll({
        attributes: [ "sender_id", "receiver_status", "message", "msg_type", "media_text", "lat", "long", "edit_message", "edit_id", "reply_id", "message_id", "created_at", ],
        where: {
          sender_id: sender_id,
          receiver_id: userId,
          receiver_status: 0,
        },
        raw: true,
      });

      allUnsendMsg[i].dataValues["msgArrayObj"] = senderMsg;
      msgArray.push(allUnsendMsg[i]);
    }

    var msg = { message: msgArray };
    
    setTimeout(myHoldMsg, 5000);
    function myHoldMsg() {
      socket.to(online_receiverSocketId).emit("msg-recieve", msg);
    }
  });

  /*************** send-msg ON Event Function ***************/
  socket.on("send-msg", async (data) => {
    var arr = [];
    var offLine_members = 0;
    
      console.log("--------------------send message--------------------");
      console.log(data);
      console.log(data.message[0].msgArrayObj)

    if((data.message).length>0){
      if (data.message[0].chat_room_type == "group") {
        console.log("group");
        let roomId = data.message[0].room_id;
        let senderId = data.message[0].sender_id;
  
        let allGroupMember = await groupMember.findAll({
          where: { room_id: roomId },
          raw: true,
        });

        console.log("allGroupMember: ",allGroupMember);
  
        allGroupMember.forEach(async (element) => {
          let userId = element.member_id;

          console.log("element: ",element.member_id);
          console.log("senderId: ",senderId);
          if (element.member_id != senderId) {
            const receiverSocketId = onlineUsers.get(userId.toString());
            if (receiverSocketId) {
              socket.to(receiverSocketId).emit("msg-recieve", data);
            } else {
              arr.push(userId);
            }
          }
        });
  
        offLine_members = arr.join(",");
  
        if (offLine_members) {
          let msgArrayObj_length = data.message[0].msgArrayObj.length;
  
          for (var i = 0; i < msgArrayObj_length; i++) {
            chatMessage.create({
              room_id: data.message[0].room_id,
              chat_room_type: "group",
              sender_id: data.message[0].sender_id,
              members: offLine_members,
              receiver_id: 0,
              receiver_status: 0,
              msg_type: data.message[0].msgArrayObj[i].msg_type,
              message: data.message[0].msgArrayObj[i].message,
              media_text: data.message[0].msgArrayObj[i].media_text,
              lat: data.message[0].msgArrayObj[i].lat,
              long: data.message[0].msgArrayObj[i].long,
              edit_message: data.message[0].msgArrayObj[i].edit_message,
              edit_id: data.message[0].msgArrayObj[i].edit_id,
              message_id: data.message[0].msgArrayObj[i].message_id,
              created_at: data.message[0].msgArrayObj[i].created_at,
            });
          }
        }
      } else {
        console.log("one");
        let msgArrayObj_length = data.message[0].msgArrayObj.length;

        let groupMembers = await groupMember.findAll({
          where: {
            room_id: data.message[0].room_id
          }
        })
  
        let noti_msg;
        for (var i = 0; i < msgArrayObj_length; i++) {
          noti_msg = data.message[0].msgArrayObj[i].message;
        
          groupMembers.forEach(async (element) => {
              let userDetails = await Users.findOne({
                where: {
                  id: element.member_id
                }
              })
              const receiverSocketId = onlineUsers.get((element.member_id).toString());
              if (receiverSocketId) {
                socket.to(receiverSocketId).emit("msg-recieve", data);
              }
            pushNotification(userDetails.deviceToken, noti_msg, data);
          });

        }

        let receiver_id = data.message[0].receiver_id;
        const receiverSocketId = onlineUsers.get(receiver_id.toString());
        if (receiverSocketId) {
          socket.to(receiverSocketId).emit("msg-recieve", data);
        } else {
          let msgArrayObj_length = data.message[0].msgArrayObj.length;
  
          for (var i = 0; i < msgArrayObj_length; i++) {
            chatMessage.create({
              chat_room_type: "external",
              room_id: data.message[0].room_id,
              sender_id: data.message[0].sender_id,
              receiver_id: data.message[0].receiver_id,
              receiver_status: 0,
              msg_type: data.message[0].msgArrayObj[i].msg_type,
              message: data.message[0].msgArrayObj[i].message,
              media_text: data.message[0].msgArrayObj[i].media_text,
              lat: data.message[0].msgArrayObj[i].lat,
              long: data.message[0].msgArrayObj[i].long,
              edit_message: data.message[0].msgArrayObj[i].edit_message,
              edit_id: data.message[0].msgArrayObj[i].edit_id,
              message_id: data.message[0].msgArrayObj[i].message_id,
              created_at: data.message[0].msgArrayObj[i].created_at,
            });
  
          }
        }
      }
    }
    return false;
  });

  /*************** Group ON Event Function  for testig (use frontend side..!! ) ***************/
  socket.on("recieve-group-data", async (data) => {});

  /*********************** User Chat Lisr...  **********************/
  socket.on("chat-list", async (data) => {
    const receiverSocketId = onlineUsers.get(data.receiver_id);
    socket.to(receiverSocketId).emit("return-chat-list", data);
  });
});

module.exports = app;