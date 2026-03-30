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
set AGENT_PORT=3003

REM Exit codes:
REM   42 = clean stop (geen herstart)
REM   43 = host shutdown
REM   overig = herstart

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
    exit /b 1
)

:: Check compiled files
if not exist "dist\index.js" (
    echo [FOUT] De gecompileerde software (dist/index.js) ontbreekt.
    echo Zorg dat je de volledige zip hebt uitgepakt.
    pause
    exit /b 1
)

:: Check dependencies
if not exist "node_modules" (
    echo [INFO] Afhankelijkheden ontbreken. Voer eerst install.bat uit.
    pause
    exit /b 1
)

:LOOP
echo [%TIME%] Starting VideoWall Agent: %AGENT_NAME% (%AGENT_MODEL% %AGENT_LAYOUT%)
node dist/index.js
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% EQU 42 (
    echo [%TIME%] Agent gestopt (clean stop, exitcode 42). Geen herstart.
    exit /b 0
)
if %EXIT_CODE% EQU 43 (
    echo [%TIME%] Host shutdown gevraagd (exitcode 43)...
    shutdown /s /t 5
    exit /b 0
)
if %EXIT_CODE% EQU 0 (
    echo [%TIME%] Agent gestopt (exitcode 0). Herstart over 3s...
)
if %EXIT_CODE% NEQ 0 (
    echo [%TIME%] Agent gestopt met foutcode %EXIT_CODE%. Herstart over 5s...
    timeout /t 2 /nobreak >nul
)

timeout /t 3 /nobreak >nul
goto LOOP