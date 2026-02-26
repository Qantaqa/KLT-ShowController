# Handleiding: LedShow Applicatie Starten

Deze handleiding beschrijft hoe je de LedShow applicatie correct opstart en gebruikt buiten de ontwikkelomgeving.

## 1. Applicatie Starten

Na het bouwen van de applicatie (via `npm run build`), vind je de uitvoerbare bestanden in de `dist` map.

De snelste manier om de app te starten is via de 'unpacked' versie:
Locatie: `ledshow-app/dist/win-unpacked/ledshow-app.exe`

Dubbelklik op **`ledshow-app.exe`** om de applicatie te starten.

## 2. Bekende Problemen & Oplossingen

### Wit Scherm bij Opstarten
Als de applicatie start met een volledig wit scherm, betekent dit meestal dat de bestanden niet gevonden kunnen worden.
*   **Oorzaak:** De applicatie zoekt naar bestanden op de verkeerde locatie (absoluut vs relatief).
*   **Oplossing:** Dit is inmiddels in de code opgelost door `base: './'` toe te voegen aan de configuratie. Zorg dat je de nieuwste versie hebt gebouwd.
*   **Debuggen:** Druk in de applicatie op `Ctrl + Shift + I` om de ontwikkelaarstools te openen. Kijk in de 'Console' tab voor rode foutmeldingen.

### Firewall Melding
Bij de eerste keer opstarten kan Windows vragen om netwerktoegang.
*   **Actie:** Sta toegang toe voor zowel **Privé** als **Openbare** netwerken. Dit is essentieel voor de communicatie met de remote clients en tablets.

### Poort in Gebruik (EADDRINUSE)
Krijg je de melding "Applicatie is al actief" of een fout over poort 3001?
*   **Oorzaak:** Er draait al een instantie van de LedShow app (of de ontwikkelomgeving) op de achtergrond.
*   **Oplossing:** Sluit alle openstaande LedShow vensters en controleer Taakbeheer op hangende processen.

## 3. Bestanden en Data Location

De applicatie slaat zijn instellingen en database op in de gebruikersmap van Windows.
Locatie: `%APPDATA%\ledshow-app\`

Hier vind je:
*   `database.sqlite`: Alle show data en instellingen.
*   `assets/`: Geüploade bestanden zoals logo's.

Om de applicatie volledig te resetten, kun je deze map leegmaken (maar maak eerst een backup van je database!).

## 4. PDF en Media Bestanden

Zorg dat PDF scripts en mediabestanden op een locatie staan waar de gebruiker leesrechten heeft. De applicatie probeert deze bestanden direct van de schijf te lezen via absolute paden.
