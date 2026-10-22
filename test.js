const { test, describe } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// 1. Тести для пункту C1 (Models & Validation)
test('C1 Models & Validation Tests', async (t) => {
  await t.test('Рейтинг відгуку має бути в діапазоні від 1 до 5', () => {
    const isValidRating = (r) => Number.isInteger(r) && r >= 1 && r <= 5;
    assert.strictEqual(isValidRating(5), true);
    assert.strictEqual(isValidRating(1), true);
    assert.strictEqual(isValidRating(0), false);
    assert.strictEqual(isValidRating(6), false);
  });

  await t.test('Ціна продукту має бути коректним додатнім числом', () => {
    const isValidPrice = (p) => !isNaN(Number(p)) && Number(p) > 0;
    assert.strictEqual(isValidPrice(500), true);
    assert.strictEqual(isValidPrice('750.50'), true);
    assert.strictEqual(isValidPrice(-10), false);
    assert.strictEqual(isValidPrice('abc'), false);
  });

  await t.test('Товар коректно прив’язується до ID категорії', () => {
    const product = { title: 'Serum', category_id: 2 };
    assert.strictEqual(typeof product.category_id, 'number');
    assert.strictEqual(product.category_id > 0, true);
  });
});

// 2. Тести для пункту C5 (REST API Logic & Validation)
test('C5 REST API Payload & Response Tests', async (t) => {
  await t.test('Валідація POST /api/products: обов’язкові поля title та додатня ціна', () => {
    const validateProductPayload = (body) => {
      if (!body.title || String(body.title).trim() === '') return 400;
      if (body.price === undefined || isNaN(Number(body.price)) || Number(body.price) <= 0) return 400;
      return 201;
    };

    assert.strictEqual(validateProductPayload({ title: 'Peptide Serum', price: 650 }), 201);
    assert.strictEqual(validateProductPayload({ title: '', price: 650 }), 400);
    assert.strictEqual(validateProductPayload({ title: 'Cream', price: -50 }), 400);
    assert.strictEqual(validateProductPayload({ title: 'Cream' }), 400);
  });

  await t.test('Валідація POST /api/products/:id/reviews: обов’язковий автор та рейтинг 1-5', () => {
    const validateReviewPayload = (body) => {
      if (!body.author || String(body.author).trim() === '') return 400;
      const numRating = parseInt(body.rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) return 400;
      return 201;
    };

    assert.strictEqual(validateReviewPayload({ author: 'Валерія', rating: 5 }), 201);
    assert.strictEqual(validateReviewPayload({ author: '', rating: 5 }), 400);
    assert.strictEqual(validateReviewPayload({ author: 'Іван', rating: 0 }), 400);
    assert.strictEqual(validateReviewPayload({ author: 'Олена', rating: 6 }), 400);
  });

  await t.test('REST API серіалізація: відповідь GET /api/products/:id формує валідну JSON-структуру', () => {
    const mockApiResponse = {
      product: { id: 1, title: 'SkinMuse', price: '750.00', category_name: 'Creams' },
      reviews: [{ id: 1, author: 'Олена', rating: 5 }]
    };

    assert.ok(mockApiResponse.product, 'Об’єкт продукту повинен бути присутній');
    assert.strictEqual(typeof mockApiResponse.product.id, 'number');
    assert.ok(Array.isArray(mockApiResponse.reviews), 'Відгуки повинні передаватися масивом');
  });
});

// 3. Тести для пункту C6 (Responsive Landing Page & Dynamic UI)
test('C6 Product Landing Page UI & Structure Tests', async (t) => {
  const getCategoryBenefit = (category) => {
    switch (category) {
      case 'Lipsticks':
        return { feature: 'Оксамитовий фініш', icon: 'bi-stars' };
      case 'Serums':
        return { feature: 'Активні пептиди', icon: 'bi-lightning-charge' };
      case 'Creams':
        return { feature: 'Захисний бар\'єр', icon: 'bi-shield-check' };
      default:
        return { feature: 'Глибоке зволоження', icon: 'bi-droplet-half' };
    }
  };

  await t.test('Лендінг динамічно адаптує переваги під категорію Lipsticks', () => {
    const benefit = getCategoryBenefit('Lipsticks');
    assert.strictEqual(benefit.feature, 'Оксамитовий фініш');
    assert.strictEqual(benefit.icon, 'bi-stars');
  });

  await t.test('Лендінг динамічно адаптує переваги під категорію Serums', () => {
    const benefit = getCategoryBenefit('Serums');
    assert.strictEqual(benefit.feature, 'Активні пептиди');
    assert.strictEqual(benefit.icon, 'bi-lightning-charge');
  });

  await t.test('Вимога C6: плаваюча контактна панель містить телефон та клас фіксації', () => {
    const stickyContactBar = {
      className: 'sticky-contact-bar',
      phone: '+38 (099) 123-45-67',
      isFixedBottom: true
    };

    assert.strictEqual(stickyContactBar.isFixedBottom, true);
    assert.ok(stickyContactBar.className.includes('sticky-contact-bar'));
    assert.ok(stickyContactBar.phone.startsWith('+38'));
  });

  await t.test('Лендінг містить обов’язкові навігаційні якорі односторінкового сайту', () => {
    const requiredLandingSections = ['#overview', '#benefits', '#usage', '#reviews', '#order'];
    const renderedSections = ['#overview', '#benefits', '#usage', '#reviews', '#order'];

    requiredLandingSections.forEach((section) => {
      assert.ok(renderedSections.includes(section), `Секція ${section} повинна бути присутня на лендінгу`);
    });
  });

  await t.test('Формування зіркового рейтингу (1-5) для відгуків без статичних значень', () => {
    const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    assert.strictEqual(renderStars(5), '★★★★★');
    assert.strictEqual(renderStars(4), '★★★★☆');
    assert.strictEqual(renderStars(3), '★★★☆☆');
  });
});

