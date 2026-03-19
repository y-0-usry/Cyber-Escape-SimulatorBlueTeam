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

function seedDb() {
  const flagValue = 'FLAG{logic_err0r_c0upon_abus3}';
  const now = new Date().toISOString();

  db.setState({
    users: [
      { id: 1, username: 'attacker1', password: 'ShopHack123!', token: null, balance: 500 }
    ],
    products: [
      {
        id: 101,
        name: 'Pro Wireless Headset',
        category: 'electronics',
        price: 300,
        stock: 50,
        description: 'Noise-cancelling headset with all-day battery.'
      },
      {
        id: 102,
        name: 'Smart Home Hub',
        category: 'home',
        price: 240,
        stock: 30,
        description: 'Central control hub for connected home devices.'
      },
      {
        id: 103,
        name: 'Performance Keyboard',
        category: 'gaming',
        price: 180,
        stock: 70,
        description: 'Low-latency mechanical keyboard with RGB.'
      },
      {
        id: 999,
        name: 'Secret Item',
        category: 'premium',
        price: 1000,
        stock: 1,
        description: 'Restricted premium inventory item.'
      }
    ],
    coupons: [
      {
        code: 'MEGA80',
        discountPercent: 80,
        maxUsesPerUser: 5
      }
    ],
    couponUsage: [],
    orders: [],
    audits: [
      {
        id: 1,
        event: 'system_init',
        message: 'Lab 5 initialized',
        created_at: now
      }
    ],
    secret: [
      { id: 1, flag: flagValue }
    ]
  }).write();
}

db.defaults({
  users: [],
  products: [],
  coupons: [],
  couponUsage: [],
  orders: [],
  audits: [],
  secret: []
}).write();

if (db.get('users').size().value() === 0) {
  seedDb();
}

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

function trackAudit(event, payload) {
  const id = db.get('audits').size().value() + 1;
  db.get('audits').push({
    id,
    event,
    ...payload,
    created_at: new Date().toISOString()
  }).write();
}

function getCouponUsage(userId, code) {
  const usage = db.get('couponUsage').find({ user_id: userId, code }).value();
  if (!usage) {
    const newUsage = { user_id: userId, code, uses: 0 };
    db.get('couponUsage').push(newUsage).write();
    return newUsage;
  }
  return usage;
}

