const sequelize = require('sequelize');
const Op = sequelize.Op;

let helper = require("../config/helper");
const db = require('../models');

const Card = db.cards;

module.exports = {
    addCard: async (req, res) => {
        try {
            const required = {
                user_id: req.user.id,
                full_name: req.body.full_name,
                mobile_no: req.body.mobile_no
            };
            const nonRequired = { 
                cardAddingType: req.body.cardAddingType,
                work_tel_no: req.body.work_tel_no,
                work_email: req.body.work_email,
                company: req.body.company,
                department: req.body.department,
                job_title: req.body.job_title,
                website: req.body.website,
                address: req.body.address
            }; // 1 - replace, 2 - skip,  default pass empty
            await helper.vaildObject(required, nonRequired);
            req.body.user_id = req.user.id;

            let cardInfo = await Card.findOne({
                attributes: ['id', 'work_email', 'mobile_no', 'work_tel_no'],
                where: {
                    [Op.or]: {
                        work_email: req.body.work_email,
                        mobile_no: req.body.mobile_no,
                        work_tel_no: req.body.work_tel_no
                    }
                }
            });
            
            if (!req.body.cardAddingType) {
                if (cardInfo) {
                    return helper.success(res, "There is existing record");
                } else {
                    if (req.files && req.files.card_image) {
                        image = helper.fileUpload(req.files.card_image);
                        req.body.card_image = "/uploads/" + image;
                    }

                    if (req.files && req.files.card_backside_image) {
                        image = helper.fileUpload(req.files.card_backside_image);
                        req.body.card_backside_image = "/uploads/" + image;
                    }

                    await Card.create(req.body);
                    return helper.success(res, "Card added successfully");
                }
            }

            if (req.body.cardAddingType == 1) {
                if (req.files && req.files.card_image) {
                    image = helper.fileUpload(req.files.card_image);
                    req.body.card_image = "/uploads/" + image;
                }

                if (req.files && req.files.card_backside_image) {
                    image = helper.fileUpload(req.files.card_backside_image);
                    req.body.card_backside_image = "/uploads/" + image;
                }

                Card.update(req.body, {
                    where: { id: cardInfo.id }
                });
                return helper.success(res, "Card replace");
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },

    editCard: async (req, res) => {
        console.log("****************** editCard..!! ***********************");
        try {
            const required = { cardId: req.body.cardId };
            const nonRequired = {
                full_name: req.body.full_name,
                mobile_no: req.body.mobile_no,
                work_tel_no: req.body.work_tel_no,
                work_email: req.body.work_email,
                company: req.body.company,
                department: req.body.department,
                job_title: req.body.job_title,
                website: req.body.website,
                address: req.body.address
            };
            await helper.vaildObject(required, nonRequired);

            if (req.files && req.files.card_image) {
                image = helper.fileUpload(req.files.card_image);
                req.body.card_image = "/uploads/" + image;
            }

            Card.update(req.body, {
                where: { id: req.body.cardId }
            });
            return helper.success(res, "Card updated successfully...");
        } catch (err) {
            return helper.error(res, err);
        }
    },

    getMyAllCard: async (req, res) => {
        try {
            let userCards = await Card.findAndCountAll({
                where: { user_id: req.user.id }
            });
            return helper.success(res, "Card fetched successfully..!!", userCards);
        } catch (err) {
            return helper.error(res, err);
        }
    }
}