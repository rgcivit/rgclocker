const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Locker, Document } = require('../models');
const { deleteFile } = require('../services/googleDriveService');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LOCKER_JWT_SECRET = process.env.LOCKER_JWT_SECRET || 'dev_locker_jwt_secret_key_rgclocker_vault_2026';

/**
 * List all lockers belonging to the logged-in user
 */
async function listLockers(req, res) {
  try {
    const lockers = await Locker.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['pinHash'] } // Never return PIN hash to client
    });

    res.json({ lockers });
  } catch (error) {
    console.error('List lockers error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Create a new Locker (with custom PIN)
 */
async function createLocker(req, res) {
  try {
    const { name, category, pin } = req.body;

    if (!name || !category || !pin) {
      return res.status(400).json({ error: 'Bad Request', message: 'All fields (name, category, pin) are required.' });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Locker PIN must be a numeric value of 4 to 6 digits.'
      });
    }

    // Hash the locker's PIN
    const pinHash = await bcrypt.hash(pin, 10);

    const newLocker = await Locker.create({
      name,
      category,
      pinHash,
      userId: req.user.id
    });

    // Strip sensitive fields
    const lockerResponse = newLocker.toJSON();
    delete lockerResponse.pinHash;

    res.status(201).json({
      message: 'Locker created successfully.',
      locker: lockerResponse
    });
  } catch (error) {
    console.error('Create locker error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Unlock a specific locker with its PIN (Level 2 Security)
 * Verifies PIN and returns a 15-minute Locker Session Token
 */
async function unlockLocker(req, res) {
  try {
    const { lockerId } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Bad Request', message: 'Locker PIN is required.' });
    }

    const locker = await Locker.findOne({
      where: { id: lockerId, userId: req.user.id }
    });

    if (!locker) {
      return res.status(404).json({ error: 'Not Found', message: 'Locker not found.' });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, locker.pinHash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid Locker PIN.' });
    }

    // Generate Locker JWT Token (Expires in 15 minutes)
    const lockerToken = jwt.sign(
      { lockerId: locker.id, userId: req.user.id },
      LOCKER_JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Locker unlocked successfully.',
      lockerToken,
      locker: {
        id: locker.id,
        name: locker.name,
        category: locker.category
      }
    });
  } catch (error) {
    console.error('Unlock locker error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Delete a locker and clean up its documents on Google Drive
 */
async function deleteLocker(req, res) {
  try {
    const { lockerId } = req.params;

    const locker = await Locker.findOne({
      where: { id: lockerId, userId: req.user.id }
    });

    if (!locker) {
      return res.status(404).json({ error: 'Not Found', message: 'Locker not found.' });
    }

    // Fetch and delete all associated files from Google Drive
    const documents = await Document.findAll({
      where: { lockerId, userId: req.user.id }
    });

    console.log(`Deleting locker ${lockerId}. Cleaning up ${documents.length} files from Google Drive...`);

    for (const doc of documents) {
      try {
        await deleteFile(doc.googleDriveFileId);
      } catch (err) {
        console.error(`Failed to delete file ${doc.googleDriveFileId} on Google Drive for document ${doc.id}:`, err.message);
        // Continue even if Drive deletion fails, so we don't get stuck
      }
    }

    // Delete locker from database (cascades database documents as well)
    await locker.destroy();

    res.json({
      message: 'Locker and all its encrypted files deleted successfully.'
    });
  } catch (error) {
    console.error('Delete locker error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Update/Rename a locker's name and/or category
 */
async function updateLocker(req, res) {
  try {
    const { lockerId } = req.params;
    const { name, category } = req.body;

    const locker = await Locker.findOne({
      where: { id: lockerId, userId: req.user.id }
    });

    if (!locker) {
      return res.status(404).json({ error: 'Not Found', message: 'Locker not found.' });
    }

    if (name) {
      locker.name = name.trim();
    }
    if (category) {
      locker.category = category.trim();
    }

    await locker.save();

    res.json({
      message: 'Locker updated successfully.',
      locker: {
        id: locker.id,
        name: locker.name,
        category: locker.category,
        createdAt: locker.createdAt,
        updatedAt: locker.updatedAt
      }
    });
  } catch (error) {
    console.error('Update locker error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  listLockers,
  createLocker,
  unlockLocker,
  deleteLocker,
  updateLocker
};
