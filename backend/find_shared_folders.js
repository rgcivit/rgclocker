const googleDriveService = require('./services/googleDriveService');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function findFolders() {
  try {
    const drive = googleDriveService.getDriveClient();
    console.log('Listing all files shared with the service account...');

    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name, owners)'
    });

    if (res.data.files.length === 0) {
      console.log('No folders found shared with this service account.');
    } else {
      console.log(`Found ${res.data.files.length} folders:`);
      res.data.files.forEach(f => {
        console.log(` - Name: ${f.name} | ID: ${f.id}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error listing folders:', err.message);
    process.exit(1);
  }
}
findFolders();
