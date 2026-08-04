const express = require('express');
const router = express.Router();
const lockerController = require('../controllers/lockerController');
const authMiddleware = require('../middlewares/authMiddleware');
const lockerMiddleware = require('../middlewares/lockerMiddleware');

// All locker routes require global JWT authentication (Level 1)
router.use(authMiddleware);

// List all lockers
router.get('/', lockerController.listLockers);

// Create a new locker
router.post('/', lockerController.createLocker);

// Unlock a locker with PIN (Generates Level 2 Locker Token)
router.post('/:lockerId/unlock', lockerController.unlockLocker);

// Delete a locker (Requires Level 2 unlocking for safety)
router.delete('/:lockerId', lockerMiddleware, lockerController.deleteLocker);

// Update/Rename a locker (Requires Level 2 unlocking for safety)
router.put('/:lockerId', lockerMiddleware, lockerController.updateLocker);

module.exports = router;
