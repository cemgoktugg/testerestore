const http = require('node:http');
const { randomUUID } = require('node:crypto');
const category = { id: 'pcat_bimetal', name: 'Bi-Metal Şerit Testereler', handle: 'bimetal', parent_category_id: null };
const makeProduct = (i) => ({
  id: 'prod_fixture_' + i, handle: i === 0 ? 'bimetal-premium' : i === 1 ? 'hazir-tukendi' : i === 2 ? 'hazir-stok' : 'hazir-' + i,
  title: i === 0 ? 'Bi-Metal M42 Şerit Testere' : 'Bi-Metal M42 Hazır ' + (3000 + i) + ' mm',
  subtitle: 'Regresyon test ürünü', description: 'Teknik ürün açıklaması', status: 'published',
  thumbnail: '/images/bimetal_blade.png', images: [], options: [], collection: null, tags: [], categories: [category],
  created_at: '2026-10-19T00:00:00.000Z', updated_at: '2026-10-19T00:00:00.000Z',
  metadata: i === 0 ? { blade_type: 'bi-metal', custom_length_enabled: true, min_length_mm: 1000, max_length_mm: 15000, product_type: 'blade' } :
    { is_ready_made: true, blade_type: 'bi-metal', width_mm: 27, thickness_mm: 0.9, length_mm: 3000 + i, tooth_pitch: '4/6', product_type: 'blade' },
  variants: [{ id: 'variant_fixture_' + i, title: '27 x 0,9', sku: 'TEST-' + i, options: [], manage_inventory: i !== 0, allow_backorder: false, inventory_quantity: i === 1 ? 0 : 3,
    calculated_price: { calculated_amount: 300, currency_code: 'try' }, prices: [{ amount: 300, currency_code: 'try' }] }],
});
const products = Array.from({ length: 205 }, (_, i) => makeProduct(i));
const carts = new Map();
const json = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const totals = cart => { const subtotal = cart.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0); return { ...cart, subtotal, item_subtotal: subtotal, item_total: subtotal * 1.2, total: subtotal * 1.2, tax_total: subtotal * 0.2, shipping_total: 0, shipping_subtotal: 0, discount_total: 0 }; };
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3101');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-publishable-api-key,authorization,x-medusa-locale');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://127.0.0.1:9101');
  let body = {};
  try { const chunks = []; for await (const chunk of req) chunks.push(chunk); if (chunks.length) body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return json(res, { message: 'Invalid JSON' }, 400); }
  const path = url.pathname;
  if (path === '/health') return json(res, { ok: true });
  if (path === '/store/regions') return json(res, { regions: [{ id: 'reg_fixture', name: 'Türkiye', currency_code: 'try', countries: [{ iso_2: 'tr' }] }], count: 1 });
  if (path === '/store/product-categories') return json(res, { product_categories: [category], count: 1 });
  if (path === '/store/site-seo') return json(res, { site_seo: null });
  if (path === '/store/hero-slides') return json(res, { slides: [] });
  if (path === '/store/footer') return json(res, { settings: null, link_groups: [], features: [] });
  if (path === '/store/blog-posts') return json(res, { posts: [], count: 0 });
  if (path === '/store/customers/me') return json(res, { message: 'Unauthorized' }, 401);
  if (path === '/store/shipping-options') return json(res, { shipping_options: [] });
  if (path.endsWith('/reviews')) return json(res, { reviews: [], stats: { count: 0, average: 0, distribution: [] } });
  if (path === '/store/ready-made-suggestions') return json(res, { suggestions: [] });
  if (path === '/store/blade-price/options') return json(res, { blade_types: ['bi-metal'], widths: { 'bi-metal': [27] }, thicknesses_by_width: { 'bi-metal': { 27: [0.9] } }, tree: { 'bi-metal': { 27: { '0.9': ['4/6'] } } } });
  if (path === '/store/blade-price/calculate') { const unit = body.length_mm / 1000 * 100; return json(res, { ...body, length_meter: body.length_mm / 1000, price_per_meter: 100, welding_fee: 90, unit_price: unit, subtotal: unit * body.quantity, total_price: (unit + 90) * body.quantity, currency_code: 'try' }); }
  if (path === '/store/products') {
    let list = products;
    const handle = url.searchParams.get('handle');
    const q = url.searchParams.get('q');
    if (handle) list = list.filter(p => p.handle === handle);
    if (q) list = list.filter(p => p.title.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 20);
    return json(res, { products: list.slice(offset, offset + limit), count: list.length, offset, limit });
  }
  if (path.startsWith('/store/products/')) { const product = products.find(p => p.id === path.split('/').pop()); return product ? json(res, { product }) : json(res, { message: 'Not found' }, 404); }
  if (path === '/store/carts' && req.method === 'POST') {
    const cart = { id: 'cart_' + randomUUID(), currency_code: 'try', region_id: 'reg_fixture', items: [], shipping_methods: [], promotions: [], metadata: {}, ...body };
    carts.set(cart.id, cart); return json(res, { cart: totals(cart) });
  }
  const match = path.match(/^\/store\/carts\/(cart_[^/]+)(?:\/line-items(?:\/([^/]+))?)?$/);
  if (match) {
    const cart = carts.get(match[1]);
    if (!cart) return json(res, { message: 'Cart not found' }, 404);
    if (req.method === 'POST' && path.endsWith('/line-items')) {
      const p = products.find(p => p.variants[0].id === body.variant_id) || products[2];
      cart.items.push({ id: 'item_' + randomUUID(), title: p.title, product_title: p.title, product_id: p.id, variant_id: p.variants[0].id, variant: { ...p.variants[0], product: p }, thumbnail: p.thumbnail, quantity: body.quantity, unit_price: 300, metadata: body.metadata || {} });
    } else if (match[2] && req.method === 'POST') { const item = cart.items.find(i => i.id === match[2]); if (item) item.quantity = body.quantity; }
    else if (match[2] && req.method === 'DELETE') { cart.items = cart.items.filter(i => i.id !== match[2]); return json(res, { id: match[2], object: 'line-item', deleted: true, parent: totals(cart) }); }
    else if (req.method === 'POST') Object.assign(cart, body);
    return json(res, { cart: totals(cart) });
  }
  if (path === '/store/shipping/auto-select') return json(res, { cart: totals(carts.get(body.cart_id) || { items: [] }) });
  return json(res, { message: 'Fixture endpoint not found: ' + path }, 404);
}).listen(9101, '127.0.0.1', () => console.log('Medusa fixture on 9101'));
