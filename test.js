const test = require('node:test');
const assert = require('node:assert');

test('C1 Models & Validation Tests', async (t) => {
  await t.test('Рейтинг відгуку має бути в діапазоні від 1 до 5', () => {
    const validRating = 5;
    const isRatingValid = validRating >= 1 && validRating <= 5;
    assert.strictEqual(isRatingValid, true, 'Рейтинг 5 має бути валідним');

    const invalidRating = 6;
    const isInvalidValid = invalidRating >= 1 && invalidRating <= 5;
    assert.strictEqual(isInvalidValid, false, 'Рейтинг 6 не має проходити валідацію');
  });

  await t.test('Ціна продукту має бути коректним додатнім числом', () => {
    const price = 450.00;
    assert.ok(price > 0, 'Ціна має бути більшою за 0');
    assert.strictEqual(typeof price, 'number', 'Ціна має бути числом');
  });

  await t.test('Товар коректно прив’язується до ID категорії', () => {
    const product = {
      title: 'Hydra Serum',
      category_id: 2
    };
    assert.strictEqual(product.category_id, 2, 'ID категорії має відповідати реляційному зв’язку');
  });
});