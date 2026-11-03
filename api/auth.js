// Step 1 of the /admin login: send the editor to GitHub to approve access.
// Needs Vercel env vars OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET.
const crypto = require('crypto');

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    return res.end('OAUTH_GITHUB_CLIENT_ID is not set in Vercel environment variables.');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${proto}://${host}/api/callback`,
    scope: process.env.OAUTH_GITHUB_SCOPE || 'repo',
    state
  });
  res.setHeader('Set-Cookie', `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`);
  res.end();
};
