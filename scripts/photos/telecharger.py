"""
Télécharge depuis Wikimedia Commons les photos sources du site (CC0 / domaine public, largeur 2400 max)
dans scripts/photos/sources/ (ignoré par git) et note la licence de chacune dans sources/CREDITS.txt.

Usage : python scripts/photos/telecharger.py
Ensuite : python scripts/photos/traiter.py puis python scripts/photos/humeurs.py
"""
import json, os, urllib.parse, urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(ICI, "sources")
UA = {"User-Agent": "NalaarisSiteBuilder/1.0 (https://github.com/idy-00/nalaaris-parfum)"}

# nom local : titre Commons
CHOIX = {
    "frais": "File:Citrus slices-1002778.jpeg",
    "fleuri": "File:Pink Peony Flower.jpg",
    "boise": "File:Sandalwood sticks on a plate.jpg",
    "doux": "File:Dried rose petals.jpg",
    "vanille2": "File:Vanilla in raw form.jpg",
    "oriental": "File:Incense in India.jpg",
    "bouquet-sombre": "File:Wet rose bouquet (Unsplash).jpg",
    "bouquet-rose": "File:Pink rose bouquet (Unsplash).jpg",
    "gravure": "File:Perfume atomizer.png",
}

os.makedirs(DEST, exist_ok=True)
credits = []
for nom, titre in CHOIX.items():
    q = {"action": "query", "format": "json", "titles": titre, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 2400}
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q), headers=UA)
    ii = next(iter(json.load(urllib.request.urlopen(req, timeout=30))["query"]["pages"].values()))["imageinfo"][0]
    lic = ii["extmetadata"].get("LicenseShortName", {}).get("value", "?")
    data = urllib.request.urlopen(urllib.request.Request(ii.get("thumburl") or ii["url"], headers=UA), timeout=120).read()
    with open(os.path.join(DEST, nom + ".jpg"), "wb") as f:
        f.write(data)
    credits.append(f"{nom}: {titre} — {lic} — {ii.get('descriptionurl', '')}")
    print(nom, lic, len(data) // 1024, "Ko")

with open(os.path.join(DEST, "CREDITS.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(credits) + "\n")
