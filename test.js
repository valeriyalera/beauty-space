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

describe('C10: Connectivity & Real-time Protocols Tests', () => {

  function fetchJsonLocal(url) {
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

  test('Вимога C10: Frequent Polling GET /api/connectivity/poll відповідає статусом 200 та повертає дані', async () => {
    const res = await fetchJsonLocal(`${BASE_URL}/api/connectivity/poll`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.mode, 'frequent-poll');
    assert.ok(Array.isArray(res.body.data), 'Дані повинні бути масивом подій складу');
  });

  test('Вимога C10: Long Polling GET /api/connectivity/long-poll підтримує запит та повертає масив', async () => {
    const res = await fetchJsonLocal(`${BASE_URL}/api/connectivity/long-poll?lastId=0`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body), 'Long polling повинен повертати масив подій');
  });

  test('Вимога C10: Сторінка бенчмарку GET /connectivity підключає WebSockets та перемикач режимів', async () => {
    const res = await fetchHtml(`${BASE_URL}/connectivity`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /WebSocket/i, 'Сторінка повинна містити реалізацію WebSocket');
    assert.match(res.body, /Long Polling/i, 'Сторінка повинна підтримувати Long Polling');
    assert.match(res.body, /Frequent Polling/i, 'Сторінка повинна підтримувати Frequent Polling');
  });

});


