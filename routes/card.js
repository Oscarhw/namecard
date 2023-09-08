var express = require('express');
var router = express.Router();
var cardController = require('../controller/CardController.js');
const requireAuthentication = require("../passport").authenticateUser;

router.post('/addCard', requireAuthentication, cardController.addCard);
router.post('/editCard', requireAuthentication, cardController.editCard);
router.get('/getMyAllCard', requireAuthentication, cardController.getMyAllCard);

module.exports = router;