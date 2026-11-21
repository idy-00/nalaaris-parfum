import test from 'node:test';
import assert from 'node:assert/strict';
import { base, contexte } from './helpers.mjs';
const { authentifier, verifierJwt } = await import('../server/base.ts');
const { cataloguePublic } = await import('../server/catalogue.ts');
const { onRequest } = await import('../functions/api/admin/_middleware.ts');
const catalogue = await import('../server/admin/catalogue.ts');

test('API admin refuse une requête sans jeton', async () => {
  const r = await onRequest({ request: new Request('https://test.local/api/admin/parfums'), env: {}, data: {}, next: () => { throw new Error('Accès indu'); } });
  assert.equal(r.status, 401);
});
test('auth dev impossible sur une adresse publique ou pour un email hors liste', async () => {
  const env = { DEV_AUTH: '1', ADMIN_EMAILS: 'test@example.com:Test' };
  assert.equal(await authentifier(new Request('https://site.test/api/admin/moi', { headers: { 'X-Dev-Admin': 'test@example.com' } }), env), null);
  assert.equal(await authentifier(new Request('http://localhost/api/admin/moi', { headers: { 'X-Dev-Admin': 'autre@example.com' } }), env), null);
});
test('écritures admin : en-tête dédié et origine identique obligatoires', async () => {
  const env = { DEV_AUTH: '1', ADMIN_EMAILS: 'test@example.com:Test' };
  for (const headers of [{ 'X-Dev-Admin': 'test@example.com' }, { 'X-Dev-Admin': 'test@example.com', 'X-Nalaaris': '1', Origin: 'https://autre.test' }]) {
    const r = await onRequest({ request: new Request('http://localhost/api/admin/parfums', { method: 'POST', headers }), env, data: {}, next: () => { throw new Error('CSRF autorisé'); } });
    assert.equal(r.status, 403);
  }
});
test('JWT : signature, audience, expiration, émetteur et liste email vérifiés', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test' };
  const jeton = async (changes = {}) => {
    const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const message = `${b64({ alg: 'RS256', kid: 'test' })}.${b64({ aud: ['admin'], iss: 'https://equipe.cloudflareaccess.com', exp: Math.floor(Date.now() / 1000) + 300, email: 'test@example.com', ...changes })}`;
    return `${message}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(message))).toString('base64url')}`;
  };
  const config = { aud: 'admin', domaine: 'equipe.cloudflareaccess.com', cles: [jwk] };
  assert.equal(await verifierJwt(await jeton(), config), 'test@example.com');
  for (const changement of [{ aud: ['autre'] }, { exp: 1 }, { iss: 'https://autre.test' }, { nbf: Math.floor(Date.now() / 1000) + 1000 }]) assert.equal(await verifierJwt(await jeton(changement), config), null);
  const valide = await jeton(); const morceaux = valide.split('.'); morceaux[1] = Buffer.from(JSON.stringify({ email: 'pirate@example.com' })).toString('base64url');
  assert.equal(await verifierJwt(morceaux.join('.'), config), null);
});
test('catalogue public ne révèle ni quantités, ni achat, ni données clientes', async () => {
  const b = base(); try {
    for (const complet of [false, true]) {
      const json = JSON.stringify(await cataloguePublic({ DB: b.db }, complet));
      assert.doesNotMatch(json, /prix_achat|client_tel|client_prenom|"stock"|photo_r2/);
    }
  } finally { b.close(); }
});
test('recherche SQL hostile ne modifie pas le catalogue', async () => {
  const b = base(); try {
    const c = contexte(b.db); c.url.searchParams.set('q', "' OR 1=1; DROP TABLE parfums; --");
    await catalogue.lister(c); assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM parfums').get().n, 1);
  } finally { b.close(); }
});
test('visuel en attente : publication forcée refusée côté serveur', async () => {
  const b = base(); try {
    b.sqlite.exec("UPDATE parfums SET statut='visuel_a_creer', masque=1");
    await assert.rejects(catalogue.modifier(contexte(b.db, { masque: false }, { slug: 'test-rose' })), (e) => e.status === 422);
  } finally { b.close(); }
});
