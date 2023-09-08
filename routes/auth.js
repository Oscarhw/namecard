var express = require('express');
var router = express.Router();
var AuthenticationController = require('../controller/AuthController.js');
const requireAuthentication = require("../passport").authenticateUser;

router.post('/signUp', AuthenticationController.signUp);
router.post('/logIn', AuthenticationController.logIn);
router.post('/forgotpassword', AuthenticationController.forgotpassword);
router.post('/confirmOtp', AuthenticationController.confirmOtp);
router.post('/resetPassword', AuthenticationController.resetPassword);
router.get('/fetchProfile', requireAuthentication, AuthenticationController.fetchProfile);
router.post('/editProfile', requireAuthentication, AuthenticationController.editProfile);

module.exports = router;