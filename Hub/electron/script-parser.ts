import fs from 'node:fs';

export interface ParsedScene {
    id: number;
    title: string;
    description: string;
}

export interface ParsedAct {
    name: string;
    scenes: ParsedScene[];
}

export interface ParsedScript {
    acts: ParsedAct[];
}

export async function parsePdfScript(filePath: string, apiKey?: string): Promise<ParsedScript> {
    console.log(`[Backend] Attempting to parse PDF: ${filePath} (AI Mode: ${!!apiKey})`);
    const dataBuffer = fs.readFileSync(filePath);

    try {
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const pdfModule = require('pdf-parse');

        // Very robust function extraction
        let pdfParser: any;
        if (typeof pdfModule === 'function') {
            pdfParser = pdfModule;
        } else if (pdfModule && typeof pdfModule.default === 'function') {
            pdfParser = pdfModule.default;
        }

        if (typeof pdfParser !== 'function') {
            console.error('[Backend] pdf-parse NOT a function. Module type:', typeof pdfModule, 'Keys:', Object.keys(pdfModule || {}));
            throw new Error('PDF parser bibliotheek kon niet als functie worden geladen.');
        }

        const data = await pdfParser(dataBuffer);
        const text = data.text;
        console.log(`[Backend] PDF text extracted, length: ${text?.length || 0}`);

        if (apiKey && apiKey.trim().length > 10) {
            try {
                return await parseScriptWithAi(text, apiKey);
            } catch (aiErr) {
                console.error('[Backend] AI parsing failed, falling back to regex:', aiErr);
                return parseTextScript(text);
            }
        }

        return parseTextScript(text);
    } catch (err: any) {
        console.error('[Backend] Error in parsePdfScript:', err);
        throw err;
    }
}

async function parseScriptWithAi(text: string, apiKey: string): Promise<ParsedScript> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Je bent een expert in het analyseren van theater-scripts voor een show-control systeem.
    Analyseer het volgende script en extraheer de structuur in JSON formaat.
    
    RICHTLIJNEN:
    1. Identificeer Akten (bijv. "AKTE 1", "AKTE 2").
    2. Identificeer Scenes binnen elke akte. Let op: er is vaak een hiërarchie tussen locaties (SCENE 1: ...) en muzieknummers/acties (1: Opening, 4a: Reprise).
    3. Extraheer voor elke regel:
       - title: De titel van de scene of het nummer (bijv. "SCENE 1: Park" of "4a: In mijn droom").
       - description: Een korte sfeeromschrijving of regie-aanwijzing indien direct beschikbaar onder de titel.
    4. Sla de inhoudsopgave (Table of Contents) over.
    5. Geef ALLEEN de JSON terug, geen extra tekst.
    
    JSON SCHEMA:
    {
      "acts": [
        {
          "name": "AKTE EEN",
          "scenes": [
            { "id": 1, "title": "SCENE 1: PALEIS", "description": "1906. Een kleine slaapkamer." },
            { "id": 2, "title": "2: Ooit In Winterse Dagen", "description": "Lied Keizerin-moeder" }
          ]
        }
      ]
    }

    SCRIPT TEKST:
    ${text.substring(0, 50000)} 
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Clean JSON response (remove markdown if present)
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as ParsedScript;
}

