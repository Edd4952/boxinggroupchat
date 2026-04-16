const webpush = require('web-push');
const { getSupabaseAdmin } = require('./_supabase');

function ensureVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!pub || !priv) throw new Error('Missing VAPID keys');
  webpush.setVapidDetails(subject, pub, priv);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    ensureVapid();
    const { title, body: msgBody, icon, url, excludeEndpoints } = req.body || {};
    const payload = JSON.stringify({
      title: title || 'New notification',
      body: msgBody || '',
      icon: icon || '/icons/icon-192.png',
      url: url || '/',
    });

    const supabase = getSupabaseAdmin();
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;
    const exclude = Array.isArray(excludeEndpoints) ? new Set(excludeEndpoints) : null;

    const results = [];
    for (const s of subs) {
      if (exclude && exclude.has(s.endpoint)) continue;
      const sub = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(sub, payload);
        results.push({ endpoint: s.endpoint, ok: true });
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
        results.push({ endpoint: s.endpoint, ok: false, error: e.message });
      }
    }
    res.json({ sent: results.length, results });
  } catch (e) {
    console.error('notify error', e);
    res.status(500).json({ error: e.message || 'notify failed' });
  }
};