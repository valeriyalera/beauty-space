require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', productRoutes);

app.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});