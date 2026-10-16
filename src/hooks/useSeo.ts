import { useEffect } from 'react';
import { SITE_URL } from '../data/infos';

interface Seo {
  title: string;
  description: string;
  path?: string;
  image?: string;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Titre et description par page, côté navigateur.
 * Les aperçus WhatsApp/Instagram (qui n'exécutent pas le JS) sont servis par les pages
 * statiques générées au build : scripts/prerender-og.mjs.
 */
export function useSeo({ title, description, path = '/', image = '/brand/logo-nalaaris.jpg' }: Seo) {
  useEffect(() => {
    document.title = title;
    const url = `${SITE_URL}${path}`;
    const img = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [title, description, path, image]);
}
