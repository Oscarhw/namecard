module.exports = function(sequelize, DataTypes) {
  return sequelize.define('chat_room', {
    id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
      primaryKey: true
    },
    chat_room_type: {
      type: DataTypes.ENUM('group','internal','external'),
      allowNull: true,
      comment: "group chat, personal chat(internal)\/(external)"
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    group_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    group_privacy: {
      type: DataTypes.ENUM('private','public'),
      allowNull: true
    },
    group_description: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    created_at: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ""
    },
  }, {
    sequelize,
    tableName: 'chat_room',
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
