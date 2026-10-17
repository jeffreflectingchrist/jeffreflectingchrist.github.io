// Temporary check: can this server read each Substack? Visit /api/ping to see the answer.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  accept: 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8',
};

async function probe(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    return { url, status: res.status, ok: res.ok, length: text.length, start: text.slice(0, 80).replace(/\s+/g, ' ') };
  } catch (err) {
    return { url, error: String(err && err.message ? err.message : err) };
  }
}

export async function onRequest() {
  const results = await Promise.all([
    probe('https://jeffreflectingchrist.substack.com/api/v1/archive?sort=new&limit=5&offset=0'),
    probe('https://jeffreflectingchrist.substack.com/feed'),
    probe('https://huiyingjidu.substack.com/api/v1/archive?sort=new&limit=5&offset=0'),
    probe('https://huiyingjidu.substack.com/feed'),
  ]);
  return new Response(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
