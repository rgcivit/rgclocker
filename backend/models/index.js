const sequelize = require('../config/database');
const User = require('./User');
const Locker = require('./Locker');
const Document = require('./Document');

// Relationships
User.hasMany(Locker, { foreignKey: 'userId', as: 'lockers', onDelete: 'CASCADE' });
Locker.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Document, { foreignKey: 'userId', as: 'documents', onDelete: 'CASCADE' });
Document.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Locker.hasMany(Document, { foreignKey: 'lockerId', as: 'documents', onDelete: 'CASCADE' });
Document.belongsTo(Locker, { foreignKey: 'lockerId', as: 'locker' });

module.exports = {
  sequelize,
  User,
  Locker,
  Document
};
