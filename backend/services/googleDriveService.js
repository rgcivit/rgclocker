const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const dotenv = require('dotenv');

// Load environment variables relative to the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Startup Debug Logs
console.log('\n[Google Drive Service Startup Debug]');
console.log(' - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `"${process.env.GOOGLE_CLIENT_ID}"` : 'UNDEFINED');
console.log(' - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? `"${process.env.GOOGLE_CLIENT_SECRET}"` : 'UNDEFINED');
console.log(' - GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? `"${process.env.GOOGLE_REFRESH_TOKEN}"` : 'UNDEFINED');
console.log(' - GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID ? `"${process.env.GOOGLE_DRIVE_FOLDER_ID}"` : 'UNDEFINED');
console.log('-------------------------------------\n');

let driveClient = null;
let oauth2ClientInstance = null; // Store reference for validation

/**
 * Validates the current OAuth2 client credentials by requesting an access token.
 * Throws an informative error if validation fails.
 */
async function validateOAuth2Credentials() {
  if (!oauth2ClientInstance) {
    return; // Not using OAuth2 (or not initialized yet)
  }

  try {
    console.log('[Google Drive Service] Validating OAuth2 credentials with Google API...');
    const tokenResponse = await oauth2ClientInstance.getAccessToken();
    console.log('[Google Drive Service] OAuth2 credentials validated successfully! Access token retrieved.');
    return tokenResponse.token;
  } catch (error) {
    console.error('\n[Google Drive Service] OAuth2 Credentials Validation FAILED!');
    console.error('Error Details:', error.message);
    if (error.message.includes('invalid_client')) {
      console.error('-> Error "invalid_client" means GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is incorrect in your .env file.\n');
    } else if (error.message.includes('invalid_grant')) {
      console.error('-> Error "invalid_grant" means GOOGLE_REFRESH_TOKEN is incorrect, expired, or revoked.\n');
    }
    throw new Error(`Google Drive Authentication failed: ${error.message}`);
  }
}

/**
 * Initializes the Google Drive API client.
 * Fails gracefully if configuration is missing, allowing the app to start
 * and guide the user on setting up Google Drive.
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : null;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ? process.env.GOOGLE_REFRESH_TOKEN.trim() : null;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ? process.env.GOOGLE_DRIVE_FOLDER_ID.trim() : null;

  // 1. Try OAuth2 (User Account Flow) first
  if (clientId && clientSecret && refreshToken) {
    try {
      console.log('[Google Drive Service] Initializing google.auth.OAuth2 with:');
      console.log(' - Client ID:', clientId);
      console.log(' - Client Secret:', clientSecret);
      console.log(' - Refresh Token:', refreshToken);

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      oauth2ClientInstance = oauth2Client; // Save reference for async validation
      driveClient = google.drive({ version: 'v3', auth: oauth2Client });
      console.log('[Google Drive Service] Client initialized successfully via OAuth2 (User Account).');
      return driveClient;
    } catch (error) {
      console.error('[Google Drive Service] Failed to initialize OAuth2 client:', error.message);
    }
  }

  // 2. Fallback to Service Account
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!folderId) {
    console.warn('\n[Google Drive Service] WARNING: GOOGLE_DRIVE_FOLDER_ID is not configured.');
    return null;
  }

  // A. Priority: Service Account JSON via Env Var (Best for Render/Cloud)
  if (serviceAccountJson) {
    try {
      console.log('[Google Drive Service] Initializing via Service Account JSON from Environment Variable.');
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
      });
      driveClient = google.drive({ version: 'v3', auth });
      return driveClient;
    } catch (error) {
      console.error('[Google Drive Service] Failed to initialize via GOOGLE_SERVICE_ACCOUNT_JSON:', error.message);
    }
  }

  // B. Fallback: Service Account JSON via File Path (Local development)
  if (keyPath) {
    // Resolve absolute path
    const absoluteKeyPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.resolve(process.cwd(), keyPath);

    if (fs.existsSync(absoluteKeyPath)) {
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: absoluteKeyPath,
          scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
        });

        driveClient = google.drive({ version: 'v3', auth });
        console.log('[Google Drive Service] Client initialized successfully via Service Account File.');
        return driveClient;
      } catch (error) {
        console.error('[Google Drive Service] Failed to initialize Service Account client from file:', error.message);
      }
    } else {
      console.warn(`\n[Google Drive Service] WARNING: Service Account JSON file not found at: ${absoluteKeyPath}`);
    }
  }

  console.warn('\n[Google Drive Service] WARNING: Google Drive is not configured yet.');
  console.warn('[Google Drive Service] Ensure OAuth2 (CLIENT_ID, SECRET, REFRESH_TOKEN) or Service Account (KEY_PATH or JSON env var) are set.\n');
  return null;
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

  // Validate credentials first if OAuth2 is used
  await validateOAuth2Credentials();

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

  // Validate credentials first if OAuth2 is used
  await validateOAuth2Credentials();

  try {
    console.log(`[Google Drive Service] Starting download for File ID: ${fileId}`);
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const chunks = [];
      response.data.on('data', (chunk) => {
        chunks.push(chunk);
      });
      response.data.on('end', () => {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        console.log(`[Google Drive Service] Download complete. Total bytes: ${totalLength}`);
        resolve(Buffer.concat(chunks));
      });
      response.data.on('error', (err) => {
        console.error('[Google Drive Service] Stream download error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('[Google Drive Service] File download failed:', error.message);
    if (error.code === 404) {
      console.error(' -> The file does not exist on Drive. It might have been deleted manually.');
    } else if (error.code === 403) {
      console.error(' -> Access Denied. Check Service Account permissions on the folder.');
    }
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

  // Validate credentials first if OAuth2 is used
  await validateOAuth2Credentials();

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
  validateOAuth2Credentials,
  uploadFile,
  downloadFile,
  deleteFile
};
