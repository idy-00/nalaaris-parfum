#!/usr/bin/env bash
# Encode la vidéo du hero « pschitt » depuis une source (Pexels 4154241 par défaut).
# Usage : bash scripts/video-hero.sh <source.mp4> <lut.cube> [debut_s]
# Pour remplacer par une vidéo IA : même commande, même noms de sortie → aucun changement de code.
set -euo pipefail
SRC="$1"; LUT="$2"; DEBUT="${3:-0.4}"
OUT="public/media"
DUREE=6.0     # extrait utilisé (la main sort du geste vers 5,6 s : masqué par le fondu)
FONDU=0.5     # fondu de raccord → boucle de 5,5 s sans couture

# Boucle : la fin de l'extrait se fond dans son début
BOUCLE="[0:v]trim=start=${DEBUT}:duration=${DUREE},setpts=PTS-STARTPTS,fps=25,split[a][b];\
[a]trim=start=${FONDU},setpts=PTS-STARTPTS[corps];[b]trim=duration=${FONDU},setpts=PTS-STARTPTS[tete];\
[corps][tete]xfade=transition=fade:duration=${FONDU}:offset=$(awk "BEGIN{print $DUREE - 2*$FONDU}")"

# Étalonnage : noir profond, magenta du logo dans les reflets uniquement
GRADE="lut3d=${LUT},vignette=PI/5"

# Desktop 16:9 — miroir : flacon et brume à droite du panneau de texte
ffmpeg -v error -y -i "$SRC" -filter_complex "${BOUCLE}[l];[l]crop=2560:1440:86:0,hflip,${GRADE},scale=1920:1080,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 26 -movflags +faststart "$OUT/hero-pschitt-desktop.mp4"
ffmpeg -v error -y -i "$SRC" -filter_complex "${BOUCLE}[l];[l]crop=2560:1440:86:0,hflip,${GRADE},scale=1920:1080,format=yuv420p[v]" \
  -map "[v]" -an -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good -cpu-used 2 "$OUT/hero-pschitt-desktop.webm"

# Mobile 9:16 — tranche centrée sur le flacon et la main qui vaporise
ffmpeg -v error -y -i "$SRC" -filter_complex "${BOUCLE}[l];[l]crop=2560:1440:86:0,hflip,crop=810:1440:1060:0,${GRADE},scale=720:1280,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 26 -movflags +faststart "$OUT/hero-pschitt-mobile.mp4"

# Posters (première image)
ffmpeg -v error -y -i "$OUT/hero-pschitt-desktop.mp4" -frames:v 1 -c:v libwebp -quality 70 "$OUT/hero-pschitt-desktop.webp"
ffmpeg -v error -y -i "$OUT/hero-pschitt-mobile.mp4" -frames:v 1 -c:v libwebp -quality 70 "$OUT/hero-pschitt-mobile.webp"
ls -la "$OUT"/hero-pschitt-*
