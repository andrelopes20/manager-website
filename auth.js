/* ==========================================================
 * auth.js — login do admin e tokens temporários assinados
 *
 * Token = nonce.assinatura, onde assinatura = HMAC-SHA256(TOKEN_SECRET, nonce + "." + exp).
 * Como é assinado, o convidado não consegue alterar "exp" na URL sem invalidar o token,
 * e não é preciso guardar nada no servidor (funciona em GitHub Pages/Vercel).
 * Requer HTTPS ou localhost (Web Crypto não existe em contextos inseguros).
 * ========================================================== */
const Auth = (() => {
  const SESSION_KEY = 'dash.admin.session';
  const enc = new TextEncoder();
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

  async function sha256(text) {
    return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
  }

  async function sign(message) {
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(CONFIG.TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message))).slice(0, 40);
  }

  /** Comparação em tempo constante. */
  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // ---------- Admin ----------
  async function loginAdmin(user, pass) {
    const okUser = safeEqual(user, CONFIG.ADMIN_USER);
    const okPass = safeEqual(await sha256(pass), CONFIG.ADMIN_PASS_SHA256);
    if (okUser && okPass) { sessionStorage.setItem(SESSION_KEY, '1'); return true; }
    return false;
  }
  const isAdminSession = () => sessionStorage.getItem(SESSION_KEY) === '1';
  const logout = () => sessionStorage.removeItem(SESSION_KEY);

  // ---------- Tokens temporários ----------
  /** Gera a URL de acesso (?token=...&exp=...). Chame apenas com o admin logado. */
  async function createShareLink(minutes) {
    const nonce = hex(crypto.getRandomValues(new Uint8Array(8)));
    const exp = Date.now() + minutes * 60000;
    const token = nonce + '.' + await sign(nonce + '.' + exp);
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('token', token);
    url.searchParams.set('exp', String(exp));
    return { url: url.toString(), exp };
  }

  /** Valida assinatura + expiração. Retorna { ok, reason }. */
  async function verifyToken(token, exp) {
    const expNum = Number(exp);
    const bad = { ok: false, reason: 'Link inválido.' };
    if (!token || !Number.isFinite(expNum)) return bad;
    const [nonce, sig] = token.split('.');
    if (!nonce || !sig) return bad;
    if (!safeEqual(sig, await sign(nonce + '.' + expNum))) return bad;
    if (Date.now() > expNum) return { ok: false, reason: 'Este link expirou. Peça um novo ao administrador.' };
    return { ok: true };
  }

  return { loginAdmin, isAdminSession, logout, createShareLink, verifyToken };
})();
