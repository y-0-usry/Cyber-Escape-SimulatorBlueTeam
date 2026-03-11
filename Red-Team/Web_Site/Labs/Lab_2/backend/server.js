const express = require('express');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const dataDir = path.join(__dirname, '../Data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = lowdb(adapter);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));
app.use('/Data', express.static(path.join(__dirname, '../Data')));

function buildProducts() {
  const categories = ['electronics', 'fashion', 'home', 'books', 'gaming', 'sports'];
  const products = [];
  let id = 1;
  categories.forEach((cat) => {
    for (let i = 1; i <= 12; i++) {
      products.push({
        id: id++,
        name: `${cat.toUpperCase()} Product ${i}`,
        category: cat,
        price: 20 + i * 5,
        stock: 50,
        description: `Top-rated ${cat} item ${i}`
      });
    }
  });

  // Challenge target product for response manipulation / IDOR tasks
  products.push({
    id: 777,
    name: 'Quantum Enterprise Server',
    category: 'electronics',
    price: 700,
    stock: 5,
    description: 'High-value target product for checkout challenge.'
  });

  return products;
}

function seedDb() {
  const products = buildProducts();
  const flagValue = 'FLAG{ecom_sqli_category_secret_dump}';

  db.setState({
    users: [
      { id: 1, username: 'attacker1', password: 'ShopHack123!', token: null, account_id: 1 },
      { id: 2, username: 'analyst2', password: 'pass123', token: null, account_id: 2 },
      { id: 3, username: 'buyer3', password: 'pass123', token: null, account_id: 3 }
    ],
    accounts: [
      { id: 1, owner_user_id: 1, balance: 100, initial_balance: 100 },
      { id: 2, owner_user_id: 2, balance: 40, initial_balance: 40 },
      { id: 3, owner_user_id: 3, balance: 25, initial_balance: 25 },
      { id: 4, owner_user_id: null, balance: 60, initial_balance: 60 },
      { id: 5, owner_user_id: null, balance: 80, initial_balance: 80 },
      { id: 6, owner_user_id: null, balance: 50, initial_balance: 50 },
      { id: 7, owner_user_id: null, balance: 35, initial_balance: 35 },
      { id: 8, owner_user_id: null, balance: 20, initial_balance: 20 },
      { id: 9, owner_user_id: null, balance: 95, initial_balance: 95 },
      { id: 10, owner_user_id: null, balance: 5000, initial_balance: 5000 }
    ],
    products,
    categories: ['electronics', 'fashion', 'home', 'books', 'gaming', 'sports'],
    carts: [],
    orders: [],
      secret: [
      { id: 1, flag: flagValue, note: 'internal-only' }
    ]
  }).write();
}

db.defaults({ users: [], accounts: [], products: [], categories: [], carts: [], orders: [], secret: [] }).write();
if (db.get('users').size().value() === 0) seedDb();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = db.get('users').find({ token }).value();
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  req.user = user;
  next();
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/api/reset', (req, res) => {
  seedDb();
  res.json({ success: true, message: 'Lab 2 reset complete' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username, password }).value();
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const token = crypto.createHash('sha256').update(`${user.id}-${Date.now()}`).digest('hex');
  db.get('users').find({ id: user.id }).assign({ token }).write();

  res.json({ token, userId: user.id, username: user.username });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  db.get('users').find({ id: req.user.id }).assign({ token: null }).write();
  res.json({ success: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const account = db.get('accounts').find({ id: req.user.account_id }).value();
  res.json({
    id: req.user.id,
    username: req.user.username,
    accountId: req.user.account_id,
    balance: account ? account.balance : 0
  });
});

app.get('/api/products', (req, res) => {
  const products = db.get('products').value();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.get('products').find({ id: +req.params.id }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

app.get('/api/categories', (req, res) => {
  res.json(db.get('categories').value());
});

// Vulnerable SQLi simulation endpoint
app.post('/api/category/search', (req, res) => {
  const categoryParam = String(req.body.category || '');
  const payload = categoryParam.toLowerCase();
  const query = `SELECT * FROM products WHERE category='${categoryParam}'`;

  const secretRow = db.get('secret').find({ id: 1 }).value() || { id: 1, flag: '', note: '' };
  const tableRows = [
    { table_name: 'users' },
    { table_name: 'accounts' },
    { table_name: 'orders' },
    { table_name: 'products' },
    { table_name: 'secret' }
  ];

  // 1) Column enumeration payloads (must be checked before table enumeration)
  if (/information_schema\.columns/.test(payload) && /secret/.test(payload)) {
    if (/group_concat\(column_name\)/.test(payload)) {
      return res.json({
        query,
        rows: [{ column_name: 'id,flag,note' }]
      });
    }

    return res.json({
      query,
      rows: [
        { column_name: 'id' },
        { column_name: 'flag' },
        { column_name: 'note' }
      ]
    });
  }

  // 2) Flag extraction payloads
  if (/from\s+secret/.test(payload) || (/secret/.test(payload) && /flag/.test(payload))) {
    if (/group_concat\(flag\)/.test(payload)) {
      return res.json({
        query,
        rows: [{ flag: secretRow.flag }]
      });
    }

    return res.json({
      query,
      rows: [{ flag: secretRow.flag }]
    });
  }

  // 3) Table enumeration payloads
  if (/information_schema\.tables|table_name|tables/.test(payload) && /union|select/.test(payload)) {
    return res.json({ query, rows: tableRows });
  }

  const rows = db.get('products').filter(p => p.category.toLowerCase() === categoryParam.toLowerCase()).value();
  res.json({
    query,
    rows
  });
});

app.get('/api/cart', authMiddleware, (req, res) => {
  let cart = db.get('carts').find({ user_id: req.user.id }).value();
  if (!cart) {
    cart = { user_id: req.user.id, items: [] };
    db.get('carts').push(cart).write();
  }
  res.json(cart);
});

app.post('/api/cart/add', authMiddleware, (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = db.get('products').find({ id: +productId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });

  let cart = db.get('carts').find({ user_id: req.user.id }).value();
  if (!cart) {
    cart = { user_id: req.user.id, items: [] };
    db.get('carts').push(cart).write();
  }

  const existing = cart.items.find(i => i.productId === +productId);
  if (existing) existing.qty += +qty;
  else cart.items.push({ productId: +productId, qty: +qty });

  db.write();
  res.json({ success: true, cart });
});

app.post('/api/checkout/preview', authMiddleware, (req, res) => {
  const { productId } = req.body;
  const product = db.get('products').find({ id: +productId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });

  res.json({ purchased: false, productId: product.id, price: product.price, accountId: req.user.account_id });
});

// Vulnerable checkout flow: response manipulation + IDOR on accountId
app.post('/api/checkout/complete', authMiddleware, (req, res) => {
  const { productId, purchased, accountId } = req.body;
  const product = db.get('products').find({ id: +productId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const targetAccountId = +accountId;
  const account = db.get('accounts').find({ id: targetAccountId }).value();
  if (!account) return res.status(404).json({ message: 'Account not found' });

  // Vulnerability #2: If client flips purchased=true, skip charge and place order
  if (purchased === true) {
    const orderId = db.get('orders').size().value() + 1;
    db.get('orders').push({
      id: orderId,
      user_id: req.user.id,
      charged_account_id: null,
      productId: product.id,
      price: product.price,
      status: 'paid',
      payment_bypass: true,
      created_at: new Date().toISOString()
    }).write();

    return res.json({ success: true, orderId, charged: 0, message: 'Order placed (purchased=true)' });
  }

  // Vulnerability #3: IDOR uses caller-provided accountId without ownership check
  if (account.balance < product.price) {
    return res.status(400).json({ message: 'Insufficient balance in selected account', selectedAccount: account.id });
  }

  account.balance -= product.price;
  const orderId = db.get('orders').size().value() + 1;
  db.get('orders').push({
    id: orderId,
    user_id: req.user.id,
    charged_account_id: account.id,
    productId: product.id,
    price: product.price,
    status: 'paid',
    payment_bypass: false,
    created_at: new Date().toISOString()
  }).write();

  db.write();
  res.json({ success: true, orderId, charged: product.price, selectedAccount: account.id });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = db.get('orders').filter({ user_id: req.user.id }).value();
  res.json(orders);
});

app.get('/api/accounts/:id', authMiddleware, (req, res) => {
  const account = db.get('accounts').find({ id: +req.params.id }).value();
  if (!account) return res.status(404).json({ message: 'Account not found' });
  // Intentional broad exposure for lab realism and IDOR context
  res.json(account);
});

app.get('/api/challenge/status', authMiddleware, (req, res) => {
  const targetProductId = 777;
  const userOrders = db.get('orders').filter({ user_id: req.user.id }).value();
  const account10 = db.get('accounts').find({ id: 10 }).value();

  const boughtTarget = userOrders.some(o => o.productId === targetProductId);
  const account10Drained = account10 && account10.balance < account10.initial_balance;

  res.json({
    task2: boughtTarget,
    task3: account10Drained,
    boughtTarget,
    account10Balance: account10 ? account10.balance : null,
    ordersCount: userOrders.length
  });
});

app.post('/api/challenge/submit-flag', authMiddleware, (req, res) => {
  const { flag } = req.body;
  const correct = db.get('secret').find({ id: 1 }).value()?.flag;
  if (flag === correct) return res.json({ success: true });
  return res.status(400).json({ success: false, message: 'Incorrect flag' });
});

app.listen(3012, () => {
  console.log('Lab 2 server running at http://localhost:3012');
});