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
export AGENT_PORT="3003"

# Exit codes:
#   0  = normaal stoppen (geen herstart)
#   1  = herstart gewenst (update, crash, etc.)
#   42 = clean stop (geen herstart, geen shutdown)
#   43 = host shutdown gevraagd

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

# ---- Herstart loop ----
while true; do
    echo "[$(date '+%H:%M:%S')] Starting VideoWall Agent: $AGENT_NAME ($AGENT_MODEL $AGENT_LAYOUT)"
    node dist/index.js
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 42 ]; then
        echo "[$(date '+%H:%M:%S')] Agent gestopt (clean stop, exitcode 42). Geen herstart."
        exit 0
    elif [ $EXIT_CODE -eq 43 ]; then
        echo "[$(date '+%H:%M:%S')] Host shutdown gevraagd (exitcode 43)..."
        sudo shutdown -h now
        exit 0
    elif [ $EXIT_CODE -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] Agent gestopt met exitcode 0. Herstart over 3s..."
    else
        echo "[$(date '+%H:%M:%S')] Agent gestopt met foutcode $EXIT_CODE. Herstart over 5s..."
        sleep 2
    fi

    sleep 3
done
