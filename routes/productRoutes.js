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
router.get('/', async (req, res) => {
  try {
    const productsResult = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY id ASC');

    res.render('products/index', { 
      products: productsResult.rows, 
      categories: categoriesResult.rows 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при завантаженні товарів');
  }
});

// 2. CREATE: Добавление нового товара + загрузка фото
router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, volume_ml, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : '/uploads/no-photo.png';

    await db.query(
      `INSERT INTO products (title, description, price, volume_ml, image_url, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, price, volume_ml, image_url, category_id || null]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при додаванні товару');
  }
});

// 3. READ ONE: Просмотр одного товара и его отзывов
router.get('/products/:id', async (req, res) => {
  try {
    const productResult = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).send('Продукт не знайдено');
    }

    const reviewsResult = await db.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY id DESC',
      [req.params.id]
    );

    res.render('products/details', { 
      product: productResult.rows[0], 
      reviews: reviewsResult.rows 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при відкритті деталей');
  }
});

// 4. UPDATE (форма): Страница редактирования
router.get('/products/:id/edit', async (req, res) => {
  try {
    const productResult = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY id ASC');

    if (productResult.rows.length === 0) {
      return res.status(404).send('Продукт не знайдено');
    }

    res.render('products/edit', { 
      product: productResult.rows[0], 
      categories: categoriesResult.rows 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при відкритті редагування');
  }
});

// 4. UPDATE (сохранение): Обновление данных товара в БД
router.post('/products/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, volume_ml, category_id } = req.body;
    
    let image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    } else {
      const existing = await db.query('SELECT image_url FROM products WHERE id = $1', [req.params.id]);
      image_url = existing.rows[0] ? existing.rows[0].image_url : '/uploads/no-photo.png';
    }

    await db.query(
      `UPDATE products 
       SET title = $1, description = $2, price = $3, volume_ml = $4, image_url = $5, category_id = $6
       WHERE id = $7`,
      [title, description, price, volume_ml, image_url, category_id || null, req.params.id]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при оновленні товару');
  }
});

// 5. DELETE: Удаление товара
router.post('/products/:id/delete', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при видаленні товару');
  }
});

module.exports = router;