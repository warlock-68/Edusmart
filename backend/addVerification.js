const pool = require('./db');

// Adds email-verification columns to the users table, only if they are missing.
// Existing accounts get is_verified = 1 (DEFAULT 1) so they are not locked out.
async function addVerificationColumns() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_verified'");
    if (cols.length > 0) {
      return; // already done
    }
    await pool.query('ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 1');
    await pool.query('ALTER TABLE users ADD COLUMN verify_code VARCHAR(10) NULL');
    await pool.query('ALTER TABLE users ADD COLUMN verify_code_expires DATETIME NULL');
    console.log('Added email verification columns to users table');
  } catch (err) {
    console.error('Could not add verification columns:', err);
  }
}

module.exports = addVerificationColumns;