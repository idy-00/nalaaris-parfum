"""
Extrait la femme du logo (profil, chignon, flacon) pour la section « L'ombre ».
Le blanc du logo devient transparent : le dessin magenta apparaît sur le noir,
comme une figure éclairée à contre-jour. Fidèle à l'illustration de la marque.

Sorties :
  <out>/ombre-silhouette.webp — dessin magenta sur fond transparent
  src/data/ombre-silhouette.json — position du flacon (point d'émission de la brume), en % de l'image
Usage : python scripts/silhouette-logo.py public/brand/logo-nalaaris.jpg public/media [dossier_apercu]
"""
import json, os, sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = im.size

# Zone de la femme et du flacon, à gauche du monogramme (fractions du logo carré)
boite = (int(0.12 * W), int(0.085 * H), int(0.445 * W), int(0.62 * H))
z = np.asarray(im.crop(boite), dtype=np.float32) / 255

# « Retirer le blanc » : alpha = 1 − min(R,G,B), couleur dé-multipliée par rapport au blanc
alpha = np.clip(1 - z.min(-1), 0, 1)
alpha = np.clip((alpha - 0.06) / 0.94, 0, 1)  # le papier blanc légèrement teinté disparaît
couleur = np.clip((z - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0, 1)

# Retire l'anneau du médaillon (arcs en haut à gauche) : masque radial dans les coordonnées du logo
hh, ww = alpha.shape
yy, xx = np.mgrid[boite[1]:boite[3], boite[0]:boite[2]]
d = np.hypot(xx - W / 2, yy - H / 2) / (W / 2)
alpha *= np.clip((0.86 - d) / 0.03, 0, 1)

# Fondus : bord droit (jonction avec le monogramme) et bas (coupe du buste)
alpha *= np.clip((ww - np.arange(ww)) / (ww * 0.12), 0, 1)[None, :]
alpha *= np.clip((hh - np.arange(hh)) / (hh * 0.18), 0, 1)[:, None]

rgba = np.dstack([couleur, alpha]) * 255
img = Image.fromarray(rgba.astype(np.uint8), "RGBA")
img = img.resize((ww * 2, hh * 2), Image.LANCZOS)
img.thumbnail((640, 1060), Image.LANCZOS)
os.makedirs(out, exist_ok=True)
img.save(os.path.join(out, "ombre-silhouette.webp"), "WEBP", quality=78, method=6)

# Flacon : dans le logo, il est tenu près du visage, à gauche (repère mesuré sur l'illustration)
flacon_logo = (0.176 * W, 0.255 * H)  # buse du vaporisateur
fx = (flacon_logo[0] - boite[0]) / (boite[2] - boite[0])
fy = (flacon_logo[1] - boite[1]) / (boite[3] - boite[1])
json.dump({"flacon": {"x": round(fx * 100, 1), "y": round(fy * 100, 1)}, "taille": img.size},
          open("src/data/ombre-silhouette.json", "w"))  # importé par src/sections/Ombre.tsx
print("silhouette", img.size, "flacon %", round(fx * 100, 1), round(fy * 100, 1))

if len(sys.argv) > 3:
    ap = Image.new("RGBA", img.size, (11, 10, 12, 255))
    ap.alpha_composite(img)
    ap.convert("RGB").save(os.path.join(sys.argv[3], "apercu-silhouette.jpg"), quality=85)
