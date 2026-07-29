const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DATABASE_PATH || './data/krint.db';

// Make sure the folder for the DB file exists (e.g. ./data)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        emailed INTEGER NOT NULL DEFAULT 0
    )
`);

function insertMessage({ name, email, subject, message }) {
    const stmt = db.prepare(`
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (@name, @email, @subject, @message)
    `);
    const result = stmt.run({ name, email, subject: subject || null, message });
    return result.lastInsertRowid;
}

function markEmailed(id) {
    db.prepare(`UPDATE contact_messages SET emailed = 1 WHERE id = ?`).run(id);
}

function getAllMessages() {
    return db.prepare(`SELECT * FROM contact_messages ORDER BY created_at DESC`).all();
}

module.exports = {
    db,
    insertMessage,
    markEmailed,
    getAllMessages,
};