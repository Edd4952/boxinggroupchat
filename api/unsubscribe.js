const { getSupabaseAdmin } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' });
      return;
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('unsubscribe error', e);
    res.status(500).json({ error: e.message || 'unsubscribe failed' });
  }
};