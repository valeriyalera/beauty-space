require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const db = require('./db');
const productRoutes = require('./routes/productRoutes');
const apiRoutes = require('./routes/apiRoutes'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', productRoutes);

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});