import { ErreurHttp, enSlug, json, type Env } from './base';
import { parfumActif } from './suppression';
export const CLE_IMAGE = /^parfums\/[a-z0-9-]+\/[0-9]+\.(jpg|png|webp)$/;
/** Table additive, initialisée aussi à la demande pour les installations existantes. */
export async function preparerImages(db:D1Database) {
  await db.prepare('CREATE TABLE IF NOT EXISTS images_boutique (cle TEXT PRIMARY KEY, type TEXT NOT NULL, contenu BLOB NOT NULL, cree_le TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run();
}
export async function ajouterImage(request:Request,env:Env) {
  if (Number(request.headers.get('Content-Length'))>600_000) throw new ErreurHttp(413,'Photo trop lourde. Le formulaire réduit les photos automatiquement.');
  const bytes=new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length>600_000) throw new ErreurHttp(413,'Photo vide ou trop lourde (600 Ko après réduction).');
  const sig=(o:number,v:number[])=>v.every((b,i)=>bytes[o+i]===b);
  const ext=sig(0,[255,216,255])?'jpg':sig(0,[137,80,78,71,13,10,26,10])?'png':sig(0,[82,73,70,70])&&sig(8,[87,69,66,80])?'webp':null;
  if(!ext)throw new ErreurHttp(415,'Choisis une photo JPEG, PNG ou WebP.');
  const slug=(enSlug(new URL(request.url).searchParams.get('slug')??'photo')||'photo').slice(0,100);
  const cle=`parfums/${slug}/${Date.now()}${crypto.getRandomValues(new Uint32Array(1))[0]}.${ext}`;
  await preparerImages(env.DB);
  // Les envois abandonnés sont récupérés automatiquement ; une photo utilisée, même dans un brouillon, reste conservée.
  await env.DB.prepare("DELETE FROM images_boutique WHERE cree_le < datetime('now','-7 days') AND NOT EXISTS (SELECT 1 FROM parfums p,json_each(p.images) i WHERE i.value='/api/public/photos/' || images_boutique.cle)").run();
  const r=await env.DB.prepare('INSERT INTO images_boutique (cle,type,contenu) SELECT ?,?,? WHERE (SELECT COALESCE(sum(length(contenu)),0) FROM images_boutique)+? <= 100000000 AND (SELECT count(*) FROM images_boutique)<600')
    .bind(cle,`image/${ext==='jpg'?'jpeg':ext}`,bytes.buffer,bytes.length).run();
  if(!r.meta.changes)throw new ErreurHttp(413,'La photothèque est pleine (100 Mo ou 600 photos). Retire les anciennes photos inutilisées.');
  return json({cle,url:`/api/public/photos/${cle}`},201);
}
export async function servirImage(cle:string,env:Env,publique:boolean) {
  if(!CLE_IMAGE.test(cle))throw new ErreurHttp(404,'Photo introuvable.');
  if(publique){
    const liee=await env.DB.prepare(`SELECT 1 FROM parfums p,json_each(p.images) i WHERE p.masque=0 AND p.statut='publie' AND ${parfumActif()} AND i.value=? LIMIT 1`).bind(`/api/public/photos/${cle}`).first();
    if(!liee)throw new ErreurHttp(404,'Photo introuvable.');
  }
  await preparerImages(env.DB);
  const image=await env.DB.prepare('SELECT type,contenu FROM images_boutique WHERE cle=?').bind(cle).first<{type:string;contenu:ArrayBuffer}>();
  const headers={'Content-Type':image?.type??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':publique?'public, max-age=60, must-revalidate':'private, no-store'};
  if(image)return new Response(new Uint8Array(image.contenu),{headers});
  const r2=await env.PHOTOS?.get(cle);
  if(r2)return new Response(r2.body,{headers:{...headers,'Content-Type':r2.httpMetadata?.contentType??'image/jpeg'}});
  throw new ErreurHttp(404,'Photo introuvable.');
}
