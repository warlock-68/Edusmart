const fs = require('fs');
const path = require('path');
const pool = require('./db');

(async () => {
  try {
    const dir = path.join(__dirname, 'notes');
    let saved = 0;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const notes = require(path.join(dir, file));
      for (const [topic, body] of Object.entries(notes)) {
        const [[found]] = await pool.query(
          'SELECT id FROM curriculum_topics WHERE topic = ?',
          [topic]
        );
        if (!found) {
          console.log('No topic named:', topic);
          continue;
        }
        await pool.query(
          `INSERT INTO topic_notes (topic_id, body) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE body = VALUES(body)`,
          [found.id, body]
        );
        saved++;
      }
    }
    console.log('Notes saved:', saved);
  } catch (err) {
    console.error(err.message);
  }
  process.exit();
})();