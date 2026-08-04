const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const dotenv = require('dotenv');

dotenv.config();

let driveClient = null;

/**
 * Initializes the Google Drive API client.
 * Fails gracefully if configuration is missing, allowing the app to start
 * and guide the user on setting up Google Drive.
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!keyPath || !folderId) {
    console.warn('\n[Google Drive Service] WARNING: Google Drive is not configured yet.');
    console.warn('[Google Drive Service] Ensure GOOGLE_SERVICE_ACCOUNT_KEY_PATH and GOOGLE_DRIVE_FOLDER_ID are set in your .env.\n');
    return null;
  }

  // Resolve absolute path
  const absoluteKeyPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(process.cwd(), keyPath);

  if (!fs.existsSync(absoluteKeyPath)) {
    console.warn(`\n[Google Drive Service] WARNING: Service Account JSON file not found at: ${absoluteKeyPath}`);
    console.warn('[Google Drive Service] Google Drive operations will fail until this file is supplied.\n');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: absoluteKeyPath,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    });

    driveClient = google.drive({ version: 'v3', auth });
    console.log('[Google Drive Service] Client initialized successfully.');
    return driveClient;
  } catch (error) {
    console.error('[Google Drive Service] Failed to initialize client:', error.message);
    return null;
  }
}

/**
 * Uploads an encrypted buffer to Google Drive.
 * @param {Buffer} encryptedBuffer - The encrypted file data.
 * @param {string} storedName - Name of the file as it will be stored on Drive (e.g. uuid.enc).
 * @returns {Promise<string>} The Google Drive File ID.
 */
async function uploadFile(encryptedBuffer, storedName) {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive service is not configured. Please supply Service Account JSON credentials.');
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is missing.');
  }

  try {
    // Create a readable stream from the buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(encryptedBuffer);

    const response = await drive.files.create({
      requestBody: {
        name: storedName,
        parents: [folderId],
        mimeType: 'application/octet-stream'
      },
      media: {
        mimeType: 'application/octet-stream',
        body: bufferStream
      }
    });

    return response.data.id;
  } catch (error) {
    console.error('[Google Drive Service] File upload failed:', error);
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}

/**
 * Downloads a file from Google Drive as a Buffer.
 * @param {string} fileId - The Google Drive File ID.
 * @returns {Promise<Buffer>} The file data as a Buffer.
 */
async function downloadFile(fileId) {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive service is not configured.');
  }

  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const chunks = [];
      response.data.on('data', (chunk) => chunks.push(chunk));
      response.data.on('end', () => resolve(Buffer.concat(chunks)));
      response.data.on('error', (err) => {
        console.error('[Google Drive Service] Stream download error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('[Google Drive Service] File download failed:', error);
    throw new Error(`Google Drive download failed: ${error.message}`);
  }
}

/**
 * Deletes a file from Google Drive.
 * @param {string} fileId - The Google Drive File ID.
 * @returns {Promise<boolean>} True if successful.
 */
async function deleteFile(fileId) {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive service is not configured.');
  }

  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('[Google Drive Service] File deletion failed:', error);
    throw new Error(`Google Drive deletion failed: ${error.message}`);
  }
}

module.exports = {
  getDriveClient,
  uploadFile,
  downloadFile,
  deleteFile
};
