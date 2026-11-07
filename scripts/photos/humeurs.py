"""
Tuiles humeur (V2) : duotone sobre, surtout noir, rose seulement dans les hautes lumières.
Usage : python scripts/photos/humeurs.py [sources] [sortie] [apercu.jpg]
        (défauts : scripts/photos/sources et public/media)
"""
import os, sys
import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "sources")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ICI, "..", "..", "public", "media")

# Moins saturé : ombres neutres, milieu prune désaturé, rose seulement tout en haut
STOPS_SOMBRE = [
    (0.00, (8, 7, 8)),
    (0.35, (26, 14, 19)),
    (0.60, (68, 30, 45)),
    (0.80, (128, 58, 86)),
    (0.93, (214, 150, 176)),
    (1.00, (242, 222, 230)),
]
# Thème « clair » (Rose & blanc, par défaut) : ombres framboise douce, milieux rose poudré, hautes lumières blanches.
# NALAARIS_THEME=sombre régénère la version noir & rose (V2).
STOPS_CLAIR = [
    (0.00, (140, 52, 88)),
    (0.30, (196, 120, 152)),
    (0.55, (232, 184, 202)),
    (0.80, (248, 226, 234)),
    (1.00, (255, 251, 252)),
]
CLAIR = os.environ.get("NALAARIS_THEME", "clair") != "sombre"
STOPS = STOPS_CLAIR if CLAIR else STOPS_SOMBRE


def gradient_map(img, gamma=1.0, contraste=1.0, noir=0.0):
    g = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    g = np.clip((g - noir) / (1 - noir), 0, 1)
    g = np.clip((g - 0.5) * contraste + 0.5, 0, 1) ** gamma
    pos = np.array([s[0] for s in STOPS])
    cols = np.array([s[1] for s in STOPS], dtype=np.float32)
    out = np.stack([np.interp(g, pos, cols[:, c]) for c in range(3)], axis=-1)
    return Image.fromarray(out.astype(np.uint8))


def recadrer(img, box, ratio):
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


def vignette(img, force=0.5):
    W, H = img.size
    y, x = np.ogrid[-1:1:H * 1j, -1:1:W * 1j]
    m = 1 - force * np.clip(np.sqrt(x * x * 0.8 + y * y) - 0.35, 0, 1)
    a = np.asarray(img, dtype=np.float32) * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def grain(img, q=4):
    a = np.asarray(img, dtype=np.float32)
    a += np.random.default_rng(7).normal(0, q, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


TRAVAUX = {
    "humeur-frais": ("frais", (0.15, 0.1, 0.75, 0.9), dict(gamma=1.15, contraste=1.15)),
    "humeur-fleuri": ("fleuri", (0.3, 0.12, 0.85, 0.7), dict(gamma=0.8, contraste=1.2)),
    "humeur-boise": ("boise", (0.25, 0.25, 0.75, 0.8), dict(gamma=1.05, contraste=1.25)),
    "humeur-doux": ("doux", (0.2, 0.2, 0.8, 0.8), dict(gamma=0.95, contraste=1.1)),
    "humeur-vanille": ("vanille2", (0.0, 0.42, 0.3, 0.92), dict(gamma=1.2, contraste=1.25, noir=0.05)),
    "humeur-oriental": ("oriental", (0.15, 0.0, 0.85, 1.0), dict(gamma=1.05, contraste=1.2)),
}

apercus = []
for nom, (src, box, reglages) in TRAVAUX.items():
    im = Image.open(os.path.join(SRC, src + ".jpg")).convert("RGB")
    im = gradient_map(recadrer(im, box, 4 / 5), **reglages)
    im = vignette(im, 0.5 if not CLAIR else 0.12)
    for w in (480, 900):
        grain(im.resize((w, round(w * 5 / 4)), Image.LANCZOS)).save(os.path.join(OUT, f"{nom}-{w}.webp"), "WEBP", quality=74, method=6)
    apercus.append(im)
    print(nom)

if len(sys.argv) > 3:
    pl = Image.new("RGB", (6 * 250, 312), "#000")
    for k, i in enumerate(apercus):
        t = i.resize((240, 300))
        pl.paste(t, (k * 250 + 5, 6))
    pl.save(sys.argv[3], quality=85)
