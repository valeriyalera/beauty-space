// server.js
const express = require('express');
const path = require('path');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Чтобы сервер понимал данные из форм и JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Делаем папку public общедоступной (для картинок и стилей)
app.use(express.static(path.join(__dirname, 'public')));

// Настраиваем шаблонизатор EJS (View)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Подключаем маршруты контроллера
app.use('/', productRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});