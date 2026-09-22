// db.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    volume_ml INTEGER,
    image_url TEXT NOT NULL,
    category_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    comment TEXT,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );
`);

// Заполняем начальными категориями, если таблица пустая
const count = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
if (count === 0) {
  const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
  insert.run('Lipsticks'); // Губні помади
  insert.run('Serums');    // Сироватки
  insert.run('Creams');    // Креми
}

module.exports = db;