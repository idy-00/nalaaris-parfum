import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import './helpers.mjs';
const { creerSession, lireSession, verifierMotDePasse, cookieSession } = await import('../server/session.ts');
const { authentifier } = await import('../server/base.ts');
const { onRequestPost: login } = await import('../functions/api/auth/login.ts');
const { onRequestPost: logout } = await import('../functions/api/auth/logout.ts');
const hash = (password) => `pbkdf2_sha256$100000$${Buffer.from('sel-de-test-uniquement').toString('base64url')}$${pbkdf2Sync(password, 'sel-de-test-uniquement', 100000, 32, 'sha256').toString('base64url')}`;
const password = 'Mot-de-passe-TEST!';
const env = { ADMIN_PASSWORD_HASH: hash(password), ADMIN_SESSION_SECRET: 'secret-de-test-uniquement-32-caracteres', ADMIN_USERNAME: 'admin' };
const req = (body, headers = {}) => new Request('https://test.local/api/auth/login', {method:'POST',headers:{Origin:'https://test.local','X-Nalaaris':'1','Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('mot de passe vérifié par dérivation, incorrect ou hash malformé refusé', async()=>{
  assert.equal(await verifierMotDePasse(password,env.ADMIN_PASSWORD_HASH),true);
  assert.equal(await verifierMotDePasse('incorrect',env.ADMIN_PASSWORD_HASH),false);
  assert.equal(await verifierMotDePasse(password,'valeur-invalide'),false);
});
test('connexion correcte fournit une session HttpOnly Secure SameSite et accès aux API',async()=>{
  const r=await login({request:req({identifiant:'admin',motDePasse:password},{'CF-Connecting-IP':'192.0.2.1'}),env});
  assert.equal(r.status,200);
  const cookie=r.headers.get('Set-Cookie');
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
  assert.equal((await authentifier(new Request('https://test.local/api/admin/moi',{headers:{Cookie:cookie}}),env)).prenom,'Admin');
});
test('session falsifiée ou signée avec un autre secret refusée',async()=>{
  const token=await creerSession(env);
  assert.equal(await lireSession(new Request('https://test.local',{headers:{Cookie:`nalaaris_session=${token}x`}}),env),null);
  assert.equal(await lireSession(new Request('https://test.local',{headers:{Cookie:`nalaaris_session=${token}`}}),{...env,ADMIN_SESSION_SECRET:'autre-secret-de-test-32-caracteres'}),null);
});
test('changement de mot de passe invalide les anciennes sessions',async()=>{
  const token=await creerSession(env);
  assert.equal(await lireSession(new Request('https://test.local',{headers:{Cookie:`nalaaris_session=${token}`}}),{...env,ADMIN_PASSWORD_HASH:hash('nouveau-mot-de-passe')}),null);
});
test('mode mot de passe désactive le contournement de développement',async()=>{
  assert.equal(await authentifier(new Request('http://localhost/api/admin/moi',{headers:{'X-Dev-Admin':'test@example.com'}}),{...env,DEV_AUTH:'1',ADMIN_EMAILS:'test@example.com:Test'}),null);
});
test('identifiants incorrects refusés et tentative intersite bloquée',async()=>{
  assert.equal((await login({request:req({identifiant:'admin',motDePasse:'incorrect'},{'CF-Connecting-IP':'192.0.2.2'}),env})).status,401);
  assert.equal((await login({request:req({identifiant:'admin',motDePasse:password},{Origin:'https://autre.test'}),env})).status,403);
});
test('déconnexion efface le cookie ; configuration absente ne donne aucun accès',async()=>{
  const r=await logout({request:req({}),env});assert.match(r.headers.get('Set-Cookie'),/Max-Age=0/);
  assert.equal(await lireSession(new Request('https://test.local'),{}),null);
  assert.equal((await login({request:req({identifiant:'admin',motDePasse:password}),env:{}})).status,503);
  assert.doesNotMatch(cookieSession(new Request('http://localhost'),'test'),/; Secure/);
});
test('limitation des tentatives de connexion',async()=>{
  let r;for(let i=0;i<6;i++)r=await login({request:req({identifiant:'admin',motDePasse:'incorrect'},{'CF-Connecting-IP':'192.0.2.99'}),env});
  assert.equal(r.status,429);
});
