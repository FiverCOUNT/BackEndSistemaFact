require('dotenv').config();

const { Sequelize } = require('sequelize');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME,
  DB_USER,
  DB_PASSWORD = '',
} = process.env;

if (!DB_NAME || !DB_USER) {
  throw new Error(
    'Faltan credenciales MySQL. Copia .env.example a .env y completa DB_NAME, DB_USER y DB_PASSWORD.'
  );
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;
