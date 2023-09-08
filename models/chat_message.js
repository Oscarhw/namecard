const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('chat_message', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    room_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    chat_room_type: {
      type: DataTypes.ENUM('group','internal','external'),
      allowNull: true
    },
    members: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notify_group_msg: {
      type: DataTypes.ENUM('create-group','add-member','remove-memver','leave-group'),
      allowNull: true
    },
    receiver_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "0-offline"
    },
    sender_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
    receiver_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    msg_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1 - text "
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    media_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lat: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "0.0"
    },
    long: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "0.0"
    },
    edit_message: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    edit_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reply_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    message_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reply_message: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // created_at: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   defaultValue: ""
    // },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
  }
  }, {
    sequelize,
    tableName: 'chat_message',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
