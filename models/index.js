'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

const env = process.env.APP_ENV || 'production'; 
const db = {};
let config = {};

if (env == 'production') config = { "username": process.env.DB_PRO_USER, "port":process.env.DB_PRO_PORT, "password": process.env.DB_PRO_PASS, "database": process.env.DB_PRO_NAME, "host": process.env.DB_PRO_HOST, "dialect": "mysql"};
if (env == 'development') config = { "username": process.env.DB_DEV_USER, "port":process.env.DB_DEV_PORT, "password": process.env.DB_DEV_PASS, "database": process.env.DB_DEV_NAME, "host": process.env.DB_DEV_HOST, "dialect": "mysql"};

let sequelize;
sequelize = new Sequelize(config);

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;