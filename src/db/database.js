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
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        items_json TEXT NOT NULL,
        total_zmw INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

/* ------------------------------------------------------------
   Orders
   ------------------------------------------------------------ */

// items is the server-verified snapshot:
// [{ id, name, qty, unitPriceZmw, lineTotalZmw }]
function createOrder({ customerName, email, phone, items, totalZmw }) {
    const stmt = db.prepare(`
        INSERT INTO orders (customer_name, email, phone, items_json, total_zmw)
        VALUES (@customerName, @email, @phone, @itemsJson, @totalZmw)
    `);

    const result = stmt.run({
        customerName,
        email,
        phone: phone || null,
        itemsJson: JSON.stringify(items),
        totalZmw,
    });

    return result.lastInsertRowid;
}

function getOrder(id) {
    const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);

    if (!row) return null;

    // Unpack the item snapshot so callers get a plain items array
    const { items_json, ...order } = row;

    return { ...order, items: JSON.parse(items_json) };
}


module.exports = {
    db,
    insertMessage,
    markEmailed,
    getAllMessages,
    createOrder,
    getOrder
};