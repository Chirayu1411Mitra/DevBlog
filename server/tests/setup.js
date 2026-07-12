const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = async () => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
};


