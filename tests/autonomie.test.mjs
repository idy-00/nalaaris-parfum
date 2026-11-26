import test from 'node:test';
import assert from 'node:assert/strict';
import {base,contexte,vente} from './helpers.mjs';
const cat=await import('../server/admin/catalogue.ts');
const {cataloguePublic}=await import('../server/catalogue.ts');
const {ajouterImage,servirImage}=await import('../server/images.ts');
const {fusionnerCatalogue}=await import('../src/lib/catalogue-donnees.ts');
const {onRequestGet:fiche}=await import('../functions/parfum/[slug].ts');
const {creer:creerVente}=await import('../server/admin/ventes.ts');
const produit=()=>({marque:'Ma marque',nom:'Mon parfum',categorie:'femme',description:'Ma description personnelle.',styles:['fleuri','doux'],notes:{tete:['Rose'],coeur:['Jasmin'],fond:['Musc']},ingredients:['Rose','Jasmin'],nouveau:true,coup_de_coeur:true,contenances:[{ml:50,prix_vente:15000,prix_achat:5000,stock:7,seuil_alerte:2,dispo_force:null}]});
test('création complète, nouvelle marque et publication sans développeur',async()=>{
 const b=base();try{
  const {slug}=await(await cat.creer(contexte(b.db,produit()))).json();
  const d=await cataloguePublic({DB:b.db},true),p=d.parfums[slug];
  assert.equal(d.complet,true);assert.equal(p.marque,'Ma marque');assert.equal(p.nom,'Mon parfum');assert.deepEqual(p.notes,{tete:['Rose'],coeur:['Jasmin'],fond:['Musc']});
  assert.equal(p.description,produit().description);assert.equal(p.contenances[0].prix,15000);assert.equal(p.nouveau,true);assert.doesNotMatch(JSON.stringify(d),/prix_achat|"stock"/);
  await cat.modifier(contexte(b.db,{masque:true},{slug}));assert.equal((await cataloguePublic({DB:b.db},true)).parfums[slug],undefined);
  await cat.modifier(contexte(b.db,{masque:false,marque:'Autre marque',description:'Texte modifié'},{slug}));assert.equal((await cataloguePublic({DB:b.db},true)).parfums[slug].marque,'Autre marque');
 }finally{b.close();}
});
test('brouillon créé volontairement absent de toutes les réponses publiques',async()=>{
 const b=base();try{
  const {slug}=await(await cat.creer(contexte(b.db,{...produit(),masque:true}))).json();
  assert.equal((await cataloguePublic({DB:b.db},true)).parfums[slug],undefined);assert.equal((await cataloguePublic({DB:b.db},false)).p[slug],undefined);
 }finally{b.close();}
});
test('catalogue importé entièrement modifiable, formats atomiques et stock historique protégé',async()=>{
 const b=base();try{
  await cat.modifier(contexte(b.db,{...produit(),nom_public:null},{slug:'test-rose'}));
  const p=await(await cat.lire(contexte(b.db,{}, {slug:'test-rose'}))).json();assert.equal(p.marque,'Ma marque');assert.equal(p.nom,'Mon parfum');assert.equal(p.contenances.length,1);assert.equal(p.contenances[0].ml,50);
  await assert.rejects(cat.modifier(contexte(b.db,{nom:'Ne doit pas changer',contenances:[{ml:50,stock:-1}]},{slug:'test-rose'})));
  assert.equal(b.sqlite.prepare("SELECT nom FROM parfums WHERE slug='test-rose'").get().nom,'Mon parfum');
  await creerVente(contexte(b.db,{...vente(),lignes:[{slug:'test-rose',ml:50,quantite:1,prix_unitaire:15000}]}));
  await assert.rejects(cat.modifier(contexte(b.db,{nom:'Ne doit pas changer',contenances:[]},{slug:'test-rose'})),/contenance_utilisee/);
  assert.equal(b.sqlite.prepare("SELECT nom FROM parfums WHERE slug='test-rose'").get().nom,'Mon parfum');
 }finally{b.close();}
});
test('photo sans R2, privée avant publication et après masquage, formats actifs refusés',async()=>{
 const b=base();try{
  const photo=new Uint8Array([255,216,255,224,0,0,0,0]);
  const upload=await(await ajouterImage(new Request('https://test.local/api/admin/photos?slug=rose',{method:'POST',body:photo}),{DB:b.db})).json();
  assert.match(upload.url,/^\/api\/public\/photos\//);await assert.rejects(servirImage(upload.cle,{DB:b.db},true),e=>e.status===404);
  assert.equal((await servirImage(upload.cle,{DB:b.db},false)).status,200);
  await cat.modifier(contexte(b.db,{images:[upload.url]},{slug:'test-rose'}));
  const r=await servirImage(upload.cle,{DB:b.db},true);assert.equal(r.headers.get('Content-Type'),'image/jpeg');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),photo);
  await cat.modifier(contexte(b.db,{masque:true},{slug:'test-rose'}));await assert.rejects(servirImage(upload.cle,{DB:b.db},true),e=>e.status===404);
  await assert.rejects(ajouterImage(new Request('https://test.local/api/admin/photos',{method:'POST',body:'<svg onload=alert(1)>'}),{DB:b.db}),e=>e.status===415);
  await assert.rejects(cat.modifier(contexte(b.db,{images:['javascript:alert(1)']},{slug:'test-rose'})),e=>e.status===422);
 }finally{b.close();}
});
test('nouveau lien direct et métadonnées échappées, masquage et absence renvoient 404',async()=>{
 const b=base();try{
  const {slug}=await(await cat.creer(contexte(b.db,{...produit(),description:'</script><script>alert(1)</script>'}))).json();
  const next=async req=>{if(!req)return new Response('Absent',{status:404});assert.equal(new URL(req.url).pathname,'/parfum-dynamique.html');return new Response('<html><head><!--og:start--><!--og:end--></head><body><div id="root"></div></body></html>');};
  const get=slug=>fiche({request:new Request(`https://test.local/parfum/${slug}`),params:{slug},env:{DB:b.db},next});
  const r=await get(slug);assert.equal(r.status,200);const html=await r.text();assert.match(html,/nalaaris-catalogue/);assert.match(html,/Mon parfum/);assert.doesNotMatch(html,/<script>alert\(1\)/);assert.match(html,/\\u003c\/script/);
  assert.equal((await get('absent')).status,404);
  await cat.modifier(contexte(b.db,{masque:true},{slug}));assert.equal((await get(slug)).status,404);
 }finally{b.close();}
});
test('instantané autoritaire : ajouts et retraits sans dépendance au build',()=>{
 const base=[{slug:'ancien',nom:'Ancien',marque:'Avant',categorie:'unisexe',description:'',styles:['doux'],notes:{bouquet:[]},ingredients:[],images:[],contenances:[]}];
 const p={...base[0],slug:'nouveau',nom:'Nouveau',marque:'Après'};
 const f=fusionnerCatalogue(base,{complet:true,parfums:{nouveau:p},boutique:{},avis:[]});assert.deepEqual(f.map(x=>x.slug),['nouveau']);assert.deepEqual(base.map(x=>x.slug),['ancien']);
 assert.deepEqual(fusionnerCatalogue(base,{complet:true,parfums:{},boutique:{},avis:[]}),[]);
});

