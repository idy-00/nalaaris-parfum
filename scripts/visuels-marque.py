"""
Visuels de marque générés depuis le logo existant (JPEG sur fond blanc) :
  public/brand/logo-nalaaris-transparent.webp — logo détouré (blanc → transparent), pour fonds noirs
  public/brand/partage-1200x630.jpg           — image de partage (WhatsApp, Instagram, Facebook)
  public/brand/apple-touch-icon.png           — icône écran d'accueil iOS (180×180, fond noir)

TODO cliente : fournir le logo vectoriel (SVG) — il remplacera le détourage raster.
Usage : python scripts/visuels-marque.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = "public/brand/logo-nalaaris.jpg"
FONTS = "node_modules/@fontsource-variable"
NOIR = (11, 10, 12)

logo = Image.open(SRC).convert("RGB")
W, H = logo.size
a = np.asarray(logo, dtype=np.float32) / 255

# Détourage : alpha = 1 − min(R,G,B) ; couleur dé-multipliée par rapport au blanc
alpha = np.clip(1 - a.min(-1), 0, 1)
alpha = np.clip((alpha - 0.05) / 0.95, 0, 1)
coul = np.clip((a - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0, 1)
# Hors du médaillon : transparent (bords JPEG)
yy, xx = np.mgrid[0:H, 0:W]
alpha *= np.clip((0.995 - np.hypot(xx - W / 2, yy - H / 2) / (W / 2)) / 0.01, 0, 1)
detoure = Image.fromarray((np.dstack([coul, alpha]) * 255).astype(np.uint8), "RGBA")
petit = detoure.copy()
petit.thumbnail((640, 640), Image.LANCZOS)
petit.save("public/brand/logo-nalaaris-transparent.webp", "WEBP", quality=88, method=6)
p240 = detoure.copy()
p240.thumbnail((240, 240), Image.LANCZOS)
p240.save("public/brand/logo-nalaaris-transparent-240.webp", "WEBP", quality=88, method=6)
print("logo détouré", petit.size)

# Image de partage 1200×630 : noir, halo bordeaux, logo à gauche, nom et promesse à droite
fond = Image.new("RGB", (1200, 630), NOIR)
halo = Image.new("L", (1200, 630), 0)
d = ImageDraw.Draw(halo)
d.ellipse((-80, -120, 620, 760), fill=255)
halo = halo.filter(ImageFilter.GaussianBlur(120))
fond = Image.composite(Image.new("RGB", fond.size, (74, 6, 32)), fond, halo.point(lambda v: int(v * 0.85)))
l = detoure.copy()
l.thumbnail((500, 500), Image.LANCZOS)
fond.paste(l, (55, 65), l)

serif = ImageFont.truetype(f"{FONTS}/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2", 64)
serif_i = ImageFont.truetype(f"{FONTS}/bodoni-moda/files/bodoni-moda-latin-opsz-italic.woff2", 34)
sans = ImageFont.truetype(f"{FONTS}/manrope/files/manrope-latin-wght-normal.woff2", 24)
d = ImageDraw.Draw(fond)
x = 610
d.text((x, 190), "Nal’Aaris", font=serif, fill=(245, 239, 234))
d.text((x, 262), "Perfumes", font=serif, fill=(245, 239, 234))
d.line((x, 362, x + 70, 362), fill=(218, 8, 98), width=2)
d.text((x, 385), "Parfums authentiques pour elle et lui", font=sans, fill=(242, 198, 214))
d.text((x, 420), "Dakar · commande sur WhatsApp", font=sans, fill=(169, 158, 165))
d.text((x, 480), "by Yannick & Laetitia", font=serif_i, fill=(229, 139, 174))
fond.save("public/brand/partage-1200x630.jpg", quality=86, optimize=True, progressive=True)
print("partage 1200x630")

# Icône iOS : logo détouré sur noir
ic = Image.new("RGB", (180, 180), NOIR)
l = detoure.copy()
l.thumbnail((164, 164), Image.LANCZOS)
ic.paste(l, ((180 - l.width) // 2, (180 - l.height) // 2), l)
ic.save("public/brand/apple-touch-icon.png", optimize=True)
print("apple-touch-icon 180")
