"""
Photos d'ambiance (hors tuiles humeur, voir humeurs.py) : gradient map noir → bordeaux → rose poudré,
plus la gravure ancienne détourée en traits rose poudré.
Usage : python scripts/photos/traiter.py [sources] [sortie] [apercu.jpg]
        (défauts : scripts/photos/sources et public/media)
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "sources")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ICI, "..", "..", "public", "media")
os.makedirs(OUT, exist_ok=True)

# Dégradé (position, couleur) — rose framboise profond, hautes lumières poudrées
STOPS = [
    (0.00, (9, 7, 9)),
    (0.30, (38, 6, 20)),
    (0.55, (110, 14, 52)),
    (0.75, (168, 18, 79)),
    (0.90, (229, 139, 174)),
    (1.00, (250, 230, 237)),
]


def gradient_map(img: Image.Image, gamma=1.0, contraste=1.0, noir=0.0, canal=None) -> Image.Image:
    # canal='r' : luminance prise sur le rouge (fleurs rouges que la luminance standard écrase)
    g = np.asarray(img.getchannel("R") if canal == "r" else img.convert("L"), dtype=np.float32) / 255.0
    g = np.clip((g - noir) / (1 - noir), 0, 1)
    g = np.clip((g - 0.5) * contraste + 0.5, 0, 1) ** gamma
    pos = np.array([s[0] for s in STOPS])
    cols = np.array([s[1] for s in STOPS], dtype=np.float32)
    out = np.stack([np.interp(g, pos, cols[:, c]) for c in range(3)], axis=-1)
    return Image.fromarray(out.astype(np.uint8))


def recadrer(img, box, ratio):
    """box = fractions (x0, y0, x1, y1) de la zone d'intérêt ; recadre au ratio voulu centré dessus."""
    W, H = img.size
    x0, y0, x1, y1 = box[0] * W, box[1] * H, box[2] * W, box[3] * H
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    w, h = x1 - x0, y1 - y0
    if w / h > ratio:
        h = w / ratio
    else:
        w = h * ratio
    w, h = min(w, W), min(h, H)
    if w / h > ratio:
        w = h * ratio
    else:
        h = w / ratio
    l = min(max(cx - w / 2, 0), W - w)
    t = min(max(cy - h / 2, 0), H - h)
    return img.crop((int(l), int(t), int(l + w), int(t + h)))


def vignette(img, force=0.55):
    W, H = img.size
    y, x = np.ogrid[-1:1:H * 1j, -1:1:W * 1j]
    m = 1 - force * np.clip(np.sqrt(x * x * 0.8 + y * y) - 0.35, 0, 1)
    a = np.asarray(img, dtype=np.float32) * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def grain(img, q=5):
    a = np.asarray(img, dtype=np.float32)
    rng = np.random.default_rng(7)
    a += rng.normal(0, q, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# nom: (source, zone d'intérêt, ratio, réglages, tailles)
TRAVAUX = {
    "manifeste-roses": ("bouquet-sombre", (0.25, 0.2, 0.75, 0.8), 16 / 9, dict(gamma=0.9, contraste=1.4, noir=0.04, canal="r"), (960, 1920)),
    "manifeste-roses-portrait": ("bouquet-sombre", (0.38, 0.2, 0.66, 0.8), 3 / 4, dict(gamma=0.9, contraste=1.4, noir=0.04, canal="r"), (720,)),
    "univers-bouquet": ("bouquet-rose", (0.3, 0.05, 0.7, 0.95), 4 / 5, dict(gamma=1.05, contraste=1.15), (640, 1100)),
}

apercus = []
for nom, (src, box, ratio, reglages, tailles) in TRAVAUX.items():
    im = Image.open(os.path.join(SRC, src + ".jpg")).convert("RGB")
    im = recadrer(im, box, ratio)
    im = gradient_map(im, **reglages)
    im = vignette(im, 0.5 if not nom.startswith("hero") else 0.3)
    for w in tailles:
        h = round(w / ratio)
        v = grain(im.resize((w, h), Image.LANCZOS), 4)
        v.save(os.path.join(OUT, f"{nom}-{w}.webp"), "WEBP", quality=74, method=6)
    apercus.append((nom, im))
    print(nom, [f"{w}x{round(w / ratio)}" for w in tailles])

# Gravure ancienne (femme et vaporisateur) : traits rose poudré sur fond transparent
gr = Image.open(os.path.join(SRC, "gravure.jpg"))
fond = Image.new("RGBA", gr.size, "white")
gr = Image.alpha_composite(fond, gr.convert("RGBA")).convert("L")
gr = gr.crop((0, 0, gr.width, int(gr.height * 0.9)))  # retire la légende « Atomizer—Spray. »
alpha = 255 - np.asarray(gr, dtype=np.float32)
alpha = np.clip((alpha - 20) * 1.4, 0, 255).astype(np.uint8)
rgba = np.zeros((gr.height, gr.width, 4), dtype=np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3] = 242, 198, 214, alpha
grav = Image.fromarray(rgba, "RGBA")
grav.thumbnail((900, 1200), Image.LANCZOS)
grav.save(os.path.join(OUT, "gravure-vaporisateur.webp"), "WEBP", quality=82, method=6)
print("gravure", grav.size)
apercus.append(("gravure", Image.alpha_composite(Image.new("RGBA", grav.size, (11, 10, 12, 255)), grav).convert("RGB")))

if len(sys.argv) > 3:
    W = 4
    cases = [(n, i.copy()) for n, i in apercus]
    for _, i in cases:
        i.thumbnail((360, 360))
    rows = (len(cases) + W - 1) // W
    pl = Image.new("RGB", (W * 370, rows * 370), "#000")
    for k, (_, i) in enumerate(cases):
        pl.paste(i, ((k % W) * 370 + 5, (k // W) * 370 + 5))
    pl.save(sys.argv[3], quality=85)
