/** Recette HTTP sur les vraies Pages Functions et D1 local, sans données distantes. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const port=8791;
const origine=`http://127.0.0.1:${port}`;
const serveur=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','dev','dist','--port',String(port),'--ip','127.0.0.1','--inspector-port','9231','--show-interactive-dev-session','false'],{stdio:['ignore','pipe','pipe']});
let journal='';serveur.stdout.on('data',b=>journal+=b);serveur.stderr.on('data',b=>journal+=b);
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
let cookie='';
async function requete(path,body,methode=body?'POST':'GET',image=false){
 const r=await fetch(origine+path,{method:methode,headers:{Origin:origine,'X-Nalaaris':'1',...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':image?'image/webp':'application/json'}:{})},body:body?(image?body:JSON.stringify(body)):undefined});
 return r;
}
try{
 let pret=false;
 for(let i=0;i<50;i++){
  if(serveur.exitCode!==null)throw new Error(journal);
  try{const r=await fetch(origine+'/api/auth/session');if(r.ok){pret=true;break;}}catch{}
  await pause(200);
 }
 assert.ok(pret,`Le serveur de test n'a pas démarré. ${journal}`);
 for(const path of ['/admin/catalogue/nouveau','/admin/catalogue/afnan-9pm','/admin/ventes']){
  const r=await fetch(origine+path,{redirect:'manual'});assert.equal(r.status,200,`${path} doit rester sur son URL`);assert.match(await r.text(),/id="admin"/);
 }
 assert.equal((await requete('/api/admin/parfums')).status,401);
 const login=await requete('/api/auth/login',{identifiant:'admin',motDePasse:process.env.NALAARIS_TEST_PASSWORD??'admin123'});
 assert.equal(login.status,200,await login.clone().text());cookie=login.headers.get('Set-Cookie').split(';')[0];
 const catalogue=await(await requete('/api/admin/parfums')).json();assert.ok(catalogue.parfums.length>=81);
 const photo=await readFile('public/parfums/afnan-9pm/360.webp');
 const upload=await requete('/api/admin/photos?slug=validation-http',photo,'POST',true);assert.equal(upload.status,201,await upload.clone().text());const media=await upload.json();
 assert.equal((await requete(media.url)).status,404);
 const corps={marque:'TEST LOCAL',nom:`Recette ${Date.now()}`,categorie:'unisexe',description:'Création complète vérifiée sur D1 local.',styles:['boise','doux'],photo_r2:media.cle,notes:{bouquet:['Bois','Musc']},masque:true,contenances:[{ml:75,prix_vente:18000,stock:4,prix_achat:6000,seuil_alerte:1,dispo_force:null}]};
 const creation=await requete('/api/admin/parfums',corps);assert.equal(creation.status,201,await creation.clone().text());const {slug}=await creation.json();
 assert.equal((await requete(`/parfum/${slug}`)).status,404);
 const publication=await requete(`/api/admin/parfums/${slug}`,{masque:false},'PATCH');assert.equal(publication.status,200,await publication.clone().text());
 const publicApi=await(await requete('/api/public/catalogue?complet=1')).json();assert.equal(publicApi.parfums[slug].nom,corps.nom);assert.equal(publicApi.parfums[slug].contenances[0].prix,18000);assert.doesNotMatch(JSON.stringify(publicApi),/prix_achat|"stock"|client_tel/);
 const fiche=await requete(`/parfum/${slug}`);assert.equal(fiche.status,200);const html=await fiche.text();assert.match(html,/id="nalaaris-catalogue"/);assert.match(html,/TEST LOCAL/);assert.match(html,/<div id="root"><section/);assert.match(fiche.headers.get('Content-Security-Policy'),/sha256/);
 const imagePublique=await requete(media.url);assert.equal(imagePublique.status,200);assert.equal((await imagePublique.arrayBuffer()).byteLength,photo.byteLength);
 const changement=await requete(`/api/admin/parfums/${slug}`,{marque:'MARQUE MODIFIÉE',nom:'Nouveau nom',description:'Description modifiée',images:[],contenances:[{ml:30,prix_vente:9000,stock:2}]},'PATCH');assert.equal(changement.status,200,await changement.clone().text());
 const apres=await(await requete('/api/public/catalogue?complet=1')).json();assert.equal(apres.parfums[slug].marque,'MARQUE MODIFIÉE');assert.equal(apres.parfums[slug].contenances[0].ml,30);
 assert.equal((await requete(media.url)).status,404);
 assert.equal((await requete(`/api/admin/parfums/${slug}`,{masque:true},'PATCH')).status,200);
 assert.equal((await requete(`/parfum/${slug}`)).status,404);
 const suppression=await requete(`/api/admin/parfums/${slug}`,undefined,'DELETE');assert.equal(suppression.status,200,await suppression.clone().text());
 assert.equal((await requete(`/api/admin/parfums/${slug}`)).status,404);
 const listeFinale=await(await requete('/api/admin/parfums')).json();assert.ok(!listeFinale.parfums.some(p=>p.slug===slug));
 assert.equal((await requete(`/parfum/${slug}`)).status,404);
 console.log('Recette HTTP OK : authentification, photo sans R2, brouillon privé, création, publication, lien direct, prix/stock, modifications et masquage sans redéploiement.');
}finally{serveur.kill('SIGTERM');}
