const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'original_name'
  },
  storedName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'stored_name'
  },
  googleDriveFileId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'google_drive_file_id'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'mime_type'
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  iv: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Initialization Vector for AES decryption (Hex encoded)'
  },
  authTag: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'auth_tag',
    comment: 'Authentication Tag for AES-GCM (Hex encoded)'
  },
  lockerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'locker_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  }
}, {
  tableName: 'documents'
});

module.exports = Document;
