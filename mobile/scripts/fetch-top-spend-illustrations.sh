#!/usr/bin/env bash
# Downloads the "Top spend" illustrations (Figma: LogIt · v1 → "Ask LogIt · mark (no sparkle)")
# into assets/illustrations/top-spend and shrinks them for the app.
# Run once from the mobile folder:  bash scripts/fetch-top-spend-illustrations.sh
# The Figma links expire on 29 Nov 2026. After that, export the frames
# "Illustration / Top spend / …" from Figma as PNG into the same folder instead.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/illustrations/top-spend
mkdir -p "$OUT"
while read -r name id; do
  [ -z "$name" ] && continue
  echo "↓ $name"
  curl -fsSL -o "$OUT/$name.png" "https://www.figma.com/api/mcp/asset/$id.png"
  # 1584×672 → 1080 wide: sharp on any phone, a fraction of the size
  if command -v sips >/dev/null; then sips -Z 1080 "$OUT/$name.png" >/dev/null; fi
done <<'LIST'
food 99356f8e-e525-4067-8de9-731b98e6c923
transport 92bb567b-248a-42c8-9a36-8bc57ab4d30e
airtime 72830557-2e28-4302-bf43-9679c8aff4e0
people 10ce04df-c2f0-42c0-8c4a-ed1184be1c4c
bills fcc43246-1d1d-44c9-9da7-5bc0e51f59f1
shopping 55fcd050-62e8-4cdb-a5a7-064a41e1eb52
fees 4c894aec-c087-4314-a5be-3aa2431332fc
other 8912d03c-51c9-4c78-9f97-bee95b5f0e81
LIST
ls -la "$OUT"
echo "Done. Reload the app."
