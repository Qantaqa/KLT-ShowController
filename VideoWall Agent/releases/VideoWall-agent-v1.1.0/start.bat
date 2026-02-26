@echo off
title LedShow VideoWall Agent - %AGENT_NAME%
REM ============================================
REM  LedShow VideoWall Agent - Start Script
REM  Gegenereerd door de LedShow Hub
REM ============================================
REM
REM  Configuratie (aangepast per installatie):
set AGENT_NAME=VideoWall-Agent
set AGENT_MODEL=4-screen
set AGENT_LAYOUT=2x2
set AGENT_ORIENTATION=landscape
set AGENT_PORT=3000

echo --- LedShow VideoWall Agent ---
echo Naam:        %AGENT_NAME%
echo Model:       %AGENT_MODEL%
echo Layout:      %AGENT_LAYOUT%
echo Orientatie:  %AGENT_ORIENTATION%
echo Poort:       %AGENT_PORT%
echo ---

:: Check Node.js
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FOUT] Node.js is niet gevonden. Installeer Node.js en probeer het opnieuw.
    pause
    exit /b
)

:: Check compiled files
if not exist "dist\index.js" (
    echo [FOUT] De gecompileerde software (dist/index.js) ontbreekt.
    echo Zorg dat je de volledige zip hebt uitgepakt.
    pause
    exit /b
)

:: Check dependencies
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