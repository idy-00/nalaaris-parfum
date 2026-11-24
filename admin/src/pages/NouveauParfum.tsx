/**
 * Nouveau parfum : créé avec le statut « Visuel à créer », masqué du site tant que le visuel studio
 * n'est pas prêt. La photo (téléphone) sert de référence pour ce visuel.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus } from 'lucide-react';
import { api, ErreurApi } from '../api';
import { EnTete, Page, Puces, Section, useToast } from '../ui';
import { Champ } from './FicheParfum';

export function NouveauParfum() {
  const [f, setF] = useState({ marque: '', nom: '', concentration: '', categorie: '' as '' | 'femme' | 'homme' | 'unisexe', notes: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const choisir = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > 5_000_000) return setErreur('Photo trop lourde (5 Mo maximum). Reprends-la en qualité normale.');
    setErreur(null);
    setPhoto(fichier);
    // Aperçu en data: (autorisé par la CSP, contrairement à blob:)
    const r = new FileReader();
    r.onload = () => setApercu(String(r.result));
    r.readAsDataURL(fichier);
  };

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.categorie) return setErreur('Choisis la catégorie (femme, homme ou unisexe).');
    setEnvoi(true);
    setErreur(null);
    try {
      let photo_r2: string | null = null;
      if (photo) {
        try {
          photo_r2 = (await api.envoyer<{ cle: string }>(`photos?slug=${encodeURIComponent(`${f.marque} ${f.nom}`)}`, photo)).cle;
        } catch (err) {
          if (err instanceof ErreurApi && err.status === 503) toast('Photo non envoyée : stockage pas encore activé. Le parfum est créé sans photo.', { type: 'erreur' });
          else throw err;
        }
      }
      const { slug } = await api.post<{ slug: string }>('parfums', { ...f, photo_r2 });
      toast('Parfum ajouté · visuel à créer');
      navigate(`/admin/catalogue/${slug}`, { replace: true });
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <EnTete titre="Ajouter un parfum" retour="/admin/catalogue" />
      <Page>
        <p className="carte p-4 text-sm text-sourdine">
          Le parfum sera <strong className="text-encre">masqué du site</strong> tant que son visuel studio n’est pas créé. Il apparaît dans la liste « Visuels à créer ».
        </p>
        <form className="admin-grille" onSubmit={valider} noValidate>
          <Section titre="Parfum">
            <div className="carte grid gap-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Champ label="Marque" value={f.marque} onChange={(v) => setF({ ...f, marque: v })} requis placeholder="Lattafa" />
                <Champ label="Nom" value={f.nom} onChange={(v) => setF({ ...f, nom: v })} requis placeholder="Khamrah" />
              </div>
              <Champ label="Concentration" value={f.concentration} onChange={(v) => setF({ ...f, concentration: v })} placeholder="Eau de parfum" />
              <fieldset>
                <legend className="label mb-2">
                  Catégorie <span className="text-rose-doux">*</span>
                </legend>
                <Puces label="Catégorie" valeur={f.categorie || null} onChange={(v) => setF({ ...f, categorie: v })} options={[{ v: 'femme', l: 'Femme' }, { v: 'homme', l: 'Homme' }, { v: 'unisexe', l: 'Unisexe' }]} />
              </fieldset>
              <Champ label="Notes" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} multi placeholder="Cannelle, datte, praliné, vanille…" aide="Séparées par des virgules." />
            </div>
          </Section>
          <Section titre="Photo (référence pour le visuel)">
            <label className="carte flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center">
              {apercu ? (
                <img src={apercu} alt="Photo choisie" className="max-h-64 rounded-xl object-contain" />
              ) : (
                <>
                  <span className="flex gap-3 text-rose-doux">
                    <Camera size={26} aria-hidden="true" />
                    <ImagePlus size={26} aria-hidden="true" />
                  </span>
                  <span className="font-semibold">Prendre ou choisir une photo</span>
                  <span className="text-sm text-sourdine">JPEG, PNG ou WebP · 5 Mo maximum</span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choisir(e.target.files?.[0])} />
            </label>
            {apercu && (
              <button type="button" onClick={() => (setPhoto(null), setApercu(null))} className="mt-2 min-h-[44px] px-2 text-sm font-semibold text-sourdine underline-offset-4 hover:underline">
                Retirer la photo
              </button>
            )}
          </Section>
          {erreur && (
            <p role="alert" className="mt-4 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
              {erreur}
            </p>
          )}
          <button type="submit" disabled={envoi || !f.marque.trim() || !f.nom.trim()} className="admin-actions-formulaire btn btn-rose mt-6 w-full">
            {envoi ? 'Enregistrement…' : 'Ajouter le parfum'}
          </button>
        </form>
      </Page>
    </>
  );
}
