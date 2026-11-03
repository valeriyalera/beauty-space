const db = require('../db');


const tools = {
  search_products: async ({ categoryKeyword, maxPrice }) => {
    
    let sql = `
      SELECT p.id, p.title, p.price, p.volume_ml, p.description, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoryKeyword) {
      params.push(`%${categoryKeyword}%`);
      sql += ` AND (
        c.name ILIKE $${params.length} 
        OR p.title ILIKE $${params.length} 
        OR p.description ILIKE $${params.length}
      )`;
    }

    if (maxPrice) {
      params.push(Number(maxPrice));
      sql += ` AND p.price <= $${params.length}`;
    }

    sql += ' ORDER BY p.price ASC LIMIT 3';
    const { rows } = await db.query(sql, params);
    return rows;
  }
};


async function runAgentStream(userMessage, sendSSE) {

  sendSSE('thought', 'Аналізую запит клієнта щодо категорії засобу та бюджету...');
  await new Promise(r => setTimeout(r, 500));

  const lowerMsg = userMessage.toLowerCase();
  let toolArgs = { categoryKeyword: '', maxPrice: 1500 };


  if (lowerMsg.includes('сироватк') || lowerMsg.includes('serum')) {
    toolArgs = { categoryKeyword: 'serum', maxPrice: 1000 };
  } else if (lowerMsg.includes('крем') || lowerMsg.includes('cream')) {
    toolArgs = { categoryKeyword: 'cream', maxPrice: 1200 };
  } else if (lowerMsg.includes('помад') || lowerMsg.includes('губ') || lowerMsg.includes('lip')) {
    toolArgs = { categoryKeyword: 'lip', maxPrice: 600 };
  }


  sendSSE('thought', `Викликаю інструмент: search_products(category="${toolArgs.categoryKeyword}", maxPrice=${toolArgs.maxPrice})`);
  await new Promise(r => setTimeout(r, 600));


  const foundProducts = await tools.search_products(toolArgs);
  sendSSE('tool_result', JSON.stringify({ count: foundProducts.length, items: foundProducts }));
  await new Promise(r => setTimeout(r, 400));


  let responseText = '';
  if (foundProducts.length > 0) {
    responseText = `Я підібрав для вас ідеальні засоби з нашого каталогу:\n\n` +
      foundProducts.map(p => `• <b>${p.title}</b> [${p.category_name || 'Догляд'}] (${p.volume_ml || 30} мл) — <b>${p.price} ₴</b>.\n  ${p.description || 'Преміальний догляд для сяйва шкіри.'}`).join('\n\n') +
      `\n\nБажаєте оформити замовлення на цей засіб?`;
  } else {
    responseText = `На жаль, за вашим точним запитом у цій категорії товарів не знайдено, але ви можете переглянути інші товари в каталозі!`;
  }

  const words = responseText.split(' ');
  for (let i = 0; i < words.length; i++) {
    sendSSE('token', words[i] + ' ');
    await new Promise(r => setTimeout(r, 35));
  }

  sendSSE('done', '[DONE]');
}

module.exports = { runAgentStream };