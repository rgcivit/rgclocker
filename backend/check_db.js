const { sequelize } = require('./models');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
  try {
    await sequelize.authenticate();
    console.log('DB OK');
    process.exit(0);
  } catch (err) {
    console.error('DB ERROR:', JSON.stringify(err, null, 2));
    process.exit(1);
  }
}
check();