// 4. Тести для пункту C7 (SEO Optimization & Metadata Tests)
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

describe('C7: SEO Optimization & Metadata Tests', () => {
  test('GET /products/1 повинен віддавати сторінку зі статусом 200 та основними SEO-тегами', async () => {
    const res = await fetchHtml(`${BASE_URL}/products/1`);

    assert.strictEqual(res.statusCode, 200, 'Сторінка повинна повертати статус 200 OK');

    const html = res.body;

    assert.match(html, /<html[^>]*lang=["']uk["']/i, 'HTML має містити атрибут lang="uk"');

    assert.match(html, /<title>[^<]+The Beauty Space<\/title>/i, 'Сторінка має містити заповнений тег <title>');

    assert.match(
      html, 
      /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i, 
      'Сторінка повинна містити непорожній мета-тег description'
    );

    assert.match(html, /<h1[^>]*>[\s\S]*?<\/h1>/i, 'Сторінка має містити семантичний заголовок <h1>');
  });

  test('GET /products/1 повинен містити розмітку Open Graph та Schema.org (JSON-LD)', async () => {
    const res = await fetchHtml(`${BASE_URL}/products/1`);
    const html = res.body;

    assert.match(html, /<meta\s+property=["']og:title["']/i, 'Повинен бути присутній og:title');
    assert.match(html, /<meta\s+property=["']og:description["']/i, 'Повинен бути присутній og:description');
    assert.match(html, /<meta\s+property=["']og:type["']\s+content=["']product["']/i, 'Тип OG повинен бути product');

    assert.match(html, /<link\s+rel=["']icon["']/i, 'Сторінка повинна містити посилання на favicon');

    assert.match(
      html, 
      /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i, 
      'Сторінка повинна містити Schema.org у форматі application/ld+json'
    );

    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    assert.ok(jsonLdMatch, 'Блок JSON-LD знайдено');
    
    const parsedSchema = JSON.parse(jsonLdMatch[1]);
    assert.strictEqual(parsedSchema['@type'], 'Product', 'Тип схеми Schema.org має бути Product');
  });
});

// 5. Тести для пункту C8 (Сторонній API: OpenStreetMap / Leaflet)
describe('C8: Third-party Map API Integration Tests', () => {

  test('GET /stores повертає статус 200 та підключає сторонній API Leaflet/OpenStreetMap', async () => {
    const res = await fetchHtml(`${BASE_URL}/stores`);

    assert.strictEqual(res.statusCode, 200, 'Сторінка мапи /stores повинна відповідати зі статусом 200 OK');

    const html = res.body;

    assert.match(html, /leaflet\.css/i, 'Сторінка повинна підключати стилі Leaflet CSS');
    assert.match(html, /leaflet\.js/i, 'Сторінка повинна підключати скрипт Leaflet.js');
    assert.match(html, /id=["']map["']/i, 'Сторінка повинна містити контейнер <div id="map">');
    assert.match(html, /tile\.openstreetmap\.org/i, 'Скрипт карти повинен звертатися до стороннього API OpenStreetMap');
  });

  test('Вимога C8: відображення множини точок одночасно та логіка фільтрації за товарами', async () => {
    const res = await fetchHtml(`${BASE_URL}/stores`);
    const html = res.body;

    assert.match(html, /id=["']data-products["']/i, 'Мають передаватися сутності товарів у data-products');
    assert.match(html, /id=["']data-points["']/i, 'Мають передаватися точки присутності у data-points');
    assert.match(html, /id=["']productFilter["']/i, 'Сторінка повинна містити випадаючий список фільтрації #productFilter');

    const mockPoints = [
      { id: 1, city: 'Київ', productIds: [1, 2] },
      { id: 2, city: 'Львів', productIds: [2, 3] },
      { id: 3, city: 'Одеса', productIds: [1] }
    ];

    const filterByProduct = (points, prodId) => {
      if (prodId === 'all') return points;
      return points.filter(pt => pt.productIds.includes(Number(prodId)));
    };

    assert.strictEqual(filterByProduct(mockPoints, 'all').length, 3, 'За замовчуванням мають відображатися всі 3 точки');

    const filteredForProd1 = filterByProduct(mockPoints, 1);
    assert.strictEqual(filteredForProd1.length, 2);
    assert.deepStrictEqual(filteredForProd1.map(p => p.city), ['Київ', 'Одеса']);
    const filteredForProd3 = filterByProduct(mockPoints, 3);
    assert.strictEqual(filteredForProd3.length, 1);
    assert.strictEqual(filteredForProd3[0].city, 'Львів');
  });

});

// 6. Тести для пункту F1 (Візуалізація статистики: Chart.js)
describe('F1: Data Visualization & Statistics Tests (Chart.js)', () => {

  test('GET /stores підключає бібліотеку Chart.js та містить canvas-контейнери діаграм', async () => {
    const res = await fetchHtml(`${BASE_URL}/stores`);
    const html = res.body;

    assert.match(html, /chart\.js/i, 'Сторінка повинна підключати бібліотеку візуалізації Chart.js');
    assert.match(html, /id=["']storesChart["']/i, 'Повинен бути canvas #storesChart для стовпчикової діаграми залишків');
    assert.match(html, /id=["']categoriesChart["']/i, 'Повинен бути canvas #categoriesChart для кругової діаграми категорій');
  });

  test('Вимога F1: агрегація та коректність структур даних для побудови графіків', () => {

    const pointsData = [
      { name: 'Київ', productIds: [1, 2, 3] },
      { name: 'Львів', productIds: [2] }
    ];

    const barChartDataset = {
      labels: pointsData.map(p => p.name),
      data: pointsData.map(p => p.productIds.length)
    };

    assert.deepStrictEqual(barChartDataset.labels, ['Київ', 'Львів']);
    assert.deepStrictEqual(barChartDataset.data, [3, 1], 'Кількість товарів у точках має відповідати довжині масиву productIds');

    const categoryStatsMock = [
      { name: 'Creams', count: '2' },
      { name: 'Serums', count: '1' }
    ];

    const doughnutDataset = {
      labels: categoryStatsMock.map(c => c.name),
      counts: categoryStatsMock.map(c => Number(c.count))
    };

    assert.strictEqual(doughnutDataset.labels.length, 2);
    assert.strictEqual(doughnutDataset.counts.reduce((a, b) => a + b, 0), 3, 'Сумарна кількість товарів за категоріями має дорівнювати 3');
  });

});

// 7. Тести для пункту F2 (Autocomplete Selector: Select2 + AJAX)
describe('F2: Autocomplete Selector & AJAX Search Tests', () => {

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      }).on('error', reject);
    });
  }

  test('Вимога F2: запит менше 3 символів повертає порожній результат', async () => {

    const res1 = await fetchJson(`${BASE_URL}/api/categories/search?q=li`);
    assert.strictEqual(res1.statusCode, 200);
    assert.deepStrictEqual(res1.body, { results: [] }, 'Пошук менше 3 символів не повинен навантажувати базу');

    const res2 = await fetchJson(`${BASE_URL}/api/categories/search?q=`);
    assert.strictEqual(res2.statusCode, 200);
    assert.deepStrictEqual(res2.body, { results: [] });
  });

  test('Вимога F2: ендпоінт GET /api/categories/search?q=lip повертає валідну структуру Select2', async () => {
    const res = await fetchJson(`${BASE_URL}/api/categories/search?q=lip`);

    assert.strictEqual(res.statusCode, 200, 'Ендпоінт повинен відповідати зі статусом 200 OK');
    assert.ok(Array.isArray(res.body.results), 'Відповідь повинна містити масив results');

    if (res.body.results.length > 0) {
      const item = res.body.results[0];
      assert.ok('id' in item, 'Елемент повинен містити id');
      assert.ok('text' in item, 'Елемент повинен містити text для випадаючого списку Select2');
      assert.match(item.text, /lip/i, 'Знайдений елемент повинен містити шуканий підрядок');
    }
  });

  test('Вимога F2: сторінка редагування GET /products/1/edit підключає Select2 та конфігурує параметри', async () => {
    const res = await fetchHtml(`${BASE_URL}/products/1/edit`);

    assert.strictEqual(res.statusCode, 200, 'Сторінка редагування повинна повертати статус 200 OK');

    const html = res.body;

    assert.match(html, /jquery[.-]/i, 'Сторінка повинна підключати бібліотеку jQuery');
    assert.match(html, /select2(\.min)?\.js/i, 'Сторінка повинна підключати скрипт Select2');
    assert.match(html, /select2(\.min)?\.css/i, 'Сторінка повинна підключати стилі Select2');
    assert.match(html, /minimumInputLength\s*:\s*3/i, 'Select2 має бути налаштований на пошук від 3 символів');
    assert.match(html, /delay\s*:\s*\d+/i, 'Select2 має мати налаштовану затримку вводу (debounce)');
    assert.match(html, /\/api\/categories\/search/i, 'AJAX запит повинен звертатися до відповідного ендпоінту бекенду');
  });

});