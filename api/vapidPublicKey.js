const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;

module.exports = async (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(500).json({ error: 'VAPID_PUBLIC_KEY not configured' });
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ key: VAPID_PUBLIC_KEY });
};