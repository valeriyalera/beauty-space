const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://beauty_user:beauty_password@localhost:5432/beauty_db'
});

const server = new Server(
  {
    name: 'beauty-space-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [

      {
        name: 'get_categories',
        description: 'Отримати перелік усіх категорій доглядової косметики в The Beauty Space',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      {
        name: 'search_products',
        description: 'Пошук товарів у каталозі за ключовими словами та максимальною ціною',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Пошуковий запит (назва або тип засобу, наприклад: serum, cream)' },
            maxPrice: { type: 'number', description: 'Максимальна ціна в гривнях' },
          },
        },
      },

      {
        name: 'get_product_details',
        description: 'Отримати детальну інформацію про конкретний косметичний засіб за його ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Унікальний ідентифікатор товару' },
          },
          required: ['id'],
        },
      },
 
      {
        name: 'create_product',
        description: 'Додати новий косметичний засіб до каталогу магазину The Beauty Space',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Назва засобу' },
            price: { type: 'number', description: 'Ціна в гривнях' },
            volume_ml: { type: 'number', description: 'Обʼєм у мілілітрах' },
            description: { type: 'string', description: 'Опис властивостей продукту' },
            category_id: { type: 'number', description: 'ID категорії' },
          },
          required: ['title', 'price'],
        },
      },
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
 
      case 'get_categories': {
        const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY id ASC');
        return {
          content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
        };
      }

      case 'search_products': {
        let sql = 'SELECT id, title, price, volume_ml, description FROM products WHERE 1=1';
        const params = [];

        if (args && args.query) {
          params.push(`%${args.query}%`);
          sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }
        if (args && args.maxPrice) {
          params.push(Number(args.maxPrice));
          sql += ` AND price <= $${params.length}`;
        }

        sql += ' ORDER BY price ASC LIMIT 10';
        const { rows } = await pool.query(sql, params);
        return {
          content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
        };
      }

      case 'get_product_details': {
        const { rows } = await pool.query(
          `SELECT p.*, c.name as category_name 
           FROM products p 
           LEFT JOIN categories c ON p.category_id = c.id 
           WHERE p.id = $1`,
          [args.id]
        );

        if (rows.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Товар з ID ${args.id} не знайдено` }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(rows[0], null, 2) }],
        };
      }

      case 'create_product': {
        const { title, price, volume_ml, description, category_id } = args;
        const defaultImg = 'https://images.unsplash.com/photo-1608248597359-0a64704b407b?auto=format&fit=crop&w=600&q=80';

        const { rows } = await pool.query(
          `INSERT INTO products (title, price, volume_ml, description, category_id, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, title, price`,
          [title, price, volume_ml || 0, description || '', category_id || null, defaultImg]
        );

        return {
          content: [
            {
              type: 'text',
              text: `✅ Товар успішно додано через MCP: #${rows[0].id} "${rows[0].title}" за ціною ${rows[0].price} ₴`,
            },
          ],
        };
      }

      default:
        throw new Error(`Невідомий інструмент: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Помилка виконання: ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('The Beauty Space MCP Server запущено через STDIO');
}

module.exports = { server, pool };

if (require.main === module) {
  main().catch((err) => {
    console.error('Критична помилка старту MCP:', err);
    process.exit(1);
  });
}