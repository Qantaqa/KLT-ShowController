import type { ShowEvent } from '../types/show';

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
 * Service responsible for the initial creation and structuring of a new show.
 * Handles the generation of Pre-show, Post-show, and scripted Acts/Scenes.
 */
class ShowInitService {
    // Determine if the current execution context is the Electron Host (has filesystem access)
    private isHost = !!(window as any).require;

    /**
     * Generates a complete list of show events based on an optional script file.
     * Guaranteed to return a valid sequence even if parsing fails or no script is provided.
     * 
     * @param scriptPath Optional absolute path to a PDF script file.
     * @returns A promise resolving to an array of ShowEvent objects.
     */
    async initializeShowEvents(scriptPath?: string): Promise<ShowEvent[]> {
        const events: ShowEvent[] = [];

        // --- Step 1: Pre-show Setup ---
        // Always add standardized pre-show actions (technical readiness checks)
        this.addAct(events, 'Pre-show', [
            { id: 1, title: 'Show klaarzetten', description: '' },
            { id: 2, title: 'Logo show op hoofdbeamer projecteren (local monitor)', description: '' },
            { id: 3, title: 'Sponsoren video starten', description: '' },
            { id: 4, title: 'Wacht op signaal go-show', description: '' },
            { id: 5, title: 'Sponsoren video uitzetten', description: '' }
        ]);

        // --- Step 2: Content Generation ---
        // Test if a script path is provided and we are authorized to parse it
        if (scriptPath && this.isHost) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                // Invoke the script parser via Electron IPC (delegated to main process for PDF handling)
                const parsedScript: ParsedScript = await ipcRenderer.invoke('db:parse-script', scriptPath);

                // Test if the parser returned a valid structure with content
                if (parsedScript && parsedScript.acts.length > 0) {
                    parsedScript.acts.forEach((act, actIdx) => {
                        // Transform the parsed act into show events
                        this.addAct(events, act.name, act.scenes);

                        // Layout Rule: Automatically insert a 'Pauze' block between all main acts
                        if (actIdx < parsedScript.acts.length - 1) {
                            this.addPauzeAct(events);
                        }
                    });
                } else {
                    // Fallback: Parser succeeded but found no content (empty/unsupported PDF)
                    this.addDefaultActs(events);
                }
            } catch (err) {
                // Error handling: if parsing fails (file locked, corrupt PDF), gracefully use default structure
                console.error('Failed to parse script, using defaults', err);
                this.addDefaultActs(events);
            }
        } else {
            // Default Case: No script provided or running in remote/browser mode
            this.addDefaultActs(events);
        }

        // --- Step 3: Post-show Cleanup ---
        // Append standardized closing actions
        this.addAct(events, 'Post-show', [
            { id: 1, title: 'Dank betuiging', description: '' },
            { id: 2, title: 'Uitloop zaal', description: '' }
        ]);

        return events;
    }

    /**
     * Populates a basic fallback structure (Act 1 -> Pauze -> Act 2).
     */
    private addDefaultActs(events: ShowEvent[]) {
        this.addAct(events, 'Act 1', [{ id: 1, title: 'Opening', description: '' }]);
        this.addPauzeAct(events);
        this.addAct(events, 'Act 2', [{ id: 1, title: 'Vervolg', description: '' }]);
    }

    /**
     * Adds a specialized intermission block with technical transition cues.
     */
    private addPauzeAct(events: ShowEvent[]) {
        this.addAct(events, 'Pauze', [
            { id: 1, title: 'Sponsorbeamer - Tonen pauze filmpje', description: '' },
            { id: 2, title: 'Sponsobeamer - tonen Sponsoren video', description: '' },
            { id: 3, title: 'Show act twee klaarzetten', description: '' },
            { id: 4, title: 'Sponsoren uit', description: '' }
        ]);
    }

    /**
     * Translates high-level Scene objects into low-level ShowEvent sequences.
     * Creates a 'Title' marker and a 'Comment' field for each scene.
     * 
     * @param events The array to append to.
     * @param actName The name of the parent act.
     * @param scenes Array of parsed scene definitions.
     */
    private addAct(events: ShowEvent[], actName: string, scenes: ParsedScene[]) {
        scenes.forEach((scene) => {
            // Marker 1: Title event (Visible in the main event grid)
            events.push({
                act: actName,
                sceneId: scene.id,
                eventId: 1,
                type: 'Title',
                cue: scene.title || 'Nieuwe Scene',
                fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
            });

            // Marker 2: Comment event (Stores stage directions or script dialogue)
            events.push({
                act: actName,
                sceneId: scene.id,
                eventId: 1, // Note: Shared eventId 1 is corrected by the store during re-index
                type: 'Comment',
                cue: scene.description || 'Opmerkingen',
                fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
            });
        });
    }
}

export const showInitService = new ShowInitService();
