const pool = require('./db');

// Usage: node deleteUser.js someone@gmail.com
async function run() {
  const email = process.argv[2];
  if (!email) {
    console.log('Please give an email, e.g. node deleteUser.js someone@gmail.com');
    process.exit(1);
  }

  try {
    const [rows] = await pool.query('SELECT id, name, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.log('No user found with that email.');
    } else {
      console.log('Found:', rows[0]);
      await pool.query('DELETE FROM users WHERE id = ?', [rows[0].id]);
      console.log('Deleted.');
    }
  } catch (err) {
    console.error('Could not delete:', err.message);
  } finally {
    await pool.end();
  }
}

run();