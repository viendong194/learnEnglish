// Xác thực đơn giản 1 người dùng: username/password lấy từ biến môi trường,
// phiên đăng nhập là 1 cookie HMAC-signed (không cần database).
// Dùng Web Crypto (global `crypto`) để chạy được cả trên Edge Runtime (middleware) lẫn Node.js (API routes).

export const SESSION_COOKIE = 'app_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(signature);
}

export async function createSessionToken() {
  const secret = process.env.APP_PASSWORD;
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const signature = await sign(secret, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(token) {
  const secret = process.env.APP_PASSWORD;
  if (!token || !secret) return false;

  const [expiresAtStr, signature] = token.split('.');
  if (!expiresAtStr || !signature) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = await sign(secret, expiresAtStr);
  return expected === signature;
}
