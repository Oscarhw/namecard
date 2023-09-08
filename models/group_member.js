module.exports = function(sequelize, DataTypes) {
  return sequelize.define('group_member', {
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
    join_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "1 - owner, 2 - member"
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'group_member',
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
