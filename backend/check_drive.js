const googleDriveService = require('./services/googleDriveService');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
  try {
    const drive = googleDriveService.getDriveClient();
    if (!drive) {
      console.error('Drive client not initialized');
      process.exit(1);
    }
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log('Checking folder:', folderId);

    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name'
    });
    console.log('Folder exists:', res.data.name);

    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)'
    });
    console.log('Files in folder:', list.data.files.length);
    list.data.files.forEach(f => console.log(` - ${f.name} (${f.id})`));

    process.exit(0);
  } catch (err) {
    console.error('Drive Error:', err.message);
    process.exit(1);
  }
}
check();
