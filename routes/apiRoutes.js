const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60';

router.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при отриманні категорій' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при отриманні товарів' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productResult = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = $1
    `, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    const reviewsResult = await db.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY id DESC',
      [id]
    );

    res.status(200).json({
      product: productResult.rows[0],
      reviews: reviewsResult.rows
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при отриманні товару' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { title, description, price, volume_ml, category_id, image_url } = req.body;

    if (!title || price === undefined || price === null) {
      return res.status(400).json({ error: 'Поля title та price є обов’язковими' });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Ціна повинна бути додатнім числом' });
    }

    const finalImageUrl = (image_url && String(image_url).trim() !== '') ? String(image_url).trim() : DEFAULT_IMAGE;

    const result = await db.query(`
      INSERT INTO products (title, description, price, volume_ml, image_url, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title.trim(), description || '', Number(price), volume_ml || null, finalImageUrl, category_id || null]);

    res.status(201).json({
      message: 'Товар успішно створено',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при створенні товару' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, volume_ml, category_id, image_url } = req.body;

    const checkProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({ error: 'Ціна повинна бути додатнім числом' });
    }

    const existing = checkProduct.rows[0];
    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedPrice = price !== undefined ? Number(price) : existing.price;
    const updatedVolume = volume_ml !== undefined ? volume_ml : existing.volume_ml;
    const updatedCategory = category_id !== undefined ? category_id : existing.category_id;
    const updatedImage = (image_url && String(image_url).trim() !== '') ? String(image_url).trim() : existing.image_url;

    const result = await db.query(`
      UPDATE products 
      SET title = $1, description = $2, price = $3, volume_ml = $4, image_url = $5, category_id = $6
      WHERE id = $7
      RETURNING *
    `, [updatedTitle, updatedDesc, updatedPrice, updatedVolume, updatedImage, updatedCategory, id]);

    res.status(200).json({
      message: 'Товар успішно оновлено',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при оновленні товару' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const checkProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.status(200).json({ message: `Товар з ID ${id} успішно видалено` });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при видаленні товару' });
  }
});

router.post('/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, rating, comment } = req.body;

    const checkProduct = await db.query('SELECT id FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    if (!author || !rating) {
      return res.status(400).json({ error: 'Поля author та rating обов’язкові' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Рейтинг має бути цілим числом від 1 до 5' });
    }

    const result = await db.query(`
      INSERT INTO reviews (product_id, author, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, author.trim(), numRating, comment ? comment.trim() : '']);

    res.status(201).json({
      message: 'Відгук додано',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка сервера при додаванні відгуку' });
  }
});

module.exports = router;
