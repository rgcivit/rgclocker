const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Locker = sequelize.define('Locker', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    // E.g., Salud, Vehículos, Legal, Impuestos, Personal, etc.
  },
  pinHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'pin_hash'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  }
}, {
  tableName: 'lockers'
});

module.exports = Locker;
