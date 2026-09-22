require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com'))
    ? { rejectUnauthorized: false }
    : false
});

async function initDB() {
  let client;
  try {
    client = await pool.connect();

    // 1. Таблица категорий
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    // 2. Таблица товаров (с твоими названиями: title и volume_ml)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        volume_ml VARCHAR(50),
        image_url VARCHAR(255),
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    // 3. Таблица отзывов
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Наполнение базовыми категориями
    const catCheck = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categories (name) VALUES 
        ('Lipsticks'),
        ('Serums'),
        ('Creams');
      `);
      console.log('Категорії успішно додані в PostgreSQL.');
    }

    console.log('PostgreSQL успішно підключено та ініціалізовано.');
  } catch (err) {
    console.error('Помилка підключення/ініціалізації PostgreSQL:', err);
  } finally {
    if (client) client.release();
  }
}

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};