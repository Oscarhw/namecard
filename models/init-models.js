var DataTypes = require("sequelize").DataTypes;
var _chat_message = require("./chat_message");

function initModels(sequelize) {
  var chat_message = _chat_message(sequelize, DataTypes);


  return {
    chat_message,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
