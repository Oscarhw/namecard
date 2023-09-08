module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    language: {
      type: DataTypes.ENUM('eg','cn'),
      allowNull: true,
      comment: "eglish, Chinese"
    },
    role: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1- user"
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profile: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address_one: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address_two: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    telephone_num: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    website_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    company_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email_verification_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    deviceType: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    deviceToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'users',
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
