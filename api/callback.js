// Step 2 of the /admin login: GitHub sends the editor back here with a code.
// We swap it for an access token and hand it to the Decap CMS window that opened this popup.
module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;
  const url = new URL(req.url, origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = (req.headers.cookie || '').match(/(?:^|;\s*)decap_oauth_state=([a-f0-9]+)/);

  let status = 'error';
  let content = { message: 'Login failed.' };

  try {
    if (!code) throw new Error('GitHub did not return a code.');
    if (!cookie || cookie[1] !== state) throw new Error('Login state did not match. Please try again.');
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
        client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${origin}/api/callback`
      })
    });
    const data = await r.json();
    if (!data.access_token) throw new Error(data.error_description || 'No access token returned.');
    status = 'success';
    content = { token: data.access_token, provider: 'github' };
  } catch (err) {
    content = { message: err.message };
  }

  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`).replace(/</g, '\\u003c');
  const expected = JSON.stringify(origin);
  res.setHeader('Set-Cookie', 'decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html><body><p>${status === 'success' ? 'Logged in. You can close this window.' : 'Login failed. Close this window and try again.'}</p>
<script>
(function () {
  var expected = ${expected};
  function receive(e) {
    if (e.origin !== expected) return;
    window.opener.postMessage(${message}, e.origin);
    window.removeEventListener('message', receive, false);
  }
  window.addEventListener('message', receive, false);
  if (window.opener) window.opener.postMessage('authorizing:github', expected);
})();
</script></body></html>`);
};