function parseTextScript(text: string): ParsedScript {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result: ParsedScript = { acts: [] };

    let currentAct: ParsedAct | null = null;
    let currentScene: ParsedScene | null = null;

    // Detection regex
    const actRegex = /^(?:ACT|AKTE)\s+(?:(\d+)|([IVXLCDM]+)|(EEN|TWEE|DRIE|VIER|VIJF|ZES|ZEVEN|ACHT|NEGEN|TIEN))\b|^(EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE)\s+AKTE/i;
    const structuralSceneRegex = /^(?:SCENE|SCÈNE)\s+(\d+)\s*[:.-]\s*(.+)$/i;
    const actionRegex = /^(\d{1,2}[a-z]?)\s*[:.-]\s*(.+)$/i;
    const ignoreSceneStartRegex = /^\d{4}$/; // Ignore years
    const endActRegex = /^EINDE\s+(?:EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE|LAATSTE)\s+AKTE/i;
    const noiseRegex = /^(ANASTASIA\s*\/\s*\d+|©\s+|Repetitiescript|Auteursbureau|Tel:|E-mail:|www\.)/i;

    let inToc = false;
    let scriptStarted = false;
    let sceneCounter = 1;

    console.log(`[Parser] Starting parse of ${lines.length} lines`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Detect Noise / Page Headers
        if (noiseRegex.test(line)) continue;

        // 2. Detect TOC (Table of Contents)
        if (line.toUpperCase().includes('MUZIKALE NUMMERS') || line.toUpperCase().includes('INHOUD')) {
            inToc = true;
            continue;
        }

        // 3. Detect Start of Script (exit TOC)
        if (inToc || !scriptStarted) {
            // Once we see "EERSTE AKTE" or a major Scene/Act marker, we are in the script
            if (actRegex.test(line)) {
                inToc = false;
                scriptStarted = true;
            } else if (!scriptStarted) {
                // If we haven't started yet and it's not an act, skip
                continue;
            }
        }

        // 4. Match End of Act
        if (endActRegex.test(line)) {
            console.log(`[Parser] Match End Act: ${line}`);
            currentAct = null;
            currentScene = null;
            continue;
        }

        // 5. Match Act
        const actMatch = line.match(actRegex);
        if (actMatch) {
            console.log(`[Parser] Match Act: ${line}`);
            currentAct = {
                name: line.toUpperCase(),
                scenes: []
            };
            result.acts.push(currentAct);
            currentScene = null;
            sceneCounter = 1;
            continue;
        }

        // 6. Match Structural Scene or Action
        const structMatch = line.match(structuralSceneRegex);
        const actionMatch = line.match(actionRegex);
        const match = structMatch || actionMatch;

        if (match && !ignoreSceneStartRegex.test(match[1])) {
            const originalId = match[1];
            const fullTitle = match[2].trim();

            // Ignore if it looks like a year or date
            if (originalId.length > 3 && /^\d+$/.test(originalId)) continue;

            let sceneTitle = fullTitle;
            if (fullTitle.length > 80) {
                const parts = fullTitle.split(/\s+[\(\/]/);
                if (parts[0].length < 80) sceneTitle = parts[0].trim();
            }

            if (sceneTitle.length < 200) {
                if (!currentAct) {
                    currentAct = { name: 'AKTE 1', scenes: [] };
                    result.acts.push(currentAct);
                }

                const displayTitle = structMatch ? `SCENE ${originalId}: ${sceneTitle}` : `${originalId}: ${sceneTitle}`;
                console.log(`[Parser] Match Item (${originalId}): ${displayTitle}`);

                currentScene = {
                    id: sceneCounter++,
                    title: displayTitle,
                    description: fullTitle !== sceneTitle ? fullTitle : ''
                };
                currentAct.scenes.push(currentScene);
                continue;
            }
        }

        // 7. Collect Description
        if (currentScene) {
            // Stop on character names or clear dialogue markers
            if (/^[A-Z]{2,}(?:\s+[A-Z]{2,})*\s*:/.test(line)) {
                currentScene = null;
                continue;
            }

            // Append to description if not noise
            if (currentScene.description.length < 1500) {
                if (currentScene.description.length > 0) {
                    currentScene.description += ' ';
                }
                currentScene.description += line;
            }

            // If we find parentheses (Stage directions), keep collecting, but stop on solo lines
            if (line.startsWith('(') && line.endsWith(')')) {
                // Good description line
            }
        }
    }

    console.log(`[Parser] Finished. Found ${result.acts.length} acts.`);
    result.acts.forEach(a => console.log(` - Act ${a.name}: ${a.scenes.length} items`));

    return result;
}
