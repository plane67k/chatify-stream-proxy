const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('missing url');

  const referer = req.query.ref || '';

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return res.status(400).send('invalid url: ' + e.message);
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'close'
  };
  if (referer) {
    headers['Referer'] = referer;
    try { headers['Origin'] = new URL(referer).origin; } catch (e) {}
  }

  try {
    const result = await fetchWithRedirects(targetUrl, headers, 5);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', result.contentType || 'text/plain; charset=utf-8');
    res.status(result.status).send(result.body);
  } catch (err) {
    res.status(502).send('proxy error: ' + err.message + ' | code: ' + (err.code || 'n/a'));
  }
};

function fetchWithRedirects(url, headers, maxHops) {
  return new Promise((resolve, reject) => {
    if (maxHops <= 0) return reject(new Error('too many redirects'));

    const lib = url.protocol === 'http:' ? http : https;
    const opts = {
      method: 'GET',
      headers,
      timeout: 20000,
      rejectUnauthorized: false // tolerate cert issues that browsers accept
    };

    const req = lib.request(url, opts, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let next;
        try { next = new URL(response.headers.location, url); } catch (e) {
          return reject(new Error('bad redirect target'));
        }
        response.resume(); // discard body
        return fetchWithRedirects(next, headers, maxHops - 1).then(resolve).catch(reject);
      }

      const chunks = [];
      response.on('data', (c) => chunks.push(c));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          contentType: response.headers['content-type'],
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
      response.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout after 20s'));
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}
