async function sendTelegramMessage(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
  
    if (!token || !chatId) {
      console.warn('⚠️ Telegram Bot: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env');
      return false;
    }
  
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
  
      const data = await response.json();
      if (!data.ok) {
        console.error('Ошибка Telegram API:', data.description);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error.message);
      return false;
    }
  }
  
  module.exports = { sendTelegramMessage };