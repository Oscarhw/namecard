var express = require('express');
var router = express.Router();
var chatController = require('../controller/ChatController.js');
const requireAuthentication = require("../passport").authenticateUser;

router.get('/allRegisterUserList', requireAuthentication, chatController.allRegisterUserList);
router.post('/createChatRoom', requireAuthentication, chatController.createChatRoom);
router.post('/sendMessage', requireAuthentication, chatController.sendMessage);
router.get('/getMessage', requireAuthentication, chatController.getMessage);
router.get('/chatList', requireAuthentication, chatController.chatList);
router.post('/saveMediaUrl_onServer', requireAuthentication, chatController.saveMediaUrl_onServer);
router.post('/testing_crypto', chatController.testing_crypto);
router.post('/receive_HoldMsg', chatController.receive_HoldMsg);
router.post('/createGroup', requireAuthentication, chatController.createGroup);
router.post('/update-group', requireAuthentication, chatController.updateGroup);

router.get('/groupDetail', requireAuthentication, chatController.groupDetail);
router.post('/update_holdMsg_status', chatController.update_holdMsg_status);
router.post('/addMember', requireAuthentication, chatController.addMember);
router.post('/online-status', requireAuthentication,chatController.onlineStatus);
router.post('/leave-group', requireAuthentication, chatController.leaveGroup);

module.exports = router;