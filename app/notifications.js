// Re-export web push utilities from lib so existing imports won't break.
export { disablePush, enablePush, getPermissionStatus, isPushEnabled, isWebPushSupported } from '../lib/notifications';

// Default export to satisfy Expo Router's requirement for files under app/.
export default function NotificationsRoutePlaceholder() {
  return null;
}