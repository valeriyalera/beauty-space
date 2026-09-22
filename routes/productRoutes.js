// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Настройка сохранения загружаемых файлов в папку public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// 1. READ ALL: Главная страница со всеми товарами
router.get('/', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `).all();
  const categories = db.prepare('SELECT * FROM categories').all();
  res.render('products/index', { products, categories });
});

// 2. CREATE: Добавление нового товара + загрузка файла (фото)
router.post('/products', upload.single('image'), (req, res) => {
  const { title, description, price, volume_ml, category_id } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : '/uploads/no-photo.png';

  const stmt = db.prepare(`
    INSERT INTO products (title, description, price, volume_ml, image_url, category_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(title, description, price, volume_ml, image_url, category_id);

  res.redirect('/');
});

// 3. READ ONE: Просмотр одного товара и его отзывов
router.get('/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) return res.status(404).send('Продукт не знайдено');

  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ?').all(req.params.id);
  res.render('products/details', { product, reviews });
});

// 4. UPDATE (форма): Страница редактирования
router.get('/products/:id/edit', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const categories = db.prepare('SELECT * FROM categories').all();
  if (!product) return res.status(404).send('Продукт не знайдено');
  res.render('products/edit', { product, categories });
});

// 4. UPDATE (сохранение): Обновление данных товара в БД
router.post('/products/:id/edit', upload.single('image'), (req, res) => {
  const { title, description, price, volume_ml, category_id } = req.body;
  const existing = db.prepare('SELECT image_url FROM products WHERE id = ?').get(req.params.id);
  const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

  const stmt = db.prepare(`
    UPDATE products 
    SET title = ?, description = ?, price = ?, volume_ml = ?, image_url = ?, category_id = ?
    WHERE id = ?
  `);
  stmt.run(title, description, price, volume_ml, image_url, category_id, req.params.id);

  res.redirect('/');
});

// 5. DELETE: Удаление товара
router.post('/products/:id/delete', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/');
});

module.exports = router;