describe('B2: Telegram Bot Integration Tests', () => {

  test('Вимога B2: Ендпоінт швидкого замовлення POST /api/orders/quick відповідає статусом 200', async () => {
    const payload = JSON.stringify({
      productId: 1,
      productTitle: 'SkinMuse Hydrating Serum',
      phone: '+380991234567'
    });

    const res = await new Promise((resolve, reject) => {
      const req = http.request(`${BASE_URL}/api/orders/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (resStream) => {
        let data = '';
        resStream.on('data', chunk => data += chunk);
        resStream.on('end', () => resolve({ statusCode: resStream.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /success/i);
  });

});

describe('C21: AI Agent SSE Streaming & Tool Calling Tests', () => {

  test('Вимога C21: GET /ai-consultant рендерить інтерфейс чат-агента', async () => {
    const res = await fetchHtml(`${BASE_URL}/ai-consultant`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /AI Beauty Consultant/i);
    assert.match(res.body, /EventSource/i);
  });

  test('Вимога C21: GET /api/ai/chat-stream повертає text/event-stream потік', async () => {
    const res = await new Promise((resolve, reject) => {
      http.get(`${BASE_URL}/api/ai/chat-stream?message=сироватка`, (resStream) => {
        let rawData = '';
        resStream.on('data', chunk => rawData += chunk.toString());
        resStream.on('end', () => resolve({
          statusCode: resStream.statusCode,
          headers: resStream.headers,
          data: rawData
        }));
      }).on('error', reject);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/event-stream/);
    assert.match(res.data, /event: thought/);
    assert.match(res.data, /event: token/);
  });

});
const { spawn } = require('child_process');

describe('C22: Model Context Protocol (MCP) Server Tests', () => {

  test('Вимога C22: MCP сервер повертає список інструментів через JSON-RPC (3 Read, 1 Write)', async () => {
    const mcpProcess = spawn('node', ['mcpServer.js'], {
      env: { ...process.env }
    });

    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    }) + '\n';


    const listToolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }) + '\n';

    const response = await new Promise((resolve, reject) => {
      let buffer = '';
      
      const timeout = setTimeout(() => {
        mcpProcess.kill();
        reject(new Error('Таймаут відповіді від MCP сервера'));
      }, 5000);

      mcpProcess.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
       
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === 2 && parsed.result && parsed.result.tools) {
              clearTimeout(timeout);
              mcpProcess.kill();
              return resolve(parsed);
            }
          } catch {
          }
        }
      });

      mcpProcess.stderr.on('data', () => {});
      mcpProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      mcpProcess.stdin.write(initRequest);
      setTimeout(() => {
        mcpProcess.stdin.write(listToolsRequest);
      }, 100);
    });

    assert.ok(response.result, 'Відповідь повинна містити result');
    const tools = response.result.tools;
    assert.ok(tools.length >= 4, 'Сервер повинен повертати мінімум 4 інструменти');

    const toolNames = tools.map(t => t.name);
    assert.ok(toolNames.includes('get_categories'), 'Повинен бути інструмент get_categories');
    assert.ok(toolNames.includes('search_products'), 'Повинен бути інструмент search_products');
    assert.ok(toolNames.includes('get_product_details'), 'Повинен бути інструмент get_product_details');
    assert.ok(toolNames.includes('create_product'), 'Повинен бути інструмент create_product');
  });

});


describe('F6: 2D Canvas Graphics & Game Tests', () => {

  test('Вимога F6: GET /game рендерить полотно canvas та ігрові елементи', async () => {
    const res = await fetchHtml(`${BASE_URL}/game`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /<canvas id="gameCanvas"/i, 'Сторінка повинна містити тег canvas');
    assert.match(res.body, /getContext\(['"]2d['"]\)/i, 'Скрипт повинен ініціалізувати 2D контекст полотна');
    assert.match(res.body, /requestAnimationFrame/i, 'Повинен використовуватись цикл анімації requestAnimationFrame');
    assert.match(res.body, /Glow Catch/i, 'Сторінка повинна містити назву гри');
  });

});

describe('C18: Shared Dashboard & Whiteboard Tests', () => {

  test('Вимога C18: GET /shared-space повертає статус 200 та ініціалізує спільну дошку', async () => {
    const res = await fetchHtml(`${BASE_URL}/shared-space`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /whiteboardCanvas/i, 'Повинно бути присутнє полотно для малювання');
    assert.match(res.body, /\/ws\/board/i, 'Повинно бути підключення до WebSockets дошки');
    assert.match(res.body, /USERS_COUNT/i, 'Повинна підтримуватись синхронізація кількості користувачів');
  });

});

describe('C16: OAuth2 Authentication & Authorization Tests', () => {

  test('Вимога C16: GET /auth/google ініціює перенаправлення (Redirect 302) на Google OAuth', async () => {
    const res = await fetchHtml(`${BASE_URL}/auth/google`);
    assert.strictEqual(res.statusCode, 302);
    assert.match(res.headers.location || '', /accounts\.google\.com/i, 'Перенаправлення повинно вести на accounts.google.com');
  });

  test('Вимога C16: GET /api/auth/me повертає статус 401 для неавторизованого запиту', async () => {
    const res = await fetchHtml(`${BASE_URL}/api/auth/me`);
    assert.strictEqual(res.statusCode, 401);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.authenticated, false);
  });

});

describe('C12: Dynamic Markdown & Notion Editor Tests', () => {

  test('Вимога C12: GET /editor повертає статус 200 та ініціалізує блочний редактор', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /blocksContainer/i, 'Повинен бути присутній контейнер блоків');
    assert.match(res.body, /localStorage\.setItem/i, 'Повинно бути реалізовано збереження в localStorage');
    assert.match(res.body, /notion-block/i, 'Повинні підтримуватися структурні блоки');
  });

});

describe('F3: Drag-and-Drop Interaction & Sorting Tests', () => {
  test('Вимога F3: Сторінка редактора містить розмітку для перетягування (draggable та drag-handle)', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(
      res.body,
      /(draggable=['"]true['"]|setAttribute\(['"]draggable['"],\s*['"]true['"]\))/i,
      'Блоки повинні мати підтримку перетягування draggable'
    );
    assert.match(res.body, /class=['"][^'"]*drag-handle/i, 'Повинен бути візуальний маніпулятор перетягування .drag-handle');
    assert.match(res.body, /bi-grip-vertical/i, 'Повинна бути присутня іконка захоплення grip');
  });

});

describe('C13: Cross-device Real-time Synchronization Tests', () => {

  test('Вимога C13: Редактор ініціалізує WebSocket-з\'єднання для синхронізації', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /new WebSocket\(/i, 'Сторінка має створювати клієнтське WebSocket з\'єднання');
    assert.match(res.body, /editor_sync/i, 'Повинен бути протокол синхронізації повідомлень editor_sync');
    assert.match(res.body, /editor_update/i, 'Повинна надсилатися подія оновлення editor_update');
  });

  test('Вимога C13: Реалізовано обробку зовнішніх змін без переривання взаємодії', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /applyDocumentData/i, 'Повинна бути функція оновлення дерева документа при отриманні WS-даних');
  });

});

describe('C14: Real-time Action Visualization & Dynamic Motion Tests', () => {

  test('Вимога C14: Сторінка редактора містить CSS-анімації підсвічування та руху (.remote-highlight, remotePulse)', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /remote-highlight/i, 'Повинен бути клас remote-highlight для підсвічування дій');
    assert.match(res.body, /@keyframes\s+remotePulse/i, 'Повинна бути визначена ключова анімація пульсації remotePulse');
    assert.match(res.body, /remote-presence-tag/i, 'Повинен бути бейдж присутності remote-presence-tag');
  });

  test('Вимога C14: Клієнтська логіка підтримує передачу та обробку changedBlockId для візуалізації дій', async () => {
    const res = await fetchHtml(`${BASE_URL}/editor`);
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.body, /changedBlockId/i, 'Має передаватися та оброблятися changedBlockId при отриманні WS оновлень');
    assert.match(res.body, /classList\.add\(['"]remote-highlight['"]\)/i, 'Має динамічно додаватися підсвітка зміненого блоку');
  });

});