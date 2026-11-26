import type { Env } from '../server/base';
export const onRequestGet:PagesFunction<Env>=async({request,env})=>{
 try{
  const r=await env.DB.prepare("SELECT slug FROM parfums WHERE masque=0 AND statut='publie' ORDER BY slug").all<{slug:string}>();
  const origine=(env as Env&{VITE_SITE_URL?:string}).VITE_SITE_URL??new URL(request.url).origin;
  const xml=(v:string)=>v.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
  const urls=['/','/catalogue','/la-maison','/commander',...r.results.map(p=>`/parfum/${encodeURIComponent(p.slug)}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(p=>`<url><loc>${xml(new URL(p,origine).href)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
 }catch{return new Response('Plan du site indisponible.',{status:503,headers:{'Cache-Control':'no-store'}});}
};
