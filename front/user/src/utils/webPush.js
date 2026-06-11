import OneSignal from 'react-onesignal';

export function getPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPushPermission() {
  try {
    await OneSignal.Notifications.requestPermission();
  } catch (_) {}
  return Notification.permission;
}

export async function registerPushSubscription() {
  try {
    await OneSignal.User.PushSubscription.optIn();
    // Return the subscription ID so the caller can sync it with the backend.
    return OneSignal.User.PushSubscription.id ?? null;
  } catch (_) {
    return null;
  }
}

export async function unregisterPushSubscription() {
  try {
    await OneSignal.User.PushSubscription.optOut();
  } catch (_) {}
}

/* Émet un event custom pour les toasts in-app */
export function dispatchInAppNotification(title, body, type = 'info') {
  window.dispatchEvent(
    new CustomEvent('boileau:notify', { detail: { title, body, type } })
  );
}
