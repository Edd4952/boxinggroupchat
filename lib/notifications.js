// Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function apiFetch(path, init) {
  // Try relative /api first
  try {
    const res = await fetch(path, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (e) {
    // Fallback to local dev server if available
    try {
      const base = 'http://localhost:4000';
      const url = path.startsWith('/') ? base + path.replace(/^\/api/, '') : base + '/' + path;
      // When falling back, the legacy server expects paths without /api
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e2) {
      throw e2;
    }
  }
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

export async function getPermissionStatus() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'notifications' });
      return status.state; // 'granted' | 'denied' | 'prompt'
    }
  } catch {}
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

async function getOrRegisterServiceWorker() {
  // Register service worker (must exist at the web root)
  return navigator.serviceWorker.register('/sw.js');
}

export async function enablePush() {
  if (!isWebPushSupported()) {
    throw new Error('Push notifications not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission denied');

  const reg = await getOrRegisterServiceWorker();

  // Get public VAPID key from server
  const { key } = await apiFetch('/api/vapidPublicKey').then(r => r.json());
  const appServerKey = urlBase64ToUint8Array(key);

  // Subscribe (userVisibleOnly must be true)
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: appServerKey,
  });

  // Send subscription to server
  await apiFetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return true;
}

export async function disablePush() {
  if (!isWebPushSupported()) return false;
  const reg = await getOrRegisterServiceWorker();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  try {
    await apiFetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {}
  const ok = await sub.unsubscribe();
  return ok;
}

export async function isPushEnabled() {
  if (!isWebPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return !!sub;
}

// Helper to send a chat-like push via local server for testing.
export async function sendChatPush({ from = 'Someone', text = 'New message', chatUrl = '/' , excludeSelf = true } = {}) {
  if (!isWebPushSupported()) throw new Error('Web Push not supported');
  let excludeEndpoints = [];
  if (excludeSelf) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) excludeEndpoints.push(sub.endpoint);
  }
  const payload = {
    title: `New message from ${from}`,
    body: text,
    url: chatUrl,
  };
  await apiFetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, excludeEndpoints }),
  });
}
