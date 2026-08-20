const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let driveClient = null;

/**
 * Initializes the Google Drive API client using ONLY Service Account (Priority for Render).
 * This ensures no conflicts with old OAuth2 credentials.
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    console.error('[Google Drive] CRITICAL: GOOGLE_DRIVE_FOLDER_ID is missing.');
    return null;
  }

  if (serviceAccountJson) {
    try {
      console.log('[Google Drive] Initializing via Service Account JSON from Environment Variable.');

      // Deep sanitization of the JSON string from Render
      let sanitizedJson = serviceAccountJson.trim();
      if (sanitizedJson.startsWith('"') && sanitizedJson.endsWith('"')) {
        sanitizedJson = sanitizedJson.slice(1, -1).replace(/\\"/g, '"');
      }

      const credentials = JSON.parse(sanitizedJson);

      // PEM formatting fix for the private key
      if (credentials.private_key && typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key
          .replace(/\\\\n/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/^["']|["']$/g, '')
          .trim();
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
      });

      driveClient = google.drive({ version: 'v3', auth });
      console.log(`[Google Drive] Auth Success. Service Account: ${credentials.client_email}`);
      return driveClient;
    } catch (error) {
      console.error('[Google Drive] FATAL: Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', error.message);
      return null;
    }
  }

  console.warn('[Google Drive] WARNING: No Service Account JSON found. Drive operations will fail.');
  return null;
}

async function uploadFile(encryptedBuffer, storedName) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Google Drive not configured.');

  try {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(encryptedBuffer);

    const response = await drive.files.create({
      requestBody: {
        name: storedName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        mimeType: 'application/octet-stream'
      },
      media: {
        mimeType: 'application/octet-stream',
        body: bufferStream
      }
    });

    return response.data.id;
  } catch (error) {
    console.error('[Google Drive] Upload failed:', error.message);
    throw error;
  }
}

async function downloadFile(fileId) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Google Drive not configured.');

  try {
    console.log(`[Google Drive] Downloading File ID: ${fileId}`);
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const chunks = [];
      response.data.on('data', (chunk) => chunks.push(chunk));
      response.data.on('end', () => resolve(Buffer.concat(chunks)));
      response.data.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.error(`[Google Drive] Download Error Code: ${error.code} | Msg: ${error.message}`);
    throw error;
  }
}

async function deleteFile(fileId) {
  const drive = getDriveClient();
  if (!drive) return false;
  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('[Google Drive] Delete failed:', error.message);
    return false;
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile
};
