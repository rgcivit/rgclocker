const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for AES-GCM is 12 bytes

/**
 * Retrieves the encryption key from environment variables.
 * Resolves to a Buffer.
 */
function getEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('Encryption key (ENCRYPTION_KEY) is not defined in environment variables.');
  }
  
  const keyBuffer = Buffer.from(keyHex, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(`Encryption key must be exactly 32 bytes (64 hex characters). Current length is ${keyBuffer.length} bytes.`);
  }
  
  return keyBuffer;
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * @param {Buffer} buffer - Plaintext buffer to encrypt
 * @returns {Object} { iv: string(hex), authTag: string(hex), encryptedBuffer: Buffer }
 */
function encryptBuffer(buffer) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedBuffer
    };
  } catch (error) {
    console.error('Error during buffer encryption:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts an AES-256-GCM encrypted buffer.
 * @param {Buffer} encryptedBuffer - Ciphertext buffer
 * @param {string} ivHex - Initialization Vector (hex)
 * @param {string} authTagHex - Authentication Tag (hex)
 * @returns {Buffer} Decrypted plaintext buffer
 */
function decryptBuffer(encryptedBuffer, ivHex, authTagHex) {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decryptedBuffer;
  } catch (error) {
    console.error('Error during buffer decryption:', error);
    throw new Error('Decryption failed. The file may have been tampered with or the encryption key is incorrect.');
  }
}

module.exports = {
  encryptBuffer,
  decryptBuffer
};
