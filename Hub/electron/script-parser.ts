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
 * Parses a PDF script file with rule-based text extraction (pdf-parse + regex).
 * @param filePath Path to the PDF file.
 */
export async function parsePdfScript(filePath: string): Promise<ParsedScript> {
    console.log(`[Backend] Attempting to parse PDF: ${filePath}`);

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

        return parseTextScript(text);
    } catch (err: any) {
        console.error('[Backend] Error in parsePdfScript:', err);
        throw err;
    }
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
