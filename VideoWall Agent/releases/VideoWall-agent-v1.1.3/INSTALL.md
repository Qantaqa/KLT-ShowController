# LedShow VideoWall Agent — Installatiehandleiding

## Systeemvereisten

- **Node.js** v18 of hoger ([download](https://nodejs.org/))
- **Google Chrome**, Microsoft Edge, of Chromium
- Windows 10/11, of Raspberry Pi OS (Debian/Ubuntu)

## Snelinstallatie (Windows)

1. Pak de ZIP uit naar een map, bijv. `C:\LedShow-Agent\`
2. Dubbelklik op **`install.bat`** → installeert de afhankelijkheden
3. Dubbelklik op **`start.bat`** → start de agent

De agent opent automatisch:
- **Output scherm** (`http://localhost:3003/output`) — dit is het scherm voor de LED wall
- **Status dashboard** (`http://localhost:3003`) — dit is de bedieningspagina

## Snelinstallatie (Raspberry Pi / Linux)

```bash
# 1. Pak uit
unzip VideoWall-agent-v1.1.0.zip -d ~/VideoWall-agent
cd ~/VideoWall-agent

# 2. Maak scripts uitvoerbaar
chmod +x install.sh start.sh

# 3. Installeer
./install.sh

# 4. Start
./start.sh
```

## Configuratie

De `start.bat` / `start.sh` bevat de configuratie als environment variabelen:

| Variabele | Beschrijving | Voorbeeld |
|-----------|-------------|-----------|
| `AGENT_NAME` | Naam van deze agent (uniek per wall) | `VideoWall-Links` |
| `AGENT_MODEL` | Aantal schermen | `4-screen` |
| `AGENT_LAYOUT` | Schermindeling | `2x2`, `1x4`, `4x1` |
| `AGENT_ORIENTATION` | Schermoriëntatie | `landscape`, `portrait` |
| `AGENT_PORT` | Poort voor webserver | `3003` |

> **Let op:** De Hub genereert automatisch een `start.bat` met de juiste instellingen.

## Raspberry Pi: Automatisch starten

### 1. Systemd service aanmaken

```bash
sudo nano /etc/systemd/system/VideoWall-agent.service
```

Inhoud:
```ini
[Unit]
Description=LedShow VideoWall Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/VideoWall-agent
ExecStart=/usr/bin/node dist/index.js
Environment=AGENT_NAME=VideoWall-Agent
Environment=AGENT_MODEL=4-screen
Environment=AGENT_LAYOUT=2x2
Environment=AGENT_PORT=3003
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable VideoWall-agent
sudo systemctl start VideoWall-agent
```

### 2. Chromium autostart in kiosk mode

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/VideoWall-output.desktop
```

Inhoud:
```ini
[Desktop Entry]
Type=Application
Name=VideoWall Output
Exec=chromium-browser --kiosk --disable-infobars --noerrdialogs --disable-translate --no-first-run http://localhost:3003/output
```

### 3. Schermbeveiliging uitschakelen

```bash
sudo raspi-config
# → Display Options → Screen Blanking → Off
```

---

## Hub Integratie

De Hub genereert een `start.bat` voor elke agent. Hieronder het template:

### start.bat Template

```batch
@echo off
title LedShow VideoWall Agent - {{AGENT_NAME}}
set AGENT_NAME={{AGENT_NAME}}
set AGENT_MODEL={{AGENT_MODEL}}
set AGENT_LAYOUT={{AGENT_LAYOUT}}
set AGENT_ORIENTATION={{AGENT_ORIENTATION}}
set AGENT_PORT={{AGENT_PORT}}

echo --- LedShow VideoWall Agent ---
echo Naam:        %AGENT_NAME%
echo Model:       %AGENT_MODEL%
echo Layout:      %AGENT_LAYOUT%
echo Orientatie:  %AGENT_ORIENTATION%
echo Poort:       %AGENT_PORT%
echo ---

node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FOUT] Node.js is niet gevonden. Installeer Node.js en probeer het opnieuw.
    pause
    exit /b
)

if not exist "dist\index.js" (
    echo [FOUT] De gecompileerde software ontbreekt.
    echo Zorg dat je de volledige zip hebt uitgepakt.
    pause
    exit /b
)

if not exist "node_modules" (
    echo [INFO] Afhankelijkheden ontbreken. Voer eerst install.bat uit.
    pause
    exit /b
)

echo Starting VideoWall Agent: %AGENT_NAME% (%AGENT_MODEL% %AGENT_LAYOUT%)
node dist/index.js
if %ERRORLEVEL% NEQ 0 (
    echo Agent is onverwacht gestopt (Error Code: %ERRORLEVEL%).
    pause
)
```

### Template variabelen

| Placeholder | Hub formulierveld | Voorbeeld |
|------------|-------------------|-----------|
| `{{AGENT_NAME}}` | Agent naam (tekst) | `VideoWall-Links` |
| `{{AGENT_MODEL}}` | Aantal schermen + "-screen" | `4-screen` |
| `{{AGENT_LAYOUT}}` | Layout selectie | `2x2` |
| `{{AGENT_ORIENTATION}}` | Oriëntatie selectie | `landscape` |
| `{{AGENT_PORT}}` | Poort (standaard 3003) | `3003` |