test('enregistrer un texte conserve les ventes et les formats ajoutés pendant l’édition',async()=>{
 const {formatsModifies}=await import('../admin/src/formats.ts');
 const b=base();try{
  const initial=(await(await cat.lire(contexte(b.db,{}, {slug:'test-rose'}))).json()).contenances;
  await creerVente(contexte(b.db,vente(1)));
  await cat.ecrireContenance(contexte(b.db,{prix_vente:12000,stock:2},{slug:'test-rose',ml:50}));
  const payload=formatsModifies(initial,initial);assert.deepEqual(payload,[{ml:100}]);
  await cat.modifier(contexte(b.db,{description:'Nouveau texte',contenances:payload,contenances_initiales:[100]},{slug:'test-rose'}));
  const p=await(await cat.lire(contexte(b.db,{}, {slug:'test-rose'}))).json();assert.equal(p.contenances.find(c=>c.ml===100).stock,4);assert.equal(p.contenances.find(c=>c.ml===50).stock,2);
 }finally{b.close();}
});

test('la sauvegarde complète inclut les photos sans R2 et leurs octets',async()=>{
 const {exporter}=await import('../server/admin/divers.ts');const b=base();try{
  const octets=new Uint8Array([255,216,255,224]);
  await ajouterImage(new Request('https://test.local/api/admin/photos',{method:'POST',body:octets}),{DB:b.db});
  const r=await(await exporter(contexte(b.db))).json();assert.equal(r.version,2);assert.equal(r.images_boutique.length,1);assert.deepEqual(Buffer.from(r.images_boutique[0].contenu_base64,'base64'),Buffer.from(octets));
 }finally{b.close();}
});

