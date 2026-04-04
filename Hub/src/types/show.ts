import type { Device, ProjectionMask } from './devices';

export interface ShowEvent {
    act: string
    sceneId?: number
    eventId?: number
    actionId?: number
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
    /** Stagehand (type action): wanneer iets moet gebeuren (vrije tekst). */
    actionCueMoment?: string
    /** Stagehand: wie voert uit (naam/rol). */
    actionAssignee?: string
    /** Stagehand: positie op scriptpagina 0–1 t.o.v. gerenderde PDF-viewport. */
    scriptMarkerNorm?: { x: number; y: number }
    /** Stagehand: in show afgevinkt; bij show-start gereset. */
    actionCompleted?: boolean
    cue?: string
    type?: string
    filename?: string
    duration?: number
    /** Seconds recorded per show run when "timing bijhouden" is on; stored on the transition trigger row */
    timingSamples?: number[]
    segmentId?: number
    effectId?: number
    paletteId?: number
    stopAct?: string
    stopSceneId?: number
    stopEventId?: number
    mediaTriggerId?: string
    /** Per-cue projection polygons for local_monitor (percent coords); empty/omit = full frame */
    projectionMasks?: ProjectionMask[]
}

export interface ClipboardItem {
    id: number
    type: string
    data: ShowEvent
    timestamp: string
}

/**
 * Metadata and persistent settings for a specific Show project.
 */
export interface ShowProfile {
    id: string                  // Database UUID
    name: string                // Display name of the show
    pdfPath: string             // Path to the primary script PDF
    totalPages?: number          // Total pages in the script (populated after parse)
    sidebarWidth?: number       // UI preference for sidebar size
    invertScriptColors?: boolean // UI preference for dark/light script display
    schedule?: Record<number, { time1: string; time2: string }> // Automated show triggers per day
    viewState?: {
        collapsedGroups?: Record<string, boolean> // Saved collapse/expand states for Edit Mode
        currentScriptPage?: number                // Last viewed page
        sceneNames?: Record<string, string>       // Custom labels for scene groups
        /** `${actId}-${sceneId}` → PDF/script pagina voor deze scene (los van event-Pg). */
        sceneScriptPages?: Record<string, number>
        /** Edit-modus: toon sleepgrepen i.p.v. ⋮-menu op boom en rijen. */
        sequenceReorderMode?: boolean
    }
    devices?: Device[]          // Show-specific device overrides
}

/**
 * Application-wide configuration stored in the database.
 */
export interface AppSettingsProfile {
    defaultLogo: string         // Base64 or path to the project logo
    accessPin: string           // 4-digit PIN for remote client authorization
    serverPort: number          // Port for the Socket.io hub
    serverIp: string            // IP address of the host machine
    controllerMonitorIndex?: number // Which monitor the main dashboard should open on
    /** Legacy DB column / dev test video path (App Settings UI) */
    testVideoPath?: string
    devices: Device[]           // Global device list (available to all shows)
    pincodes?: {
        showDetails?: string
    }
    clientConfigs?: Record<string, { // Per-client UI preferences (webcams, previews)
        isCameraActive?: boolean
        isSelfPreviewVisible?: boolean
        selectedCameraClients?: string[]
        lastSeen?: number
    }>
    /** WLED peek live strip + WiZ kleurstrook in sequence grid en licht-editor (standaard aan). */
    lightStripPreviewEnabled?: boolean
}

export interface KeyboardBinding {
    id: string
    key: string
    ctrl: boolean
    shift: boolean
    alt: boolean
    action: 'nextEvent' | 'nextScene' | 'nextAct' | 'nextSmart' | 'stopAll' | 'pageUp' | 'pageDown'
    label?: string
}
