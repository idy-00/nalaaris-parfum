import type { Env } from '../../server/base';
import { cataloguePublic } from '../../server/catalogue';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Vraies URLs pour toutes les fiches, y compris les créations postérieures au build. */
export const onRequestGet:PagesFunction<Env>=async({request,env,params,next})=>{
  try{
    const data=await cataloguePublic(env,true);
    const slug=String(params.slug??'');
    const p=(data as {parfums:Record<string,{nom:string;marque:string;description:string;images:string[]}>}).parfums[slug];
    let reponse=p?await next():undefined;
    const nouvelle=!reponse?.ok;
    if(nouvelle)reponse=await next(new Request(new URL('/parfum-dynamique.html',request.url)));
    if(!reponse)throw new Error('Gabarit absent');
    if(!reponse.ok)return new Response('Fiche momentanément indisponible.',{status:503,headers:{'Cache-Control':'no-store'}});
    let html=await reponse.text();
    const titre=p?`${p.nom} — ${p.marque} | Nal’Aaris Perfumes`:'Parfum introuvable — Nal’Aaris';
    const description=p?.description??'Ce parfum n’est pas disponible dans le catalogue.';
    const image=p?.images[0];
    html=html.replace(/<!--og:start-->[\s\S]*?<!--og:end-->/,()=>`<title>${esc(titre)}</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="product"><meta property="og:url" content="${esc(request.url)}">${image?`<meta property="og:image" content="${esc(new URL(image,request.url).href)}">`:''}<link rel="canonical" href="${esc(new URL(`/parfum/${slug}`,request.url).href)}">`);
    const resume=`<section class="shell py-32"><h1>${esc(p?.nom??'Parfum introuvable')}</h1>${p?`<p>${esc(p.marque)}</p><p>${esc(description)}</p>${image?`<img src="${esc(image)}" alt="${esc(p.nom)}" width="480" height="600">`:''}`:''}<a href="/catalogue">Voir le catalogue</a></section>`;
    if(nouvelle)html=html.replace('<div id="root"></div>',()=>`<div id="root">${resume}</div>`);
    const instantane=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    html=html.replace('</body>',()=>`<script type="application/json" id="nalaaris-catalogue">${instantane}</script></body>`);
    const hashes=await Promise.all([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(async m=>{
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m[1].replace(/\r\n?/g,'\n'))));
      return `'sha256-${btoa(String.fromCharCode(...digest))}'`;
    }));
    return new Response(html,{status:p?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':`default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests`}});
  }catch{return new Response('Catalogue momentanément indisponible. Réessaie dans un instant.',{status:503,headers:{'Cache-Control':'no-store'}});}
};
