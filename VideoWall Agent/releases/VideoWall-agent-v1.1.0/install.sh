#!/bin/bash
echo "============================================"
echo "  LedShow VideoWall Agent - Installatie"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[FOUT] Node.js is niet gevonden."
    echo ""
    echo "Installeer Node.js:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    exit 1
fi

echo "[OK] Node.js gevonden: $(node -v)"

# Install dependencies
echo ""
echo "Bezig met installeren van afhankelijkheden..."
npm install --production

if [ $? -ne 0 ]; then
    echo "[FOUT] Installatie van afhankelijkheden mislukt."
    exit 1
fi

echo ""
echo "============================================"
echo "  Installatie voltooid!"
echo "============================================"
echo ""
echo "Gebruik ./start.sh om de agent te starten."
echo ""
