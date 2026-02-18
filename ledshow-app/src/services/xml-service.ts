import { XMLParser } from 'fast-xml-parser'

export interface ShowEvent {
    act: string
    sceneId: number
    eventId: number
    fixture: string
    effect: string
    palette: string
    color1: string
    color2: string
    color3: string
    brightness: number
    speed: number
    intensity: number
    transition: number
    sound: boolean
    scriptPg?: number
    cue?: string
    type?: string
    filename?: string
    duration?: number
}

export class XmlService {
    private parser: XMLParser

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        })
    }

    parseShow(xmlContent: string): ShowEvent[] {
        const jsonObj = this.parser.parse(xmlContent)
        const rows = jsonObj.DataGridData?.Data?.Row || []
        return Array.isArray(rows) ? rows.map(this.mapEvent) : [this.mapEvent(rows)]
    }

    private mapEvent(raw: any): ShowEvent {
        return {
            act: raw.colAct || '',
            sceneId: parseInt(raw.colSceneId) || 0,
            eventId: parseInt(raw.colEventId) || 0,
            fixture: raw.colFixture || '',
            effect: raw.colEffect || '',
            palette: raw.colPalette || '',
            color1: raw.colColor1 || '#000000',
            color2: raw.colColor2 || '#000000',
            color3: raw.colColor3 || '#000000',
            brightness: raw.colBrightness !== undefined ? parseInt(raw.colBrightness) : 255,
            speed: raw.colSpeed !== undefined ? parseInt(raw.colSpeed) : 127,
            intensity: raw.colIntensity !== undefined ? parseInt(raw.colIntensity) : 127,
            transition: raw.colTransition !== undefined ? parseInt(raw.colTransition) : 0,
            sound: raw.colSound === 'True',
            scriptPg: raw.ScriptPg ? parseInt(raw.ScriptPg) : undefined,
            cue: raw.colCue || '',
            type: raw.colType || '',
            filename: raw.colFilename || '',
            duration: raw.Duration ? parseInt(raw.Duration) : undefined
        }
    }
}
