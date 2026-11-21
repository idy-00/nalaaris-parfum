import test from 'node:test';
import assert from 'node:assert/strict';
import { base, contexte, vente } from './helpers.mjs';
const cat = await import('../server/admin/catalogue.ts');
const divers = await import('../server/admin/divers.ts');
const ventes = await import('../server/admin/ventes.ts');
const { onRequestPost: prevenir } = await import('../functions/api/public/prevenir.ts');

test('prix et stock sauvegardés avec ancienne et nouvelle valeur au journal', async () => {
  const b = base(); try {
    const c = await (await cat.ecrireContenance(contexte(b.db, { prix_vente: 27000, stock: 4 }, { slug: 'test-rose', ml: '100' }))).json();
    assert.equal(c.prix_vente, 27000); assert.equal(c.stock, 4);
    const log = b.sqlite.prepare("SELECT avant, apres FROM journal WHERE champ = 'prix_vente'").get();
    assert.deepEqual({ ...log }, { avant: '25000', apres: '27000' });
  } finally { b.close(); }
});
test('création de parfum masquée tant que son visuel studio est absent', async () => {
  const b = base(); try {
    const r = await (await cat.creer(contexte(b.db, { marque: 'TEST', nom: 'Nouveau', categorie: 'unisexe', notes: 'rose, vanille' }))).json();
    const p = b.sqlite.prepare('SELECT masque, statut FROM parfums WHERE slug = ?').get(r.slug);
    assert.equal(p.masque, 1); assert.equal(p.statut, 'visuel_a_creer');
  } finally { b.close(); }
});
test('avis : accord obligatoire et date réelle obligatoire', async () => {
  const b = base(); try {
    const a = { prenom: 'TEST', texte: 'Avis de test', date_avis: '2025-02-28', accord_cliente: true, publie: false };
    await assert.rejects(divers.creerAvis(contexte(b.db, { ...a, accord_cliente: false })), (e) => e.status === 422);
    await assert.rejects(divers.creerAvis(contexte(b.db, { ...a, date_avis: '2025-02-31' })), (e) => e.status === 422);
    const r = await (await divers.creerAvis(contexte(b.db, a))).json(); assert.equal(r.length, 1);
  } finally { b.close(); }
});
test('boutique : enregistrement et validation des zones et du téléphone', async () => {
  const b = base(); try {
    const r = await (await divers.ecrireReglages(contexte(b.db, { whatsapp: '77 123 45 67', paiements: ['wave'], retrait: true, zones: [{ nom: 'TEST Dakar', frais: 1000, delai: '24 h' }] }))).json();
    assert.equal(r.whatsapp, '221771234567'); assert.equal(r.zones[0].frais, 1000);
    await assert.rejects(divers.ecrireReglages(contexte(b.db, { whatsapp: 'incorrect' })), (e) => e.status === 422);
  } finally { b.close(); }
});
test('un format vendu ne peut pas être supprimé au détriment de son stock', async () => {
  const b = base(); try {
    await ventes.creer(contexte(b.db, vente()));
    await assert.rejects(cat.supprimerContenance(contexte(b.db, {}, { slug: 'test-rose', ml: '100' })), /contenance_utilisee/);
  } finally { b.close(); }
});
test('alerte volontaire : enregistrement, dédoublonnage et origine étrangère refusée', async () => {
  const b = base(); try {
    const req = () => new Request('https://test.local/api/public/prevenir', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Origin: 'https://test.local' }, body: JSON.stringify({ slug: 'test-rose', ml: 100, telephone: '771234567' }) });
    assert.equal((await prevenir({ request: req(), env: { DB: b.db } })).status, 200);
    assert.equal((await prevenir({ request: req(), env: { DB: b.db } })).status, 200);
    assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM alertes_stock').get().n, 1);
    const autre = req(); autre.headers.set('Origin', 'https://autre.test');
    assert.equal((await prevenir({ request: autre, env: { DB: b.db } })).status, 403);
  } finally { b.close(); }
});
