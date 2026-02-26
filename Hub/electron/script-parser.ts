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

/**
 * Orchestrates the parsing of a PDF script file.
 * Automatically chooses between AI-enhanced parsing (if API key provided) and rule-based regex parsing.
 * @param filePath Path to the PDF file.
 * @param apiKey Optional Google Gemini API key for AI parsing.
 * @returns A promise resolving to a structured ParsedScript object.
 */
export async function parsePdfScript(filePath: string, apiKey?: string): Promise<ParsedScript> {
    console.log(`[Backend] Attempting to parse PDF: ${filePath} (AI Mode: ${!!apiKey})`);

    // Read the PDF file into a buffer
    const dataBuffer = fs.readFileSync(filePath);

    try {
        // Dynamically load the pdf-parse library using node's module system
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const pdfModule = require('pdf-parse');

        // Extract the parser function from the module (handles both CJS and ESM exports)
        let pdfParser: any;
        if (typeof pdfModule === 'function') {
            pdfParser = pdfModule;
        } else if (pdfModule && typeof pdfModule.default === 'function') {
            pdfParser = pdfModule.default;
        }

        // Test if the library was loaded correctly; if not, throw an error
        if (typeof pdfParser !== 'function') {
            console.error('[Backend] pdf-parse NOT a function. Module type:', typeof pdfModule, 'Keys:', Object.keys(pdfModule || {}));
            throw new Error('PDF parser bibliotheek kon niet als functie worden geladen.');
        }

        // Extract raw text content from the PDF
        const data = await pdfParser(dataBuffer);
        const text = data.text;
        console.log(`[Backend] PDF text extracted, length: ${text?.length || 0}`);

        // Test if an AI API key is provided and valid; if true, use AI for parsing
        if (apiKey && apiKey.trim().length > 10) {
            try {
                return await parseScriptWithAi(text, apiKey);
            } catch (aiErr) {
                // If AI parsing fails (e.g. rate limit, content block), fall back to regex
                console.error('[Backend] AI parsing failed, falling back to regex:', aiErr);
                return parseTextScript(text);
            }
        }

        // Default to regex-based text parsing if no AI key is available
        return parseTextScript(text);
    } catch (err: any) {
        console.error('[Backend] Error in parsePdfScript:', err);
        throw err;
    }
}

/**
 * Uses Google Gemini AI to analyze script text and extract acts and scenes.
 * @param text The raw text content of the script.
 * @param apiKey Google Gemini API key.
 * @returns Structured script data.
 */
async function parseScriptWithAi(text: string, apiKey: string): Promise<ParsedScript> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the Flash model for speed and efficiency
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construct a specific prompt to guide the AI in extracting theater/musical structure
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

    // Clean JSON response (strip markdown blocks if the AI included them)
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as ParsedScript;
}

/**
 * Rule-based script parser using Regular Expressions.
 * Analyzes script text line-by-line to find markers for acts, scenes, and descriptions.
 * @param text The raw script text.
 * @returns Structured script data.
 */
