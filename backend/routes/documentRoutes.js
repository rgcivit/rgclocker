const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');
const lockerMiddleware = require('../middlewares/lockerMiddleware');

// All document routes require global JWT auth (Level 1)
router.use(authMiddleware);

// List all documents in a locker (Requires Level 2 unlocking)
router.get('/:lockerId', lockerMiddleware, documentController.listDocuments);

// Upload a document (Requires Level 2 unlocking + single PDF file payload)
router.post(
  '/:lockerId/upload',
  lockerMiddleware,
  documentController.upload.single('file'),
  documentController.uploadDocument
);

// Download/Preview a document (Requires Level 2 unlocking, decrypted on the fly)
router.get('/:lockerId/download/:documentId', lockerMiddleware, documentController.downloadDocument);

// Delete a document (Requires Level 2 unlocking)
router.delete('/:lockerId/delete/:documentId', lockerMiddleware, documentController.deleteDocument);

module.exports = router;