function calculateOrderAmount(product, couponCode, userId) {
  const originalPrice = product.price;
  let paidAmount = originalPrice;
  let appliedCoupon = null;

  // Premium items (Secret Item) are NOT eligible for coupons
  if (product.id === 999) {
    return { originalPrice, paidAmount, appliedCoupon: null, couponDisabled: true };
  }

  if (couponCode) {
    const coupon = db.get('coupons').find({ code: String(couponCode).toUpperCase() }).value();
    if (!coupon) {
      return { error: 'Invalid coupon code.' };
    }

    const usage = getCouponUsage(userId, coupon.code);
    if (usage.uses >= coupon.maxUsesPerUser) {
      return { error: 'Coupon usage limit reached.' };
    }

    const discount = Math.floor((originalPrice * coupon.discountPercent) / 100);
    paidAmount = Math.max(1, originalPrice - discount);
    appliedCoupon = coupon;
  }

  return { originalPrice, paidAmount, appliedCoupon };
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/api/reset', (req, res) => {
  seedDb();
  res.json({ success: true, message: 'Lab 5 reset complete' });
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
  const current = db.get('users').find({ id: req.user.id }).value();
  res.json({
    id: current.id,
    username: current.username,
    balance: current.balance
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

app.post('/api/checkout/preview', authMiddleware, (req, res) => {
  const { productId, couponCode } = req.body;
  const product = db.get('products').find({ id: +productId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });

  if (product.id === 999 && couponCode) {
    return res.status(400).json({ message: 'Premium items are not eligible for promotional codes.' });
  }

  const pricing = calculateOrderAmount(product, couponCode, req.user.id);
  if (pricing.error) return res.status(400).json({ message: pricing.error });

  const current = db.get('users').find({ id: req.user.id }).value();
  const coupon = pricing.appliedCoupon;
  const usage = coupon ? getCouponUsage(req.user.id, coupon.code) : null;

  res.json({
    productId: product.id,
    productName: product.name,
    originalPrice: pricing.originalPrice,
    paidAmount: pricing.paidAmount,
    couponCode: coupon ? coupon.code : null,
    discountPercent: coupon ? coupon.discountPercent : 0,
    couponUsesLeft: coupon ? coupon.maxUsesPerUser - usage.uses : null,
    balance: current.balance
  });
});

app.post('/api/orders/purchase', authMiddleware, (req, res) => {
  const { productId, couponCode } = req.body;
  const product = db.get('products').find({ id: +productId }).value();
  if (!product) return res.status(404).json({ message: 'Product not found' });

  if (product.id === 999 && couponCode) {
    return res.status(400).json({ message: 'Premium items are not eligible for promotional codes.' });
  }

  const pricing = calculateOrderAmount(product, couponCode, req.user.id);
  if (pricing.error) return res.status(400).json({ message: pricing.error });

  const user = db.get('users').find({ id: req.user.id }).value();
  if (user.balance < pricing.paidAmount) {
    return res.status(400).json({
      message: 'Insufficient balance.',
      balance: user.balance,
      required: pricing.paidAmount
    });
  }

  user.balance -= pricing.paidAmount;
  db.get('users').find({ id: user.id }).assign({ balance: user.balance }).write();

  if (pricing.appliedCoupon) {
    const usage = getCouponUsage(user.id, pricing.appliedCoupon.code);
    usage.uses += 1;
    db.write();
  }

  const orderId = db.get('orders').size().value() + 1;
  const order = {
    id: orderId,
    user_id: user.id,
    productId: product.id,
    productName: product.name,
    originalPrice: pricing.originalPrice,
    paidAmount: pricing.paidAmount,
    couponCode: pricing.appliedCoupon ? pricing.appliedCoupon.code : null,
    status: 'paid',
    refunded: false,
    refundAmount: 0,
    created_at: new Date().toISOString()
  };

  db.get('orders').push(order).write();

  trackAudit('purchase_completed', {
    user_id: user.id,
    order_id: order.id,
    product_id: product.id,
    original_price: pricing.originalPrice,
    paid_amount: pricing.paidAmount,
    coupon_code: order.couponCode
  });

  res.json({ success: true, orderId: order.id, balance: user.balance });
});

app.post('/api/orders/:id/return', authMiddleware, (req, res) => {
  const orderId = +req.params.id;
  const order = db.get('orders').find({ id: orderId, user_id: req.user.id }).value();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.refunded) return res.status(400).json({ message: 'Order already refunded' });

  const user = db.get('users').find({ id: req.user.id }).value();

  // Intentional vulnerability for training: refund uses the original item price.
  const refundAmount = order.originalPrice;
  user.balance += refundAmount;

  db.get('users').find({ id: user.id }).assign({ balance: user.balance }).write();
  db.get('orders').find({ id: order.id }).assign({
    refunded: true,
    refundAmount,
    status: 'refunded',
    refunded_at: new Date().toISOString()
  }).write();

  trackAudit('refund_completed', {
    user_id: user.id,
    order_id: order.id,
    paid_amount: order.paidAmount,
    refund_amount: refundAmount,
    profit_delta: refundAmount - order.paidAmount
  });

  res.json({ success: true, refundAmount, balance: user.balance });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = db.get('orders').filter({ user_id: req.user.id }).value().map((o) => ({
    id: o.id,
    productId: o.productId,
    productName: o.productName,
    originalPrice: o.originalPrice,
    paidAmount: o.paidAmount,
    couponCode: o.couponCode,
    status: o.status,
    refunded: o.refunded,
    created_at: o.created_at
  }));

  res.json(orders);
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const orderId = +req.params.id;
  const order = db.get('orders').find({ id: orderId, user_id: req.user.id }).value();
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const details = {
    id: order.id,
    productId: order.productId,
    productName: order.productName,
    originalPrice: order.originalPrice,
    paidAmount: order.paidAmount,
    couponCode: order.couponCode,
    refunded: order.refunded,
    refundAmount: order.refundAmount,
    status: order.status,
    created_at: order.created_at,
    refunded_at: order.refunded_at || null
  };

  const secretProductId = 999;
  if (order.productId === secretProductId && order.status === 'paid') {
    details.flag = db.get('secret').find({ id: 1 }).value()?.flag || '';
  }

  res.json(details);
});

app.post('/api/challenge/submit-flag', authMiddleware, (req, res) => {
  const submittedFlag = (req.body.flag || '').trim();
  const correctFlag = db.get('secret').find({ id: 1 }).value()?.flag || '';
  
  if (submittedFlag === correctFlag) {
    res.json({ success: true });
  } else {
    res.status(400).json({ message: 'Incorrect flag' });
  }
});

app.listen(3015, () => {
  console.log('Lab 5 server running at http://localhost:3015');
});