test('vingt formats modifiés restent sous cinquante instructions D1',async()=>{
 const b=base();try{
  let n=0;const db={...b.db,prepare(sql){n++;return b.db.prepare(sql);}};
  const contenances=Array.from({length:20},(_,i)=>({ml:i+1,prix_vente:1000,prix_achat:500,stock:10,seuil_alerte:2,dispo_force:null}));
  const {slug}=await(await cat.creer(contexte(db,{...produit(),contenances}))).json();assert.ok(n<=50,`creation: ${n}`);n=0;
  await cat.modifier(contexte(db,{...produit(),contenances:contenances.map(c=>({...c,stock:9}))},{slug}));assert.ok(n<=50,`modification: ${n}`);
 }finally{b.close();}
});

test('effacer concentration, conseil et disponibilité efface aussi les anciennes valeurs du build',async()=>{
 const b=base();try{
  await cat.modifier(contexte(b.db,{concentration:null,porter:null,dispo_force:null},{slug:'test-rose'}));
  const d=JSON.parse(JSON.stringify(await cataloguePublic({DB:b.db},true)));
  assert.equal(d.parfums['test-rose'].concentration,null);assert.equal(d.parfums['test-rose'].porter,null);assert.equal(d.parfums['test-rose'].dispo,null);
  const ancienne={...d.parfums['test-rose'],concentration:'Ancienne concentration',porter:{moment:'soir'},dispo:'epuise'};
  const [p]=fusionnerCatalogue([ancienne],d);assert.equal(p.concentration,undefined);assert.equal(p.porter,undefined);assert.equal(p.dispo,undefined);
 }finally{b.close();}
});

test('une description vidée ne reprend pas le texte historique',async()=>{
 const b=base();try{
  b.sqlite.prepare("UPDATE parfums SET description_import='Ancien texte' WHERE slug='test-rose'").run();
  await cat.modifier(contexte(b.db,{description:''},{slug:'test-rose'}));
  assert.equal((await cataloguePublic({DB:b.db},true)).parfums['test-rose'].description,'');
  assert.equal((await(await cat.lire(contexte(b.db,{}, {slug:'test-rose'}))).json()).description,'');
 }finally{b.close();}
});

test('la disponibilité générale choisie s’applique aux formats puis revient au stock',async()=>{
 const b=base();try{
  await cat.modifier(contexte(b.db,{dispo_force:'sur_commande'},{slug:'test-rose'}));
  assert.equal((await cataloguePublic({DB:b.db},true)).parfums['test-rose'].contenances[0].dispo,'sur_commande');
  await cat.modifier(contexte(b.db,{dispo_force:null},{slug:'test-rose'}));
  assert.equal((await cataloguePublic({DB:b.db},true)).parfums['test-rose'].contenances[0].dispo,'disponible');
 }finally{b.close();}
});
