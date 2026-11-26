import test from 'node:test';
import assert from 'node:assert/strict';
import {base,contexte,vente} from './helpers.mjs';
const cat=await import('../server/admin/catalogue.ts');
const ven=await import('../server/admin/ventes.ts');
const {cataloguePublic}=await import('../server/catalogue.ts');
const {accueil}=await import('../server/admin/tableau.ts');
const {trouverRoute}=await import('../server/admin/routes.ts');
const {onRequestGet:sitemap}=await import('../functions/sitemap.xml.ts');

test('supprimer retire le parfum des listes, compteurs, site et sitemap sans redéploiement',async()=>{
 const b=base();try{
  const r=await cat.supprimer(contexte(b.db,{}, {slug:'test-rose'}));assert.equal(r.status,200);
  const liste=await(await cat.lister(contexte(b.db))).json();assert.equal(liste.parfums.length,0);assert.equal(liste.compteurs.total,0);assert.deepEqual(liste.marques,[]);
  assert.equal((await cataloguePublic({DB:b.db},true)).parfums['test-rose'],undefined);
  assert.equal((await cataloguePublic({DB:b.db},false)).p['test-rose'],undefined);
  const plan=await sitemap({request:new Request('https://test.local/sitemap.xml'),env:{DB:b.db}});assert.doesNotMatch(await plan.text(),/test-rose/);
  assert.equal((await(await accueil(contexte(b.db))).json()).catalogue.total,0);
  await assert.rejects(cat.lire(contexte(b.db,{}, {slug:'test-rose'})),e=>e.status===404);
  await assert.rejects(cat.modifier(contexte(b.db,{masque:false},{slug:'test-rose'})),e=>e.status===404);
  await assert.rejects(cat.ecrireContenance(contexte(b.db,{stock:8},{slug:'test-rose',ml:'100'})),e=>e.status===404);
  assert.equal(b.sqlite.prepare("SELECT count(*) AS n FROM journal WHERE action='supprimer' AND entite='parfum'").get().n,1);
  // Même un ancien client concurrent qui remet masque à zéro ne doit pas le republier.
  b.sqlite.prepare("UPDATE parfums SET masque=0 WHERE slug='test-rose'").run();assert.equal((await cataloguePublic({DB:b.db},true)).parfums['test-rose'],undefined);
 }finally{b.close();}
});

test('supprimer un parfum vendu préserve la vente, son édition et son annulation',async()=>{
 const b=base();try{
  const v=await(await ven.creer(contexte(b.db,vente(2)))).json();
  await cat.supprimer(contexte(b.db,{}, {slug:'test-rose'}));
  assert.equal(b.sqlite.prepare("SELECT stock FROM contenances WHERE slug='test-rose'").get().stock,3);
  const detail=await(await ven.lire(contexte(b.db,{}, {id:String(v.id)}))).json();assert.equal(detail.total,50000);assert.equal(detail.lignes[0].nom,'Rose');
  await assert.rejects(ven.creer(contexte(b.db,vente())),e=>e.status===409);
  await assert.rejects(ven.modifier(contexte(b.db,{lignes:vente(3).lignes},{id:String(v.id)})),e=>e.status===409);
  await ven.modifier(contexte(b.db,{lignes:vente(2).lignes,paiement:'especes'},{id:String(v.id)}));
  await ven.annuler(contexte(b.db,{}, {id:String(v.id)}));
  assert.equal(b.sqlite.prepare("SELECT stock FROM contenances WHERE slug='test-rose'").get().stock,5);
  assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM ventes').get().n,1);
 }finally{b.close();}
});

test('suppression inconnue refusée et route DELETE spécifique enregistrée',async()=>{
 const b=base();try{
  await assert.rejects(cat.supprimer(contexte(b.db,{}, {slug:'inconnu'})),e=>e.status===404);
  assert.equal(b.sqlite.prepare('SELECT count(*) AS n FROM reglages').get().n,0);
  assert.equal(trouverRoute('DELETE',['parfums','test-rose']).handler,cat.supprimer);
 }finally{b.close();}
});

test('une photo envoyée par un ancien formulaire est bien reliée au parfum créé',async()=>{
 const {ajouterImage}=await import('../server/images.ts');const b=base();try{
  const u=await(await ajouterImage(new Request('https://test.local/api/admin/photos?slug=test-photo',{method:'POST',body:new Uint8Array([255,216,255,224])}),{DB:b.db})).json();
  const {slug}=await(await cat.creer(contexte(b.db,{marque:'Test',nom:'Photo conservée',categorie:'unisexe',photo_r2:u.cle}))).json();
  assert.deepEqual((await cataloguePublic({DB:b.db},true)).parfums[slug].images,[u.url]);
 }finally{b.close();}
});
