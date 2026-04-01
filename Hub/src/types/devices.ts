/**
 * Supported hardware and software device types.
 * 'wled': WLED-based LED controllers (HTTP).
 * 'wiz': WiZ Smart Lights (UDP).
 * 'local_monitor': Locally attached displays (Electron projection).
 * 'remote_VideoWall': Web-based projection clients (Socket.io).
 * 'videowall_agent': Professional Videowall hardware nodes (WS/HTTP).
 */
export type DeviceType = 'wled' | 'wiz' | 'local_monitor' | 'remote_VideoWall' | 'videowall_agent';

/**
 * Common properties shared by all discoverable devices.
 */
export interface BaseDevice {
    id: string;
    name: string;
    type: DeviceType;
    enabled: boolean;
    mac?: string;
}

/**
 * Configuration for WLED-powered pixel controllers.
 */
export interface WLEDDevice extends BaseDevice {
    type: 'wled';
    ip: string;
    segments: {             // List of configured pixel segments on the device
        id: number
        name: string
        start: number
        stop: number
        offset: number
        group: number
        spc: number
        rev: boolean
        mi: boolean
        bri?: number
    }[]
}

/**
 * Configuration for WiZ smart bulbs and panels.
 */
export interface WiZDevice extends BaseDevice {
    type: 'wiz';
    ip: string;
    fadeInTime?: number;
    fadeOutTime?: number;
    transitionTime?: number;
}

/**
 * Configuration for a mask area in projection mapping.
 */
export interface ProjectionMask {
    id: string;
    name?: string;
    points: { x: number, y: number }[]; // Coordinates as percentages (0-100)
}

/**
 * Configuration for a secondary screen attached to the host PC.
 */
export interface LocalMonitorDevice extends BaseDevice {
    type: 'local_monitor';
    monitorId: number;
    /** Default fade-in duration in seconds (used when event.transition is 0). */
    fadeInTime?: number;
    fadeOutTime?: number;
    /** Cross-over overlap time in seconds (used for cleanup overlap). */
    crossoverTime?: number;
    /** Backward-compatible alias (legacy). Prefer fadeInTime. */
    transitionTime?: number;
}

/**
 * Configuration for a remote web browser running the projection UI.
 */
export interface RemoteVideoWallDevice extends BaseDevice {
    type: 'remote_VideoWall';
    ip: string;
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait';
}

/**
 * Configuration for a high-performance VideoWall Agent node.
 */
export interface VideoWallAgentDevice extends BaseDevice {
    type: 'videowall_agent';
    ip: string;
    port: number;
    model: '4-screen' | '9-screen';
    layout: string;
    orientation: 'landscape' | 'portrait';
    cachedFiles?: string[];
    fadeInTime?: number;
    fadeOutTime?: number;
    crossoverTime?: number;
    loop?: boolean;
    bezelSize?: number;
    version?: string;
}

/**
 * Union type representing any valid output device in the system.
 */
export type Device = WLEDDevice | WiZDevice | LocalMonitorDevice | RemoteVideoWallDevice | VideoWallAgentDevice;