function parseTextScript(text: string): ParsedScript {
    // Split text into lines, trim whitespace, and remove empty lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result: ParsedScript = { acts: [] };

    let currentAct: ParsedAct | null = null;
    let currentScene: ParsedScene | null = null;

    // Detection Regular Expressions:
    // Matches "AKTE 1", "ACT II", "EERSTE AKTE", etc.
    const actRegex = /^(?:ACT|AKTE)\s+(?:(\d+)|([IVXLCDM]+)|(EEN|TWEE|DRIE|VIER|VIJF|ZES|ZEVEN|ACHT|NEGEN|TIEN))\b|^(EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE)\s+AKTE/i;
    // Matches "SCÈNE 1: [TITLE]"
    const structuralSceneRegex = /^(?:SCENE|SCÈNE)\s+(\d+)\s*[:.-]\s*(.+)$/i;
    // Matches "4a: [TITLE]" (common for musical numbers)
    const actionRegex = /^(\d{1,2}[a-z]?)\s*[:.-]\s*(.+)$/i;
    // Helper to ignore lines that look like years (e.g. "1906")
    const ignoreSceneStartRegex = /^\d{4}$/;
    // Matches "EINDE EERSTE AKTE"
    const endActRegex = /^EINDE\s+(?:EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE|LAATSTE)\s+AKTE/i;
    // Matches headers, footers, and legal noise
    const noiseRegex = /^(ANASTASIA\s*\/\s*\d+|©\s+|Repetitiescript|Auteursbureau|Tel:|E-mail:|www\.)/i;

    let inToc = false; // Flag to skip the Table of Contents
    let scriptStarted = false; // Flag to ignore text before the first Act marker
    let sceneCounter = 1;

    console.log(`[Parser] Starting parse of ${lines.length} lines`);

    // Iterate through all extracted lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Skip Noise / Page Headers
        if (noiseRegex.test(line)) continue;

        // 2. Detect TOC (Table of Contents) blocks to skip redundant item lists
        if (line.toUpperCase().includes('MUZIKALE NUMMERS') || line.toUpperCase().includes('INHOUD')) {
            inToc = true;
            continue;
        }

        // 3. Detect Start of Script to begin processing valid markers
        if (inToc || !scriptStarted) {
            // Test if current line is an Act marker; if so, we've found the start of the content
            if (actRegex.test(line)) {
                inToc = false;
                scriptStarted = true;
            } else if (!scriptStarted) {
                // Skip everything until the first Act is found
                continue;
            }
        }

        // 4. Capture "End of Act" markers
        if (endActRegex.test(line)) {
            console.log(`[Parser] Match End Act: ${line}`);
            currentAct = null;
            currentScene = null;
            continue;
        }

        // 5. Detect and Create new Act
        const actMatch = line.match(actRegex);
        if (actMatch) {
            console.log(`[Parser] Match Act: ${line}`);
            currentAct = {
                name: line.toUpperCase(),
                scenes: []
            };
            result.acts.push(currentAct);
            currentScene = null;
            // Reset local scene counter for each act
            sceneCounter = 1;
            continue;
        }

        // 6. Detect Scene or Action Item (e.g. musical number)
        const structMatch = line.match(structuralSceneRegex);
        const actionMatch = line.match(actionRegex);
        const match = structMatch || actionMatch;

        // Test if a marker was found and it's not a false positive (like a year)
        if (match && !ignoreSceneStartRegex.test(match[1])) {
            const originalId = match[1];
            const fullTitle = match[2].trim();

            // Ignore if the ID part is unusually long for a scene/number
            if (originalId.length > 3 && /^\d+$/.test(originalId)) continue;

            let sceneTitle = fullTitle;
            // Truncate title if it's excessively long (might be part of the dialogue/description)
            if (fullTitle.length > 80) {
                const parts = fullTitle.split(/\s+[\(\/]/);
                // Test if the first part before parenthesis/slash is reasonable
                if (parts[0].length < 80) sceneTitle = parts[0].trim();
            }

            // Test if the resulting title is within reasonable length for a menu item
            if (sceneTitle.length < 200) {
                // Auto-create Act 1 if a scene is found before an act marker (handles loose scripts)
                if (!currentAct) {
                    currentAct = { name: 'AKTE 1', scenes: [] };
                    result.acts.push(currentAct);
                }

                const displayTitle = structMatch ? `SCENE ${originalId}: ${sceneTitle}` : `${originalId}: ${sceneTitle}`;
                console.log(`[Parser] Match Item (${originalId}): ${displayTitle}`);

                // Create the scene object
                currentScene = {
                    id: sceneCounter++,
                    title: displayTitle,
                    description: fullTitle !== sceneTitle ? fullTitle : ''
                };
                currentAct.scenes.push(currentScene);
                continue;
            }
        }

        // 7. Collect Description text for the current scene
        if (currentScene) {
            // Test if the line looks like a character name followed by dialogue; if so, stop description collection
            if (/^[A-Z]{2,}(?:\s+[A-Z]{2,})*\s*:/.test(line)) {
                currentScene = null;
                continue;
            }

            // Append the line to the description if it hasn't reached the length limit
            if (currentScene.description.length < 1500) {
                // Add a space if there's already content
                if (currentScene.description.length > 0) {
                    currentScene.description += ' ';
                }
                currentScene.description += line;
            }

            // Implicit stop logic: if we find parentheses on a line alone, it's a stage direction we keep.
            if (line.startsWith('(') && line.endsWith(')')) {
                // Keep collecting
            }
        }
    }

    console.log(`[Parser] Finished. Found ${result.acts.length} acts.`);
    result.acts.forEach(a => console.log(` - Act ${a.name}: ${a.scenes.length} items`));

    return result;
}
