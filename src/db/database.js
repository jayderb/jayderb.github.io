const path = require('path');
const fs = require('fs');

let Database;
try {
    // Preferred driver (used in normal local/production setups)
    Database = require('better-sqlite3');
} catch (err) {
    Database = null;
}

/* ------------------------------------------------------------
   Driver fallback: environments where better-sqlite3's native
   binary cannot compile (some CI/sandboxes) fall back to the
   SQLite driver built into Node 22+. Both expose the small
   synchronous surface this file uses:
     db.exec(sql) · db.pragma(str) · db.prepare(sql → run/get/all)
   All statements in this file use POSITIONAL (?) bindings so the
   two drivers behave identically.
   ------------------------------------------------------------ */

class NodeSqliteAdapter {
    constructor(dbPath) {
        const { DatabaseSync } = require('node:sqlite');
        this.raw = new DatabaseSync(dbPath);
    }

    exec(sql) {
        return this.raw.exec(sql);
    }

    // better-sqlite3 style pragma wrapper, e.g. pragma('journal_mode = WAL')
    pragma(str) {
        return this.raw.exec(`PRAGMA ${str}`);
    }

    prepare(sql) {
        const stmt = this.raw.prepare(sql);
        return {
            run: (...args) => stmt.run(...args),
            get: (...args) => stmt.get(...args),
            all: (...args) => stmt.all(...args),
        };
    }
}
const dbPath = process.env.DATABASE_PATH || './data/krint.db';

// Make sure the folder for the DB file exists (e.g. ./data)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db;
 try {
    if (!Database) throw new Error('better-sqlite3 not available');
    db = new Database(dbPath);
} catch (err) {
    db = new NodeSqliteAdapter(dbPath);
}
db.pragma('journal_mode = WAL');

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

// Every order belongs to the signed-in user (no guest checkout).
// user_id always comes from the verified JWT, never the request
// body, and is set on every INSERT — requireAuth guarantees it.
// (Column is added defensively because the committed dev DB
// predates it; SQLite cannot ALTER-add a NOT NULL column.)
try {
    db.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER`);
} catch (err) {
    // Column already exists — nothing to do
}

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

/* ------------------------------------------------------------
   Contact messages
   ------------------------------------------------------------ */

// Kept object-argument signature — src/routes/contact.js (unchanged)
// calls insertMessage(data). The SQL itself uses positional bindings.


function insertMessage({ name, email, subject, message }) {
    const stmt = db.prepare(`
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run([name, email, subject || null, message]);
    return result.lastInsertRowid;
}

function markEmailed(id) {
    db.prepare(`UPDATE contact_messages SET emailed = 1 WHERE id = ?`).run(id);
}

function getAllMessages() {
    return db.prepare(`SELECT * FROM contact_messages ORDER BY created_at DESC`).all();
}
/* ------------------------------------------------------------
   Users
   ------------------------------------------------------------ */

function createUser({ name, email, phone, passwordHash }) {
    const stmt = db.prepare(`
        INSERT INTO users (name, email, phone, password_hash)
        VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, phone || null, passwordHash);
    return result.lastInsertRowid;
}

function getUserByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

function getUserById(id) {
    return db
        .prepare(`SELECT id, name, email, phone, created_at FROM users WHERE id = ?`)
        .get(id);
}

/* ------------------------------------------------------------
   Orders
   ------------------------------------------------------------ */

// items is the server-verified snapshot:
// [{ id, name, qty, unitPriceZmw, lineTotalZmw }]
function createOrder({ customerName, email, phone, items, totalZmw, userId }) {
    const stmt = db.prepare(`
        INSERT INTO orders (customer_name, email, phone, items_json, total_zmw, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        customerName,
        email,
        phone || null,
        JSON.stringify(items),
        totalZmw,
        userId
    );

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
    createUser,
    getUserByEmail,
    getUserById,
    createOrder,
    getOrder
};