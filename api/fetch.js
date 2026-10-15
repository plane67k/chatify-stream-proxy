export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send('missing url');

  const referer = req.query.ref || '';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (referer) {
    headers['Referer'] = referer;
    try { headers['Origin'] = new URL(referer).origin; } catch {}
  }

  try {
    const r = await fetch(target, { headers, redirect: 'follow' });
    const body = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'text/plain');
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).send('proxy error: ' + e.message);
  }
}
