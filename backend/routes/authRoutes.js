const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/activate', authController.activate);
router.post('/verify-code', authController.activate);

// Private routes
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
