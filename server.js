const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// TODO: move to env vars in production
const VAPID_PUBLIC_KEY = 'BDkiF_e7m5BHovOdAqqF4QMAaUk-nCiRJWd3cozAeJPVhhkpJ4PIq2MiTruo8dXV9tFglUTVtlcNZswd-K8_lw0';
const VAPID_PRIVATE_KEY = 'JJbW7LBD3zPIpD-DcDi2XANYb7mFho5_RCk8sI98i4U';
const SUBJECT = 'mailto:you@example.com';

webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// In-memory store for demo; replace with DB
const subscriptions = new Map();

// Public key endpoint so client can fetch it
app.get('/vapidPublicKey', (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

// Save subscription from client
app.post('/subscribe', (req, res) => {
  const sub = req.body; // {endpoint, keys:{p256dh, auth}, ...}
  subscriptions.set(sub.endpoint, sub);
  res.status(201).json({ ok: true });
});

// Optional: Unsubscribe
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions.delete(endpoint);
  res.json({ ok: true });
});

// Send a test notification to all subscribers
app.post('/notify', async (req, res) => {
  // Accept optional custom payload and exclusion list
  const { title, body: msgBody, icon, url, excludeEndpoints } = req.body || {};
  const payload = JSON.stringify({
    title: title || 'Hello from Web Push',
    body: msgBody || 'This is a test message ✨',
    icon: icon || '/icons/icon-192.png',
    url: url || '/',
  });

  const exclude = Array.isArray(excludeEndpoints) ? new Set(excludeEndpoints) : null;
  const results = [];
  for (const sub of subscriptions.values()) {
    if (exclude && exclude.has(sub.endpoint)) continue;
    try {
      await webpush.sendNotification(sub, payload);
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (e) {
      // Remove expired/invalid subscriptions
      if (e.statusCode === 404 || e.statusCode === 410) {
        subscriptions.delete(sub.endpoint);
      }
      results.push({ endpoint: sub.endpoint, ok: false, error: e.message });
    }
  }
  res.json({ sent: results.length, results });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Push server listening on http://localhost:${PORT}`));