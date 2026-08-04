const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.warn('WARNING: DATABASE_URL is not set. Falling back to local default postgresql config.');
}

const sequelize = new Sequelize(dbUrl || 'postgres://postgres:postgres@localhost:5432/rgclocker', {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for column names in the DB
  },
  dialectOptions: (process.env.NODE_ENV === 'production' || (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'))) ? {
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for cloud databases like Render, Railway, Supabase, Neon
    }
  } : {}
});

module.exports = sequelize;
