/* ============================================================
 * 访问链接：签名与校验（纯前端，无需联网到 supabase，国内可用）
 * 链接格式： base64url(payload).HMAC_SHA256(base64url(payload), LINK_SECRET)
 *   payload = { e: 过期时间戳(ms), i: 唯一id }
 * 验证时浏览器本地重算签名并比对，再检查有效期；作废查同域 revoked.json。
 * ============================================================ */
window.LinkToken = (function () {
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  async function hmacB64url(msg, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
    let bin = '';
    new Uint8Array(sig).forEach(b => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function makeToken(days, id, secret) {
    const payload = {
      e: Date.now() + days * 86400000,
      i: id || crypto.getRandomValues(new Uint32Array(4)).join('')
    };
    const pB64 = b64urlEncode(JSON.stringify(payload));
    const sig = await hmacB64url(pB64, secret);
    return pB64 + '.' + sig;
  }
  async function verifyToken(token, secret) {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return { ok: false, reason: 'invalid' };
    const pB64 = parts[0], sig = parts[1];
    const exp = await hmacB64url(pB64, secret);
    if (exp !== sig) return { ok: false, reason: 'invalid' };
    let payload;
    try { payload = JSON.parse(b64urlDecode(pB64)); } catch (e) { return { ok: false, reason: 'invalid' }; }
    if (!payload || typeof payload.e !== 'number') return { ok: false, reason: 'invalid' };
    if (payload.e < Date.now()) return { ok: false, reason: 'expired' };
    return { ok: true, id: String(payload.i), exp: payload.e };
  }
  function tokenId(token) {
    try {
      const p = JSON.parse(b64urlDecode(String(token).split('.')[0]));
      return p && p.i != null ? String(p.i) : null;
    } catch (e) { return null; }
  }
  function fullLink(token) {
    const base = location.origin + location.pathname.replace(/admin\.html(\?.*)?$/i, 'index.html');
    return base + '?t=' + token;
  }
  return { makeToken, verifyToken, tokenId, fullLink };
})();
