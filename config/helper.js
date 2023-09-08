const fetch = require("node-fetch");
let crypto = require("crypto");

const db = require('../models');

const algorithm = "aes-256-cbc";
const initVector = crypto.randomBytes(16);
const Securitykey = crypto.randomBytes(32);

const SEND_IN_BLUE_KEY = (process.env.SEND_IN_BLUE || "");
const FROM_EMAIL = (process.env.FROM_EMAIL || "no-reply@gmail.com");
const APP_NAME= (process.env.APP_NAME || "NodeJS");
const REPLY_EMAIL = (process.env.REPLY_EMAIL || "no-reply@gmail.com");

module.exports = {
    vaildObject: async (required, non_required) => {
        let message = '';
        let empty = [];
        
        let model = required.hasOwnProperty('model') && db.hasOwnProperty(required.model) ? db[required.model] : db.users;

        for (let key in required) {
            if (required.hasOwnProperty(key)) {
                if (required[key] == undefined || required[key] === '' && (required[key] !== '0' || required[key] !== 0)) {
                    empty.push(key);
                }
            }
        }

        if (empty.length != 0) {
            message = empty.toString();
            if (empty.length > 1) {
                message += " fields are required"
            } else {
                message += " field is required"
            }
            throw { 'code': 400, 'message': message }
        } else {
            if (required.hasOwnProperty('securitykey')) {
                if (required.securitykey != "ads") {
                    message = "Invalid security key";
                    throw { 'code': 400, 'message': message }
                }
            }

            if (required.hasOwnProperty('checkExists') && required.checkExists == 1) {
                const checkData = {
                    email: 'Email already exists, kindly use another.',
                    phone: 'Phone number already exists, kindly use another'
                }

                for (let key in checkData) {
                    if (required.hasOwnProperty(key)) {
                        const checkExists = await model.findOne({
                            where: {
                                [key]: required[key].trim()
                            }
                        });
                        if (checkExists) {
                            throw {
                                code: 400,
                                message: checkData[key]
                            }
                        }
                    }
                }
            }

            const merge_object = Object.assign(required, non_required);
            delete merge_object.checkexit;
            delete merge_object.securitykey;

            if (merge_object.hasOwnProperty('password') && merge_object.password == '') {
                delete merge_object.password;
            }

            for (let data in merge_object) {
                if (merge_object[data] == undefined) {
                    delete merge_object[data];
                } else {
                    if (typeof merge_object[data] == 'string') {
                        merge_object[data] = merge_object[data].trim();
                    }
                }
            }
            return merge_object;
        }
    },

    unauth: function (res, err, body = {}) {
        console.log(err, '===========================>error');
        let code = (typeof err === 'object') ? (err.code) ? err.code : 401 : 401;
        let message = (typeof err === 'object') ? (err.message ? err.message : '') : err;
        res.status(code).json({
            'success': false,
            'code': code,
            'message': message,
            'body': body
        });

    },

    success: function (res, message = '', body = {}) {
        return res.status(200).json({
            'success': true,
            'code': 200,
            'message': message,
            'body': body
        });
    },

    error: function (res, err, body = {}) {
        console.log(err, '===========================>error');
        let code = (typeof err === 'object') ? (err.code) ? err.code : 200 : 400;
        let message = (typeof err === 'object') ? (err.message ? err.message : '') : err;
        res.status(200).json({
            'success': false,
            'code': code,
            'message': message,
            'body': body
        });
    },

    sendinblue_emailSend_fn: (email, username, createOtp) => {
        let url = 'https://api.sendinblue.com/v3/smtp/email';
        let options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'api-key': SEND_IN_BLUE_KEY
            },
            body: JSON.stringify({
                sender: { name: APP_NAME, email: FROM_EMAIL },
                to: [{ email: email , name: username }],
                replyTo: { email: REPLY_EMAIL, name: APP_NAME },
                htmlContent: '<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2"><div style="margin:50px auto;width:70%;padding:20px 0"><div style="border-bottom:1px solid #eee"><a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Namecard</a></div><p style="font-size:1.1em">Hi, ' + username + ' </p><p style="font-size:1.1em">your verification code is : ' + createOtp + '</p><p></p></div></div>',
                subject: `Welcome to ${APP_NAME}`
            })
        };
        return fetch(url, options)
            .then(res => res.json())
            .then(json => console.log(json))
            .catch(err => console.error('error:' + err));
    },

    fileUpload: (file, parentFolder = '') => {
        let file_name_string = file.name;
        var file_name_array = file_name_string.split(".");
        var file_extension = file_name_array[file_name_array.length - 1];
        var result = "";
        result = Math.floor(Date.now() / 1000)
        let name = result + '.' + file_extension;

        file.mv(process.cwd() + `/../namecard-web/public/uploads/${name}`, function (err) {
            if (err) throw err;
        });
        return name;
    },

    multipleFileUpload: (files) => {
        arr = [];
        attachment = files.url;
        if (attachment.length > 1) {
            attachment.forEach((file, index) => {
                console.log()
                file.mv(process.cwd() + `/../namecard-web/public/uploads/${file.name}`, function (err) {
                    if (err) throw err;
                });
                arr.push({ URL: file.name });
            });
        } else {
            attachment.mv(process.cwd() + `/../namecard-web/public/uploads/${attachment.name}`, function (err) {
                if (err) throw err;
            });
            arr.push({ URL: attachment.name });
        }
        return arr;
    },

    encryptedData_fn: async (message) => {
        const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
        let encryptedData = cipher.update(message, "utf-8", "hex");
        encryptedData += cipher.final("hex");
        return encryptedData;
    },

    decryptedData_fn: async (encryptedData) => {
        const decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
        let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        return decryptedData;
    },
}