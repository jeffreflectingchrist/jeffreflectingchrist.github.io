// Cloudflare Pages Function: POST /api/give
// Makes a Stripe Checkout page for the amount, currency and frequency the donor chose.
//
// Needs, in Cloudflare Pages > Settings > Variables and Secrets (Production):
//   STRIPE_SECRET_KEY  (type: Secret)  your Stripe secret key, sk_live_...

// Smallest gift per currency, before any fee cover (in the currency's main unit).
const CURRENCIES = { myr: 10, sgd: 10, aud: 10 };
// Extra the donor can choose to add to cover Stripe's transaction costs.
const FEE_COVER = 0.04;
const MAX = 100000;

// Frequency -> Stripe recurring setting (null = one-off).
const FREQS = {
  oneoff: null,
  monthly: { interval: 'month', interval_count: 1 },
  quarterly: { interval: 'month', interval_count: 3 },
  yearly: { interval: 'year', interval_count: 1 },
};

// The Stripe products each gift is recorded under (made 13 Nov 2026).
const PRODUCTS = {
  oneoff: 'prod_VcTyKpbvaU4RfK',    // One-off gift 一次支持
  monthly: 'prod_VcU2XfQ1Dp5wvg',   // Monthly gift 每月支持
  quarterly: 'prod_VcTzWyAxkSsIYD', // Quarterly gift 每季支持
  yearly: 'prod_VcU1BlYSjqlrL0',    // Yearly gift 每年支持
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'not-configured' }, 500);

  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }

  const currency = String(input.currency || '').toLowerCase();
  const freq = String(input.freq || '');
  const amount = Math.round(Number(input.amount) * 100) / 100;
  const cover = input.cover === true;
  const lang = input.lang === 'en' ? 'en' : 'zh';

  if (!(currency in CURRENCIES)) return json({ error: 'currency' }, 400);
  if (!(freq in FREQS)) return json({ error: 'freq' }, 400);
  if (!Number.isFinite(amount) || amount < CURRENCIES[currency] || amount > MAX) {
    return json({ error: 'amount', min: CURRENCIES[currency], max: MAX }, 400);
  }

  // The total is worked out here, not trusted from the page.
  const baseCents = Math.round(amount * 100);
  const totalCents = cover ? Math.round(baseCents * (1 + FEE_COVER)) : baseCents;

  const origin = new URL(request.url).origin;
  const page = lang === 'en' ? '/en/donate/' : '/donate/';
  const recurring = FREQS[freq];

  const p = new URLSearchParams();
  p.set('mode', recurring ? 'subscription' : 'payment');
  p.set('success_url', `${origin}${page}?thanks=1#support`);
  p.set('cancel_url', `${origin}${page}#support`);
  p.set('locale', lang === 'en' ? 'en' : 'zh');
  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', currency);
  p.set('line_items[0][price_data][unit_amount]', String(totalCents));
  p.set('line_items[0][price_data][product]', PRODUCTS[freq]);
  if (recurring) {
    p.set('line_items[0][price_data][recurring][interval]', recurring.interval);
    p.set('line_items[0][price_data][recurring][interval_count]', String(recurring.interval_count));
  } else {
    p.set('submit_type', 'donate');
    p.set('customer_creation', 'always');
  }
  p.set('metadata[frequency]', freq);
  p.set('metadata[gift_amount]', (baseCents / 100).toFixed(2));
  p.set('metadata[covers_fees]', cover ? 'yes' : 'no');
  if (recurring) {
    p.set('subscription_data[metadata][frequency]', freq);
    p.set('subscription_data[metadata][gift_amount]', (baseCents / 100).toFixed(2));
    p.set('subscription_data[metadata][covers_fees]', cover ? 'yes' : 'no');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: p,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    console.log('Stripe error', JSON.stringify(data.error || data));
    return json({ error: 'stripe' }, 502);
  }
  return json({ url: data.url });
}
