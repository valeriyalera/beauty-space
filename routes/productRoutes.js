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


module.exports = router;