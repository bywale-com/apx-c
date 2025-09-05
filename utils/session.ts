const KEY = 'chat-session-id';

// Simple fallback UUID generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback if crypto.randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''; // avoid SSR crash

  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = generateUUID();
    localStorage.setItem(KEY, sid);
  }
  return sid;
}
