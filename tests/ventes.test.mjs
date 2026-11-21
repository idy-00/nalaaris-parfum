import test from 'node:test';
import assert from 'node:assert/strict';
import { base, contexte, vente } from './helpers.mjs';
const api = await import('../server/admin/ventes.ts');
const stock = (b) => b.sqlite.prepare('SELECT stock FROM contenances').get().stock;

test('vente et lignes atomiques, stock décrémenté, total et identifiant corrects', async () => {
  const b = base(); try {
    const r = await (await api.creer(contexte(b.db, vente(2)))).json();
    assert.equal(r.id, 1); assert.equal(r.total, 50000); assert.equal(stock(b), 3);
    assert.equal(r.lignes[0].prix_achat_unitaire, 10000);
  } finally { b.close(); }
});
test('stock insuffisant : aucune vente, ligne ou journal conservé', async () => {
  const b = base(); try {
    await assert.rejects(api.creer(contexte(b.db, vente(6))), (e) => e.status === 409);
    assert.equal(stock(b), 5); assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM ventes').get().n, 0);
    assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM lignes_vente').get().n, 0);
    assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM journal').get().n, 0);
  } finally { b.close(); }
});
test('contenance inexistante refusée sans effet sur les ventes', async () => {
  const b = base(); try {
    const v = vente(); v.lignes[0].ml = 50;
    await assert.rejects(api.creer(contexte(b.db, v)), (e) => e.status === 422);
    assert.equal(stock(b), 5);
  } finally { b.close(); }
});
test('quantités dupliquées regroupées et plafond de 50 contrôlé', async () => {
  const b = base(); try {
    const v = vente(30); v.lignes.push({ ...v.lignes[0] });
    await assert.rejects(api.creer(contexte(b.db, v)), (e) => e.status === 422);
  } finally { b.close(); }
});
test('stock non suivi reste NULL après vente et annulation', async () => {
  const b = base(); try {
    b.sqlite.exec('UPDATE contenances SET stock = NULL');
    const v = await (await api.creer(contexte(b.db, vente()))).json();
    await api.annuler(contexte(b.db, {}, { id: String(v.id) })); assert.equal(stock(b), null);
  } finally { b.close(); }
});
test('double annulation simultanée : stock restitué une seule fois', async () => {
  const b = base(); try {
    const v = await (await api.creer(contexte(b.db, vente(2)))).json();
    await Promise.all([api.annuler(contexte(b.db, {}, { id: String(v.id) })), api.annuler(contexte(b.db, {}, { id: String(v.id) }))]);
    assert.equal(stock(b), 5);
  } finally { b.close(); }
});
test('modifications simultanées : stock final conforme aux lignes réellement conservées', async () => {
  const b = base(); try {
    const v = await (await api.creer(contexte(b.db, vente()))).json();
    await Promise.all([api.modifier(contexte(b.db, { lignes: vente(2).lignes }, { id: String(v.id) })), api.modifier(contexte(b.db, { lignes: vente(3).lignes }, { id: String(v.id) }))]);
    const q = b.sqlite.prepare('SELECT sum(quantite) AS n FROM lignes_vente').get().n;
    assert.equal(stock(b), 5 - q);
  } finally { b.close(); }
});
test('modification conserve le coût historique malgré une mise à jour du prix d’achat', async () => {
  const b = base(); try {
    const v = await (await api.creer(contexte(b.db, vente()))).json();
    b.sqlite.exec('UPDATE contenances SET prix_achat = 12000');
    const r = await (await api.modifier(contexte(b.db, { lignes: vente(2).lignes }, { id: String(v.id) }))).json();
    assert.equal(r.lignes[0].prix_achat_unitaire, 10000); assert.equal(stock(b), 3);
  } finally { b.close(); }
});
test('une vente annulée ne se modifie plus', async () => {
  const b = base(); try {
    const v = await (await api.creer(contexte(b.db, vente()))).json();
    await api.annuler(contexte(b.db, {}, { id: String(v.id) }));
    await assert.rejects(api.modifier(contexte(b.db, { lignes: vente(2).lignes }, { id: String(v.id) })), (e) => e.status === 409);
    assert.equal(stock(b), 5);
  } finally { b.close(); }
});
test('anonymisation efface les coordonnées, notes et anciennes valeurs du journal', async () => {
  const b = base(); try {
    const v = await (await api.creer(contexte(b.db, { ...vente(), date_vente: '2024-01-02T12:00:00Z', client_prenom: 'Prive', client_tel: '771234567', note: 'Domicile privé' }))).json();
    await api.modifier(contexte(b.db, { client_tel: '781234567' }, { id: String(v.id) }));
    await api.anonymiser(contexte(b.db));
    const r = b.sqlite.prepare('SELECT * FROM ventes').get();
    assert.equal(r.client_prenom, null); assert.equal(r.client_tel, null); assert.equal(r.note, null);
    assert.equal(b.sqlite.prepare("SELECT count(*) AS n FROM journal WHERE entite = 'vente' AND (avant IS NOT NULL OR apres IS NOT NULL)").get().n, 0);
  } finally { b.close(); }
});
