@echo off
title LedShow VideoWall Agent - Installatie
echo ============================================
echo   LedShow VideoWall Agent - Installatie
echo ============================================
echo.

:: Check Node.js
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FOUT] Node.js is niet gevonden.
    echo.
    echo Download en installeer Node.js LTS van:
    echo   https://nodejs.org/
    echo.
    echo Start daarna dit script opnieuw.
    pause
    exit /b
)

echo [OK] Node.js gevonden
node -v

:: Install dependencies
echo.
echo Bezig met installeren van afhankelijkheden...
npm install --production
if %ERRORLEVEL% NEQ 0 (
    echo [FOUT] Installatie van afhankelijkheden mislukt.
    pause
    exit /b
)

echo.
echo ============================================
echo   Installatie voltooid!
echo ============================================
echo.
echo Gebruik start.bat om de agent te starten.
echo.
pause
