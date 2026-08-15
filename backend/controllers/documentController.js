const crypto = require('crypto');
const multer = require('multer');
const { Document, Locker } = require('../models');
const { encryptBuffer, decryptBuffer } = require('../utils/encryption');
const googleDriveService = require('../services/googleDriveService');

// Configure multer to handle in-memory PDF uploads (max 20MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'), false);
    }
  }
});

/**
 * Upload and encrypt a PDF document, saving to Google Drive and Database
 */
async function uploadDocument(req, res) {
  try {
    const { lockerId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No file uploaded. Please upload a PDF file.' });
    }

    // Verify locker exists and belongs to the user
    const locker = await Locker.findOne({
      where: { id: lockerId, userId: req.user.id }
    });

    if (!locker) {
      return res.status(404).json({ error: 'Not Found', message: 'Locker not found.' });
    }

    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const size = req.file.size;
    const fileBuffer = req.file.buffer;

    // 1. Encrypt file in memory with AES-256-GCM
    const { iv, authTag, encryptedBuffer } = encryptBuffer(fileBuffer);

    // 2. Prepare file metadata for Google Drive
    const fileUuid = crypto.randomUUID();
    const storedName = `${fileUuid}.enc`; // Stored as encrypted binary

    // 3. Upload encrypted buffer to Google Drive
    console.log(`Uploading encrypted file ${storedName} to Google Drive...`);
    const googleDriveFileId = await googleDriveService.uploadFile(encryptedBuffer, storedName);
    console.log(`Successfully uploaded. Google Drive File ID: ${googleDriveFileId}`);

    // 4. Create document record in PostgreSQL
    const document = await Document.create({
      id: fileUuid,
      originalName,
      storedName,
      googleDriveFileId,
      mimeType,
      size,
      iv,
      authTag,
      lockerId,
      userId: req.user.id
    });

    // Remove encryption secrets from the API response
    const docResponse = document.toJSON();
    delete docResponse.iv;
    delete docResponse.authTag;

    res.status(201).json({
      message: 'Document encrypted and uploaded successfully.',
      document: docResponse
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Download, decrypt on-the-fly and stream document to the client
 */
async function downloadDocument(req, res) {
  try {
    const { lockerId, documentId } = req.params;

    // Find the document and verify ownership
    const doc = await Document.findOne({
      where: { id: documentId, lockerId, userId: req.user.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Not Found', message: 'Document not found in this locker.' });
    }

    console.log(`Downloading encrypted file ${doc.storedName} (${doc.googleDriveFileId}) from Google Drive...`);
    
    // 1. Download encrypted buffer stream from Google Drive
    let encryptedBuffer;
    try {
      encryptedBuffer = await googleDriveService.downloadFile(doc.googleDriveFileId);
    } catch (driveError) {
      console.error(`[Download Error] Failed to fetch file from Google Drive:`, driveError.message);
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'No se pudo obtener el archivo desde Google Drive. Verifica la conexión y permisos del servicio.',
        details: process.env.NODE_ENV === 'development' ? driveError.message : undefined
      });
    }
    
    // 2. Decrypt buffer on-the-fly in-memory
    let decryptedBuffer;
    try {
      console.log(`Decrypting file ${doc.originalName} with stored IV and Auth Tag...`);
      decryptedBuffer = decryptBuffer(encryptedBuffer, doc.iv, doc.authTag);
    } catch (decryptError) {
      console.error(`[Download Error] Decryption failed for file ${doc.originalName}:`, decryptError.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error crítico al descifrar el documento. Es posible que la clave de cifrado haya cambiado o el archivo esté corrupto.'
      });
    }

    // 3. Send file back with appropriate headers
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', decryptedBuffer.length);
    
    // Check if user requested a direct download attachment or preview (inline)
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.originalName)}"`);

    res.send(decryptedBuffer);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * List all documents within a specific unlocked locker
 */
async function listDocuments(req, res) {
  try {
    const { lockerId } = req.params;

    // Check if locker exists and belongs to user
    const locker = await Locker.findOne({
      where: { id: lockerId, userId: req.user.id }
    });

    if (!locker) {
      return res.status(404).json({ error: 'Not Found', message: 'Locker not found.' });
    }

    // Retrieve documents (do not return iv and authTag)
    const documents = await Document.findAll({
      where: { lockerId, userId: req.user.id },
      attributes: { exclude: ['iv', 'authTag'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Delete a document from both Google Drive and PostgreSQL
 */
async function deleteDocument(req, res) {
  try {
    const { lockerId, documentId } = req.params;

    const doc = await Document.findOne({
      where: { id: documentId, lockerId, userId: req.user.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Not Found', message: 'Document not found.' });
    }

    // 1. Delete file from Google Drive
    console.log(`Deleting file ${doc.storedName} from Google Drive...`);
    await googleDriveService.deleteFile(doc.googleDriveFileId);
    console.log('Successfully deleted file on Google Drive.');

    // 2. Delete database entry
    await doc.destroy();

    res.json({
      message: 'Document permanently deleted from vault and Google Drive.'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  upload,
  uploadDocument,
  downloadDocument,
  listDocuments,
  deleteDocument
};
