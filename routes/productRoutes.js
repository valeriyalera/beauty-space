const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60';

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

router.post('/products', async (req, res) => {
  try {
    const { title, description, price, volume_ml, category_id, image_url } = req.body;
    
    const finalImageUrl = (image_url && image_url.trim() !== '') ? image_url.trim() : DEFAULT_IMAGE;

    await db.query(
      `INSERT INTO products (title, description, price, volume_ml, image_url, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, price, volume_ml, finalImageUrl, category_id || null]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при додаванні товару');
  }
});

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

router.post('/products/:id/edit', async (req, res) => {
  try {
    const { title, description, price, volume_ml, category_id, image_url } = req.body;
    
    let finalImageUrl = image_url && image_url.trim() !== '' ? image_url.trim() : null;
    if (!finalImageUrl) {
      const existing = await db.query('SELECT image_url FROM products WHERE id = $1', [req.params.id]);
      finalImageUrl = existing.rows[0] ? existing.rows[0].image_url : DEFAULT_IMAGE;
    }

    await db.query(
      `UPDATE products 
       SET title = $1, description = $2, price = $3, volume_ml = $4, image_url = $5, category_id = $6
       WHERE id = $7`,
      [title, description, price, volume_ml, finalImageUrl, category_id || null, req.params.id]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при оновленні товару');
  }
});

router.post('/products/:id/delete', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при видаленні товару');
  }
});

router.post('/products/:id/reviews', async (req, res) => {
  try {
    const { author, rating, comment } = req.body;
    const productId = req.params.id;

    if (!author || !rating) {
      return res.status(400).send('Ім’я та оцінка обов’язкові');
    }

    await db.query(
      `INSERT INTO reviews (product_id, author, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [productId, author.trim(), parseInt(rating), comment ? comment.trim() : '']
    );

    res.redirect(`/products/${productId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Помилка при додаванні відгуку');
  }
});


router.get('/api/categories/search', async (req, res) => {
  try {
    const term = (req.query.q || '').trim();


    if (term.length < 3) {
      return res.json({ results: [] });
    }


    const result = await db.query(
      'SELECT id, name AS text FROM categories WHERE name ILIKE $1 ORDER BY name ASC LIMIT 20',
      [`%${term}%`]
    );
    res.json({ results: result.rows });
  } catch (err) {
    console.error('Помилка автодоповнення:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/stores', async (req, res) => {
  try {
    const result = await db.query('SELECT id, title, price, image_url, category_id FROM products');
    const products = result.rows;

  
    const catStats = await db.query(`
      SELECT c.name, COUNT(p.id) as count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
      GROUP BY c.name
    `);

    const pickupPoints = [
      {
        id: 1,
        city: 'Київ',
        name: 'The Beauty Space — Хрещатик',
        address: 'вул. Хрещатик, 22',
        phone: '+38 (044) 111-22-33',
        lat: 50.4471,
        lng: 30.5228,
        hours: '10:00 - 21:00',
        productIds: [1, 2, 3]
      },
      {
        id: 2,
        city: 'Київ',
        name: 'The Beauty Space — Поділ',
        address: 'вул. Петра Сагайдачного, 14',
        phone: '+38 (044) 222-33-44',
        lat: 50.4608,
        lng: 30.5202,
        hours: '10:00 - 20:00',
        productIds: [1, 4]
      },
      {
        id: 3,
        city: 'Львів',
        name: 'The Beauty Space — Площа Ринок',
        address: 'площа Ринок, 8',
        phone: '+38 (032) 333-44-55',
        lat: 49.8419,
        lng: 24.0315,
        hours: '10:00 - 20:00',
        productIds: [2, 3, 4]
      },
      {
        id: 4,
        city: 'Одеса',
        name: 'The Beauty Space — Дерибасівська',
        address: 'вул. Дерибасівська, 16',
        phone: '+38 (048) 444-55-66',
        lat: 46.4846,
        lng: 30.7388,
        hours: '10:00 - 21:00',
        productIds: [1, 3]
      }
    ];

    res.render('products/stores', { 
      products, 
      pickupPoints,
      categoryStats: catStats.rows 
    });
  } catch (err) {
    console.error('Помилка завантаження мапи та статистики:', err);
    res.status(500).send('Помилка сервера');
  }
});


module.exports = router;