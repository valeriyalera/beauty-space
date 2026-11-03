require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const compression = require('compression');
const path = require('path');
const db = require('./db');
const productRoutes = require('./routes/productRoutes');
const apiRoutes = require('./routes/apiRoutes'); 
const { runAgentStream } = require('./services/aiAgentService');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

let stockEvents = [
  { id: Date.now(), title: 'SkinMuse Hydrating Serum', event: 'Залишок на складі: 42 шт.', timestamp: new Date().toLocaleTimeString() }
];

let longPollWaiters = [];

function broadcastStockUpdate(item) {
  const eventPayload = {
    id: Date.now(),
    title: item.title,
    event: item.event,
    timestamp: new Date().toLocaleTimeString()
  };
  
  stockEvents.unshift(eventPayload);
  if (stockEvents.length > 20) stockEvents.pop();

  wss.clients.forEach(client => {
    if (client.readyState === 1) { 
      client.send(JSON.stringify(eventPayload));
    }
  });

  while (longPollWaiters.length > 0) {
    const res = longPollWaiters.pop();
    res.json([eventPayload]);
  }
}

setInterval(() => {
  const cosmetics = [
    'SkinMuse Hydrating Serum',
    'Velvet Matte Lipstick (Ruby Rose)',
    'Hydra Barrier Moisture Cream',
    'Vitamin C Glow Booster',
    'Ceramide Balancing Toner'
  ];
  const randomProduct = cosmetics[Math.floor(Math.random() * cosmetics.length)];
  const randomQty = Math.floor(Math.random() * 25) + 1;

  broadcastStockUpdate({
    title: randomProduct,
    event: `Склад оновлено: доступно ${randomQty} шт.`
  });
}, 6000);


wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT', data: stockEvents }));
});


const editorWss = new WebSocketServer({ noServer: true });
let currentEditorDoc = null;

editorWss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'editor_init') {
        if (currentEditorDoc) {
          ws.send(JSON.stringify({ type: 'editor_sync', doc: currentEditorDoc }));
        }
      } else if (data.type === 'editor_update') {
        currentEditorDoc = data.doc;

        editorWss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'editor_sync',
              doc: currentEditorDoc,
              changedBlockId: data.changedBlockId || null
            }));
          }
        });
      }
    } catch (err) {
      console.error('Помилка обробки WS повідомлення редактора:', err);
    }
  });
});


const boardWss = new WebSocketServer({ noServer: true });
let drawingHistory = [];

boardWss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT_BOARD', data: drawingHistory }));

  const broadcastUsers = () => {
    const count = boardWss.clients.size;
    const msg = JSON.stringify({ type: 'USERS_COUNT', count });
    boardWss.clients.forEach(c => {
      if (c.readyState === 1) c.send(msg);
    });
  };
  broadcastUsers();

  ws.on('message', (raw) => {
    try {
      const action = JSON.parse(raw);
      if (action.type === 'DRAW_LINE') {
        drawingHistory.push(action.payload);
        if (drawingHistory.length > 3000) drawingHistory.shift();
      } else if (action.type === 'CLEAR_BOARD') {
        drawingHistory = [];
      }

      boardWss.clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(action));
        }
      });
    } catch (e) {
      console.error('Board WS error:', e);
    }
  });

  ws.on('close', () => {
    broadcastUsers();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'beauty_space_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});


app.use('/', authRoutes);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/editor', (req, res) => {
  res.render('editor/index');
});


app.get('/api/connectivity/poll', (req, res) => {
  res.json({
    mode: 'frequent-poll',
    timestamp: Date.now(),
    data: stockEvents.slice(0, 5)
  });
});

app.get('/api/connectivity/long-poll', (req, res) => {
  const clientLastId = Number(req.query.lastId) || 0;

  if (stockEvents.length > 0 && stockEvents[0].id > clientLastId) {
    return res.json([stockEvents[0]]);
  }

  longPollWaiters.push(res);

  req.on('close', () => {
    longPollWaiters = longPollWaiters.filter(r => r !== res);
  });

  setTimeout(() => {
    const index = longPollWaiters.indexOf(res);
    if (index !== -1) {
      longPollWaiters.splice(index, 1);
      res.json([]);
    }
  }, 25000);
});

app.get('/connectivity', (req, res) => {
  res.render('connectivity/index');
});


app.get('/ai-consultant', (req, res) => {
  res.render('ai-consultant/index');
});

app.get('/api/ai/chat-stream', async (req, res) => {
  const userMessage = req.query.message || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runAgentStream(userMessage, sendSSE);
  } catch (err) {
    sendSSE('error', err.message);
  } finally {
    res.end();
  }
});


app.get('/game', (req, res) => {
  res.render('game/index');
});

app.get('/shared-space', (req, res) => {
  res.render('whiteboard/index');
});

app.use('/', productRoutes);
app.use('/api', apiRoutes);

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws/stock') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/board') {
    boardWss.handleUpgrade(request, socket, head, (ws) => {
      boardWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/editor' || pathname === '/') {

    editorWss.handleUpgrade(request, socket, head, (ws) => {
      editorWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});


server.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
  console.log(`Панель Connectivity (C10): http://localhost:${PORT}/connectivity`);
  console.log(`ШІ-консультант (C21): http://localhost:${PORT}/ai-consultant`);
  console.log(`Міні-гра Canvas (F6): http://localhost:${PORT}/game`);
  console.log(`Спільна дошка (C18): http://localhost:${PORT}/shared-space`);
  console.log(`Редактор нотаток (C12/C13): http://localhost:${PORT}/editor`);
});