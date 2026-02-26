# LedShow VideoWall Agent Handleiding

Deze handleiding legt uit hoe je de VideoWall Agent installeert op een aparte computer (laptop, PC, of Raspberry Pi).

## 1. Benodigdheden

1.  **Node.js**: Installeer Node.js (v18 of hoger).
    *   Download: [nodejs.org](https://nodejs.org/) (Kies de LTS versie).
2.  **MPV Player**: De agent gebruikt MPV voor het afspelen van video's.
    *   **Windows**: Download de 'shinchiro' build van [deze link](https://sourceforge.net/projects/mpv-player-windows/files/64bit/).
    *   **Installatie**: Pak de MPV zip uit en zorg dat `mpv.exe` in je systeem-pad staat, OF plaats `mpv.exe` direct in deze agent map.

## 2. Installatie

1.  Pak de `ledshow-agent.zip` uit naar een map naar keuze.
2.  Zorg dat je het **start.bat** bestand (gegenereerd in de Host app) in deze map hebt geplaatst (naast `package.json`).

## 3. De Agent Starten

Er zijn twee manieren om de agent te starten:

### Optie A: Via het Start Script (Aanbevolen)
Dubbelklik op het bestand **start.bat**. Dit venster moet open blijven staan.

### Optie B: Handmatig (Voor gevorderden)
1. Open een terminal in deze map.
2. Voer het volgende commando uit:
   ```bash
   node dist/index.js
   ```

## 4. Configuratie via de Host

1.  Start de **LedShow Host** applicatie op de hoofdcomputer.
2.  Ga naar **Instellingen > Apparaten**.
3.  Klik op **Scan Netwerk**.
4.  De Agent verschijnt in de lijst. Klik op **Toevoegen**.
5.  De Host neemt automatisch de configuratie (Naam, Layout, Model) over van de Agent.

## 5. Problemen Oplessen

*   **Agent niet gevonden**: Controleer of beide computers op hetzelfde netwerk zitten. Check of de firewall poort `5566` (UDP) blokkeert.
*   **Video speelt niet**: Controleer of `mpv.exe` correct is geïnstalleerd. Test dit door `mpv --version` te typen in een terminal.
*   **Bestanden ontbreken**: Zorg dat je de volledige zip hebt uitgepakt, inclusief de `dist` map.

## 6. Sneltoetsen
*   **Ctrl+C**: Sluit de agent af in het terminal venster.
*   **Status pagina**: Ga naar `http://localhost:3000` op de agent computer voor instellingen en status.
