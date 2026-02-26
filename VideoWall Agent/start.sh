#!/bin/bash
# ============================================
#  LedShow VideoWall Agent - Start Script
#  Gegenereerd door de LedShow Hub
# ============================================

# Configuratie (aangepast per installatie):
export AGENT_NAME="VideoWall-Agent"
export AGENT_MODEL="4-screen"
export AGENT_LAYOUT="2x2"
export AGENT_ORIENTATION="landscape"
export AGENT_PORT="3000"

echo "--- LedShow VideoWall Agent ---"
echo "Naam:        $AGENT_NAME"
echo "Model:       $AGENT_MODEL"
echo "Layout:      $AGENT_LAYOUT"
echo "Orientatie:  $AGENT_ORIENTATION"
echo "Poort:       $AGENT_PORT"
echo "---"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[FOUT] Node.js is niet gevonden."
    exit 1
fi

# Check compiled files
if [ ! -f "dist/index.js" ]; then
    echo "[FOUT] dist/index.js ontbreekt. Pak de volledige zip uit."
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Afhankelijkheden ontbreken. Voer eerst ./install.sh uit."
    exit 1
fi

echo "Starting VideoWall Agent: $AGENT_NAME ($AGENT_MODEL $AGENT_LAYOUT)"
node dist/index.js
