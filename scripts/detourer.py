"""Détourage des flacons : photo produit (flacon + boîte, fond blanc) -> WebP transparent du flacon seul.

Usage :
    python scripts/detourer.py              # toutes les photos de scripts/photos-brutes/
    python scripts/detourer.py dior-jadore  # une seule (nom de fichier sans extension = slug)
    python scripts/detourer.py --apercu     # + planche de contrôle fond noir / fond blanc

Dépendances : pip install "rembg[cpu]" pillow numpy opencv-python-headless
Sortie : public/parfums/flacons/<slug>.webp (hauteur 1000 px).

Pour un nouveau parfum : déposer la photo dans scripts/photos-brutes/<slug>.(png|jpg|webp),
ajouter son cadre dans CADRES si le flacon est à côté de sa boîte, puis relancer.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from rembg import new_session, remove

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "scripts" / "photos-brutes"
SORTIE = RACINE / "public" / "parfums" / "flacons"
HAUTEUR = 1000

# Cadre (x0, y0, x1, y1) du flacon seul dans la photo brute : sépare le flacon de sa boîte.
# Pas de cadre = toute l'image (la plus grande zone connexe est gardée).
CADRES: dict[str, tuple[int, int, int, int]] = {
    "afnan-9pm": (60, 430, 262, 862),
    "givenchy-linterdit-rouge-ultime": (328, 476, 532, 822),
    # coin gauche du flacon collé à la boîte : voir _effacer_boite_prada
    "prada-paradoxe": (330, 518, 566, 750),
    # bord droit : la boîte commence à x≈263
    "dior-jadore": (16, 378, 260, 932),
    "paco-rabanne-1-million": (326, 476, 542, 848),
}


def _effacer_loupe_dior(im: Image.Image) -> Image.Image:
    """Capture d'écran : l'icône « recherche par image » touche la base du flacon J'adore.

    On la peint en blanc, sans dépasser le bord du verre (droite de (70,850) à (93,925)).
    """
    px = im.load()
    cx, cy, r = 52, 885, 29
    for y in range(cy - r, cy + r + 1):
        bord = 70 + (y - 850) * 23 / 75 - 1.5
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x < bord:
                px[x, y] = (255, 255, 255)
    return im


def _effacer_boite_prada(im: Image.Image) -> Image.Image:
    """Le bord gauche du flacon Paradoxe est collé à sa boîte rose : on blanchit la boîte
    (à gauche du verre, x < 341, et au-dessus du sommet du triangle, y < 572)."""
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 340, im.height], fill=(255, 255, 255))
    d.rectangle([0, 0, 366, 566], fill=(255, 255, 255))
    return im


RETOUCHES = {"dior-jadore": _effacer_loupe_dior, "prada-paradoxe": _effacer_boite_prada}


def nettoyer_alpha(alpha: np.ndarray) -> np.ndarray:
    """Alpha franc + bord resserré : supprime le halo blanc laissé par le fond."""
    a = np.clip((alpha.astype(np.float32) - 55) * 255 / (205 - 55), 0, 255)
    a = cv2.erode(a, np.ones((3, 3), np.uint8), iterations=1)
    a = cv2.GaussianBlur(a, (0, 0), 0.6)
    return a.astype(np.uint8)


def plus_grande_zone(alpha: np.ndarray) -> np.ndarray:
    """Ne garde que la plus grande zone connexe (restes de boîte, d'icône, reflets au sol)."""
    masque = (alpha > 10).astype(np.uint8)
    n, etiquettes, stats, _ = cv2.connectedComponentsWithStats(masque, connectivity=8)
    if n <= 2:
        return alpha
    grande = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    garde = cv2.dilate((etiquettes == grande).astype(np.uint8), np.ones((3, 3), np.uint8))
    return (alpha * garde).astype(np.uint8)


def boucher_trous(alpha: np.ndarray) -> np.ndarray:
    """Un flacon est plein : tout ce qui est dans son contour extérieur devient opaque.

    rembg rend parfois semi-transparentes les zones sombres ou métalliques (bouchon noir du Paradoxe),
    et le fond de la carte se voit alors à travers. Le bord (2 px) garde son alpha doux.
    """
    contours, _ = cv2.findContours((alpha > 40).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    plein = np.zeros_like(alpha)
    cv2.drawContours(plein, contours, -1, 255, thickness=cv2.FILLED)
    plein = cv2.erode(plein, np.ones((5, 5), np.uint8), iterations=1)
    return np.maximum(alpha, plein)


def detourer(chemin: Path, session) -> Path:
    slug = chemin.stem
    im = Image.open(chemin).convert("RGB")
    if slug in RETOUCHES:
        im = RETOUCHES[slug](im)
    if slug in CADRES:
        im = im.crop(CADRES[slug])

    # marge blanche : rembg détoure mieux un objet qui ne touche pas les bords
    marge = 24
    fond = Image.new("RGB", (im.width + 2 * marge, im.height + 2 * marge), (255, 255, 255))
    fond.paste(im, (marge, marge))

    rgba = np.array(remove(fond, session=session))
    alpha = boucher_trous(plus_grande_zone(nettoyer_alpha(rgba[:, :, 3])))
    rgba[:, :, 3] = alpha

    ys, xs = np.where(alpha > 8)
    rgba = rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    sortie = Image.fromarray(rgba, "RGBA")
    largeur = round(sortie.width * HAUTEUR / sortie.height)
    sortie = sortie.resize((largeur, HAUTEUR), Image.LANCZOS)

    SORTIE.mkdir(parents=True, exist_ok=True)
    cible = SORTIE / f"{slug}.webp"
    sortie.save(cible, "WEBP", quality=88, method=6)
    print(f"{slug}: {largeur}x{HAUTEUR} -> {cible.relative_to(RACINE)} ({cible.stat().st_size // 1024} Ko)")
    return cible


def planche(fichiers: list[Path], cible: Path) -> None:
    """Contrôle : chaque flacon sur fond noir puis sur fond blanc (liseré, reste de boîte)."""
    h = 420
    vignettes = []
    for f in fichiers:
        im = Image.open(f)
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
        vignettes.append(im)
    largeur = sum(v.width + 30 for v in vignettes) + 30
    feuille = Image.new("RGB", (largeur, 2 * h + 90), (255, 255, 255))
    ImageDraw.Draw(feuille).rectangle([0, 0, largeur, h + 45], fill=(10, 10, 12))
    x = 30
    for v in vignettes:
        feuille.paste(v, (x, 22), v)
        feuille.paste(v, (x, h + 68), v)
        x += v.width + 30
    feuille.save(cible)
    print(f"planche : {cible}")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    # « _xxx » = fichiers de travail (planche de contrôle), jamais détourés
    photos = sorted(
        p for p in SOURCE.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and not p.name.startswith("_")
    )
    if args:
        photos = [p for p in photos if p.stem in args]
    if not photos:
        sys.exit(f"Aucune photo dans {SOURCE}")
    session = new_session("isnet-general-use")
    faits = [detourer(p, session) for p in photos]
    if "--apercu" in sys.argv:
        planche(faits, SOURCE / "_controle.png")


if __name__ == "__main__":
    main()
