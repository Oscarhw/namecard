
let helper = require("../config/helper");
const db = require('../models');
const jwt = require('jsonwebtoken');
const jwtToken = process.env.JWT_SECRET;
const bcrypt = require('bcryptjs');
var randomstring = require("randomstring");
let salt = 10;

//models
const Users = db.users;

module.exports = {
    signUp : async (req, res) => {
        try {
            const required = {
                language: req.body.language, // 'eg => eglish','cn =>Chinese'
                user_name: req.body.user_name,
                user_email: req.body.user_email,
                password: req.body.password,
                company_name: req.body.company_name,
                // address_one: req.body.address_one,
                // address_two: req.body.address_two,
                // telephone_num: req.body.telephone_num,
                // website_url: req.body.website_url,
                country: req.body.country,
                // company_email: req.body.company_email,
                deviceType: req.body.deviceType, 
                deviceToken: req.body.deviceToken
            };
            const nonrequired = {
                address_one: req.body.address_one,
                address_two: req.body.address_two,
                telephone_num: req.body.telephone_num,
                company_email: req.body.company_email,
                website_url: req.body.website_url,
            };
            await helper.vaildObject(required, nonrequired);

            let email = await Users.findAll({
                attributes: ['user_email'],
                where: { user_email: req.body.user_email }
            });

            if (email.length > 0) {
                return helper.error(res, "Your account already registered with us. Please login");
            }
            
            await bcrypt.hash(req.body.password, salt).then(function (hash) {
                req.body.password = hash;
            });

            let user = await Users.create(req.body);
            if (user) {
                const credentials = { id: user.id, user_email: user.user_email };
                const token = jwt.sign({ data: credentials }, jwtToken);

                return helper.success(res, 'User registered successfully', {token:token,userId:user.id,user_name:user.user_name});
            } else {
                return helper.error(res, "Some error occur. Please try again");
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },

    logIn : async (req, res) => {
        try {
            const required = { 
                user_email: req.body.email,
                password: req.body.password,
                deviceType: req.body.deviceType,
                deviceToken: req.body.deviceToken
            };
            const nonrequired = {};
            await helper.vaildObject(required, nonrequired);

            var user = await Users.findOne({ where: { user_email: req.body.email } });

            if (!user) {
                return helper.error(res, 'This account not registered with us. Please Signup');
            } else {
                await bcrypt.compare(req.body.password, user.password).then(function (result) {
                    if (result == true) {
                        Users.update({ deviceType: req.body.deviceType,deviceToken: req.body.deviceToken}, { where: { user_email: req.body.email } });
                        const credentials = { id: user.id, user_email: user.user_email };
                        const token = jwt.sign({ data: credentials }, jwtToken);
                        return helper.success(res, 'User login successfully', {token:token,userId:user.id,user_name:user.user_name});
                    } else {
                        return helper.error(res, 'Incorrect email or password', {});
                    }
                });
            }
        } catch (err) {
            return helper.error(res, err)
        }
    },
    
    forgotpassword : async (req, res) => {
        try {
            var required = { user_email: req.body.email }
            var nonrequired = {}
            await helper.vaildObject(required, nonrequired);

            var findEmail = await Users.findOne({
                where: { user_email: req.body.email }
            })

            if (findEmail) {
                var createOtp = await randomstring.generate({ length: 6, charset: "numeric" });
                await Users.update({
                    email_verification_code: createOtp
                }, { 
                    where: { user_email: req.body.email } 
                });

                helper.sendinblue_emailSend_fn(req.body.email, findEmail.user_name, createOtp);
                return helper.success(res, 'Email sent successfully..!!')
            } else {
                return helper.error(res, 'Invalid Email')
            }
        } catch (err) {
            return helper.error(res, err)
        }
    },

    confirmOtp : async (req, res) => {
        try {
            var required = { otp: req.body.otp, email: req.body.email };
            const nonrequired = {};
            await helper.vaildObject(required, nonrequired);

            let userDetail = await Users.findOne({ where: { user_email: req.body.email } });
            if (req.body.otp == userDetail.email_verification_code) {
                return helper.success(res, "Otp matched successfully");
            } else {
                return helper.error(res, "Invalid OTP. Please try again");
            }
        } catch (err) {
            return helper.error(res, err);
        }
    },
    
    resetPassword : async (req, res) => {
        try {
            var required = {otp: req.body.otp, email: req.body.email, password: req.body.password }
            var nonrequired = {}
            await helper.vaildObject(required, nonrequired);

            let userDetail = await Users.findOne({ where: { user_email: req.body.email } });
            if (req.body.otp == userDetail.email_verification_code) {
                await bcrypt.hash(req.body.password, salt).then(function async(hash) { req.body.password = hash; });
               Users.update({ password: req.body.password }, { where: { user_email: req.body.email } });
              return helper.success(res, 'Password changed successfully !!')
            } else {
                return helper.error(res, "Invalid OTP. Please try again");
            }
           
        } catch (err) {
            return helper.error(res, err)
        }
    },
    
    fetchProfile : async (req, res) => {
        try {
            let userDetails = await Users.findOne({
                where: { id: req.user.id }
            });
            return helper.success(res, "Profile fetched successfully..!!", userDetails);
        } catch (err) {
            return helper.error(res, err);
        }
    },

    editProfile: async (req, res) => {
        try {
            const required = { user_name  : req.body.user_name }
            const nonRequired = {}
            await helper.vaildObject(required, nonRequired);

            let userdata = await Users.findOne({ where: { id: req.user.id } });
            userdata.user_name = req.body.user_name;
            if (req.files && req.files.profile) {
                image = helper.fileUpload(req.files.profile);
                userdata.profile = "/uploads/" + image;
            }

            userdata.save();
            return helper.success(res, 'Profile Updated Successfully');
        } catch (err) {
            return helper.error(res, err);
        }
    },
}