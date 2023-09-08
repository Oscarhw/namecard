var FCM = require('fcm-node');
var SERVER_KEY = (process.env.NOTIFICATION_KEY || "")
var APP_NAME = (process.env.APP_NAME || "NodeJS");

module.exports = function sendNotification(token, message, dataObj) {
    var fcm = new FCM(SERVER_KEY);
    var message = {
        to: token,
        collapse_key: '',
        notification: {
            title: APP_NAME,
            body: message,
            image_url : dataObj
        },
        data: { 
            title: APP_NAME,
            body: message,
            image_url : dataObj
        }
    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!", err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
    return true;
}