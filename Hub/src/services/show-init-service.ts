import type { ShowEvent } from './xml-service';

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

class ShowInitService {
    private isHost = !!(window as any).require;

    async initializeShowEvents(scriptPath?: string): Promise<ShowEvent[]> {
        const events: ShowEvent[] = [];

        // 1. Add Pre-show with custom actions
        this.addAct(events, 'Pre-show', [
            { id: 1, title: 'Show klaarzetten', description: '' },
            { id: 2, title: 'Logo show op hoofdbeamer projecteren (local monitor)', description: '' },
            { id: 3, title: 'Sponsoren video starten', description: '' },
            { id: 4, title: 'Wacht op signaal go-show', description: '' },
            { id: 5, title: 'Sponsoren video uitzetten', description: '' }
        ]);

        if (scriptPath && this.isHost) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                const parsedScript: ParsedScript = await ipcRenderer.invoke('db:parse-script', scriptPath);

                if (parsedScript && parsedScript.acts.length > 0) {
                    parsedScript.acts.forEach((act, actIdx) => {
                        this.addAct(events, act.name, act.scenes);

                        // Add Pauze between acts (except after the last one)
                        if (actIdx < parsedScript.acts.length - 1) {
                            this.addPauzeAct(events);
                        }
                    });
                } else {
                    this.addDefaultActs(events);
                }
            } catch (err) {
                console.error('Failed to parse script, using defaults', err);
                this.addDefaultActs(events);
            }
        } else {
            this.addDefaultActs(events);
        }

        // 2. Add Post-show with custom actions
        this.addAct(events, 'Post-show', [
            { id: 1, title: 'Dank betuiging', description: '' },
            { id: 2, title: 'Uitloop zaal', description: '' }
        ]);

        return events;
    }

    private addDefaultActs(events: ShowEvent[]) {
        this.addAct(events, 'Act 1', [{ id: 1, title: 'Opening', description: '' }]);
        this.addPauzeAct(events);
        this.addAct(events, 'Act 2', [{ id: 1, title: 'Vervolg', description: '' }]);
    }

    private addPauzeAct(events: ShowEvent[]) {
        this.addAct(events, 'Pauze', [
            { id: 1, title: 'Sponsorbeamer - Tonen pauze filmpje', description: '' },
            { id: 2, title: 'Sponsobeamer - tonen Sponsoren video', description: '' },
            { id: 3, title: 'Show act twee klaarzetten', description: '' },
            { id: 4, title: 'Sponsoren uit', description: '' }
        ]);
    }

    private addAct(events: ShowEvent[], actName: string, scenes: ParsedScene[]) {
        scenes.forEach((scene) => {
            // Add Title event
            events.push({
                act: actName,
                sceneId: scene.id,
                eventId: 1,
                type: 'Title',
                cue: scene.title || 'Nieuwe Scene',
                fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
            });

            // Add Comment event with description if present
            events.push({
                act: actName,
                sceneId: scene.id,
                eventId: 1, // Store logic often groups by sceneId, multiple events per scene
                type: 'Comment',
                cue: scene.description || 'Opmerkingen',
                fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
            });
        });
    }
}

export const showInitService = new ShowInitService();
