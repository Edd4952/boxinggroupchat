const { getSupabaseAdmin } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const sub = req.body; // PushSubscription JSON
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      res.status(400).json({ error: 'Invalid subscription' });
      return;
    }
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      created_at: now,
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('subscribe error', e);
    res.status(500).json({ error: e.message || 'subscribe failed' });
  }
};