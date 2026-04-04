import { dbManager } from './db-manager'
import axios from 'axios'
import dgram from 'node:dgram'
import type { ShowEvent } from '../src/services/xml-service'

export interface WledCommand {
    ip: string
    on?: boolean
    bri?: number
    seg?: any[]
}

/**
 * Manager Agent voor Netwerkinteractie.
 * Centrale module voor alle communicatie met externe hardware (WLED, WiZ).
 * Beheert zowel HTTP (JSON API) als UDP (WiZ Protocol) verbindingen.
 */
/**
 * Manager Agent for Network Interaction.
 * Central module for all communication with external hardware (WLED, WiZ).
 * Handles both HTTP (JSON API) and UDP (WiZ Protocol) connections.
 */
class NetworkManager {
    /**
     * Sends a JSON configuration command to a WLED device.
     * @param command WledCommand object containing the device IP and state parameters.
     */
    async sendWledCommand(command: WledCommand) {
        const { ip, ...params } = command
        const url = `http://${ip}/json/state`

        try {
            console.log(`Sending WLED command to ${ip}:`, JSON.stringify(params))
            // Perform HTTP POST to the WLED JSON state endpoint with a 1s timeout
            await axios.post(url, params, { timeout: 1000 })
        } catch (error: any) {
            // Log network errors without throwing, allowing the show to continue
            console.error(`WLED command failed for ${ip}:`, error.message)
        }
    }

    /**
     * WLED /json/state `seg` is usually an array; some builds expose an object map — normalize to an array.
     */
    private normalizeWledStateSegments(raw: any): any[] {
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'object') return Object.values(raw)
        return []
    }

    /**
     * Push current cue WLED state while editing (effect/colors/etc.), without restoring stored segments.
     * Mirrors show playback segment rules: one segment vs all segments.
     * `segmentId >= 0` = single segment; omitted, null, or &lt; 0 (e.g. -1 “alle segmenten”) = apply to every segment.
     */
    async sendWledLivePreview(ip: string, event: ShowEvent, deviceId?: string) {
        const segUpdate = {
            fx: event.effectId !== undefined ? event.effectId : 0,
            pal: event.paletteId !== undefined ? event.paletteId : 0,
            col: [
                this.hexToRgb(event.color1 || '#ffffff'),
                this.hexToRgb(event.color2 || '#000000'),
                this.hexToRgb(event.color3 || '#888888')
            ],
            sx: event.speed !== undefined ? event.speed : 128,
            ix: event.intensity !== undefined ? event.intensity : 128
        }

        const payload: any = {
            on: true,
            bri: event.brightness !== undefined ? event.brightness : 255,
            seg: []
        }

        const rawSid = event.segmentId as any
        const sidNum =
            rawSid === undefined || rawSid === null || rawSid === ''
                ? NaN
                : typeof rawSid === 'number'
                  ? rawSid
                  : parseInt(String(rawSid), 10)
        const singleSegment = Number.isFinite(sidNum) && sidNum >= 0

        try {
            if (singleSegment) {
                payload.seg.push({ id: sidNum, ...segUpdate })
                await this.sendWledCommand({ ip, ...payload })
                return
            }

            const finalData = await this.getWledInfo(ip)
            const list = this.normalizeWledStateSegments(finalData?.state?.seg)

            if (list.length > 0) {
                payload.seg = list.map((s: any) => ({
                    id: typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10) || 0,
                    ...segUpdate
                }))
            } else if (deviceId) {
                const stored = dbManager.getWledSegments(deviceId)
                if (stored && Array.isArray(stored) && stored.length > 0) {
                    payload.seg = stored.map((s: any) => ({
                        id: typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10) || 0,
                        ...segUpdate
                    }))
                } else {
                    payload.seg.push({ id: 0, ...segUpdate })
                }
            } else {
                payload.seg.push({ id: 0, ...segUpdate })
            }
            await this.sendWledCommand({ ip, ...payload })
        } catch (e: any) {
            console.error(`[NetworkManager] WLED live preview failed for ${ip}:`, e?.message || e)
        }
    }

    /** Push WiZ color/brightness while editing. */
    async sendWizLivePreview(ip: string, event: ShowEvent) {
        const [r, g, b] = this.hexToRgb(event.color1 || '#ffffff')
        try {
            await this.sendWizCommand(ip, 'setPilot', {
                r,
                g,
                b,
                dimming:
                    event.brightness !== undefined
                        ? Math.min(100, Math.max(1, Math.round(event.brightness / 2.55)))
                        : 100
            })
        } catch (e: any) {
            console.error(`[NetworkManager] WiZ live preview failed for ${ip}:`, e?.message || e)
        }
    }

    /**
     * Sends a command to a WiZ light using the WiZ UDP protocol.
     * @param ip The IP address of the WiZ device.
     * @param method The WiZ method to call (e.g., 'setPilot', 'getPilot').
     * @param params The parameters associated with the method.
     * @returns A promise resolving to the device response or a success indicator.
     */
    async sendWizCommand(ip: string, method: string, params: any) {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4')
            const msg = JSON.stringify({ method, params })

            // Send the JSON message over UDP to the standard WiZ port (38899)
            socket.send(msg, 38899, ip, (err) => {
                // Test if the packet sending failed; if true, cleanup and reject
                if (err) {
                    socket.close()
                    reject(err)
                    return
                }

                // Test if we are requesting status ('getPilot'); if true, wait for a response
                if (method === 'getPilot') {
                    // Listen for the device return message
                    socket.on('message', (msg) => {
                        try {
                            const result = JSON.parse(msg.toString())
                            socket.close()
                            resolve(result)
                        } catch (e) {
                            // If response is not valid JSON, cleanup and reject
                            socket.close()
                            reject(e)
                        }
                    })

                    // Set a timeout to prevent the promise from hanging if the device is offline
                    setTimeout(() => {
                        try { socket.close() } catch (e) { }
                        resolve({ error: 'timeout' })
                    }, 2000)
                } else {
                    // For 'set' commands, we typically don't wait for a response on this socket
                    socket.close()
                    resolve({ success: true })
                }
            })
        })
    }

    /**
     * Retrieves the current state and device information from a WLED instance.
     * @param ip The IP address of the WLED device.
     * @returns An object containing 'info' and 'state' data, or null if unreachable.
     */
    async getWledInfo(ip: string) {
        try {
            // Fetch hardware info and current operational state in parallel
            const response = await axios.get(`http://${ip}/json/info`, { timeout: 2000 })
            const stateResponse = await axios.get(`http://${ip}/json/state`, { timeout: 2000 })
            return { info: response.data, state: stateResponse.data }
        } catch (error: any) {
            // Catch timeouts or connection errors
            console.error(`Failed to get WLED info from ${ip}:`, error.message)
            return null
        }
    }

    /**
     * Fetches the list of available lighting effects from a WLED device.
     * @param ip The IP address of the WLED device.
     * @returns An array of strings representing effect names.
     */
    async getWledEffects(ip: string) {
        try {
            const response = await axios.get(`http://${ip}/json/eff`, { timeout: 2000 })
            return response.data
        } catch (error: any) {
            // Fallback to empty list on failure
            console.error(`Failed to get WLED effects from ${ip}:`, error.message)
            return []
        }
    }

    /**
     * Fetches the list of available color palettes from a WLED device.
     * @param ip The IP address of the WLED device.
     * @returns An array of strings representing palette names.
     */
    async getWledPalettes(ip: string) {
        try {
            const response = await axios.get(`http://${ip}/json/pal`, { timeout: 2000 })
            return response.data
        } catch (error: any) {
            console.error(`Failed to get WLED palettes from ${ip}:`, error.message)
            return []
        }
    }

    /**
     * Processes a show event and translates it into physical hardware commands.
     * Handles color conversion, device lookup, and protocol selection.
     * @param event The ShowEvent to execute.
     */
    processEvent(event: ShowEvent) {
        // Test if the event is a light command and specifies a fixture; if true, process it
        if (event.type?.toLowerCase() === 'light' && event.fixture) {
            // Static mapping for legacy support or hardcoded setups
            const ipMap: Record<string, string> = {
                'Beuk Cour': '192.168.0.10',
                'Beuk Jardin': '192.168.0.11',
                'WIZ Lamp': '192.168.0.119'
            }

            // Perform dynamic lookup in the GLOBAL devices table
            const devices = dbManager.getDevices('GLOBAL') || [];
            const device = devices.find((d: any) => d.name === event.fixture);

            // Resolve the target IP (DB entry takes precedence over the static map)
            const ip = device?.ip || ipMap[event.fixture];

            // Test if an IP was successfully resolved for the fixture; if true, send commands
            if (ip) {
                // Test if the device type is WiZ; if true, use the UDP protocol
                if (device?.type === 'wiz') {
                    // Send RGB values (0-255) and map brightness (0-255) to WiZ dimming (0-100)
                    this.sendWizCommand(ip, 'setPilot', {
                        r: this.hexToRgb(event.color1)[0],
                        g: this.hexToRgb(event.color1)[1],
                        b: this.hexToRgb(event.color1)[2],
                        dimming: (event.brightness !== undefined ? Math.round(event.brightness / 2.55) : 100)
                    });
                } else {
                    // Otherwise, assume WLED (JSON API) protocol
                    const payload: any = {
                        on: true,
                        bri: event.brightness,
                        seg: []
                    };

                    // Define the segment configuration based on the event details
                    const segUpdate = {
                        fx: event.effectId !== undefined ? event.effectId : 0,
                        pal: event.paletteId !== undefined ? event.paletteId : 0,
                        col: [
                            this.hexToRgb(event.color1),
                            this.hexToRgb(event.color2),
                            this.hexToRgb(event.color3)
                        ],
                        sx: event.speed,
                        ix: event.intensity
                    };

                    // NEW: Check and restore segments if needed
                    const handleSegments = async () => {
                        try {
                            const storedSegments = device?.id ? dbManager.getWledSegments(device.id) : null;
                            const currentData = await this.getWledInfo(ip);

                            if (storedSegments && currentData && currentData.state) {
                                const currentSegments = this.normalizeWledStateSegments(currentData.state.seg);

                                // Simplified check: compare number of segments and their boundaries (start/stop)
                                // More complex attributes could be checked but boundaries are critical for "configuration presence"
                                const needsRestore = currentSegments.length !== storedSegments.length ||
                                    storedSegments.some((ss: any, i: number) => {
                                        const cs = currentSegments[i];
                                        return !cs || cs.start !== ss.start || cs.stop !== ss.stop;
                                    });

                                if (needsRestore) {
                                    console.log(`[NetworkManager] Restoring segments for WLED ${ip}...`);
                                    await this.sendWledCommand({ ip, seg: storedSegments });
                                }
                            }

                            // Proceed with the actual command
                            const rawEvSeg = event.segmentId as any;
                            const evSegNum =
                                rawEvSeg === undefined || rawEvSeg === null || rawEvSeg === ''
                                    ? NaN
                                    : typeof rawEvSeg === 'number'
                                      ? rawEvSeg
                                      : parseInt(String(rawEvSeg), 10);
                            const singleSeg = Number.isFinite(evSegNum) && evSegNum >= 0;

                            if (singleSeg) {
                                payload.seg.push({ id: evSegNum, ...segUpdate });
                                this.sendWledCommand({ ip, ...payload });
                            } else {
                                const finalData = await this.getWledInfo(ip);
                                const segs = this.normalizeWledStateSegments(finalData?.state?.seg);
                                if (segs.length > 0) {
                                    payload.seg = segs.map((s: any) => ({
                                        id: typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10) || 0,
                                        ...segUpdate
                                    }));
                                    this.sendWledCommand({ ip, ...payload });
                                } else {
                                    payload.seg.push({ id: 0, ...segUpdate });
                                    this.sendWledCommand({ ip, ...payload });
                                }
                            }
                        } catch (e: any) {
                            console.error(`[NetworkManager] WLED segment handling failed for ${ip}:`, e.message);
                            // Fallback to basic segment 0 update
                            payload.seg.push({ id: 0, ...segUpdate });
                            this.sendWledCommand({ ip, ...payload });
                        }
                    };

                    handleSegments();
                }
            }
        }
    }

    /**
     * Alle WLED-segmenten effen zwart (lage helderheid), voor show-modus “stop”.
     */
    async stopWledAllSegmentsBlack(ip: string, deviceId?: string) {
        const blackSeg = {
            on: true,
            bri: 1,
            fx: 0,
            pal: 0,
            col: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
            ] as any,
            sx: 128,
            ix: 128
        }
        try {
            const finalData = await this.getWledInfo(ip)
            const segs = this.normalizeWledStateSegments(finalData?.state?.seg)
            let segPayload: any[]
            if (segs.length > 0) {
                segPayload = segs.map((s: any) => ({
                    id: typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10) || 0,
                    ...blackSeg
                }))
            } else if (deviceId) {
                const stored = dbManager.getWledSegments(deviceId)
                if (stored && Array.isArray(stored) && stored.length > 0) {
                    segPayload = stored.map((s: any) => ({
                        id: typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10) || 0,
                        ...blackSeg
                    }))
                } else {
                    segPayload = [{ id: 0, ...blackSeg }]
                }
            } else {
                segPayload = [{ id: 0, ...blackSeg }]
            }
            await this.sendWledCommand({ ip, on: true, bri: 1, seg: segPayload })
        } catch (e: any) {
            console.error(`[NetworkManager] WLED black-out failed for ${ip}:`, e?.message || e)
            await this.sendWledCommand({ ip, on: true, bri: 1, seg: [{ id: 0, ...blackSeg }] })
        }
    }

    /** WLED of WiZ op zwart; alleen lamp-types. */
    async stopLightFixtureBlack(fixtureName: string) {
        const name = (fixtureName || '').trim()
        if (!name) return { ok: false as const, error: 'Geen fixture' }
        const devices = dbManager.getDevices('GLOBAL') || []
        const device = devices.find((d: any) => d.name === name)
        if (!device?.ip) return { ok: false as const, error: 'Apparaat niet gevonden' }
        if (device.type === 'wiz') {
            await this.sendWizCommand(device.ip, 'setPilot', { r: 0, g: 0, b: 0, dimming: 1 })
            return { ok: true as const }
        }
        if (device.type === 'wled') {
            await this.stopWledAllSegmentsBlack(device.ip, device.id)
            return { ok: true as const }
        }
        return { ok: false as const, error: 'Geen lamp' }
    }

    /**
     * Executes a visual test sequence on a device (Red -> Green -> Blue).
     * Used for identifying physical fixtures during setup.
     * @param device The device object to test.
     */
    async testDevice(device: any) {
        console.log('Testing device:', device.name, device.ip, device.type)

        // Test if the device utilizes the WLED protocol
        if (device.type === 'wled') {
            const url = `http://${device.ip}/json/state`
            try {
                // Execute a timed sequence of color changes to segment 0
                await axios.post(url, { on: true, bri: 255, seg: [{ id: 0, col: [[255, 0, 0]] }] }, { timeout: 1000 })
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 255, 0]] }] }).catch(() => { }), 500)
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 0, 255]] }] }).catch(() => { }), 1000)
            } catch (e: any) {
                console.error(`Test WLED failed: ${e.message}`)
            }
        }
        // Test if the device utilizes the WiZ protocol
        else if (device.type === 'wiz') {
            const socket = dgram.createSocket('udp4')
            const msg = JSON.stringify({ method: "setPilot", params: { r: 255, g: 0, b: 0, dimming: 100 } })

            // Rapidly send UDP packets to cycle through RGB colors
            socket.send(msg, 38899, device.ip, (err) => {
                // Log transmission errors
                if (err) console.error('WiZ test failed:', err)

                // Switch to Green after 500ms
                setTimeout(() => {
                    const msgG = JSON.stringify({ method: "setPilot", params: { r: 0, g: 255, b: 0, dimming: 100 } })
                    socket.send(msgG, 38899, device.ip)
                }, 500)

                // Switch to Blue after 1000ms, then close the socket
                setTimeout(() => {
                    const msgB = JSON.stringify({ method: "setPilot", params: { r: 0, g: 0, b: 255, dimming: 100 } })
                    socket.send(msgB, 38899, device.ip, () => socket.close())
                }, 1000)
            })
        }
    }

    /**
     * Helper to convert a CSS-style HEX string to an RGB array.
     * @param hex The hex string (e.g. "#FF8800").
     * @returns An array [red, green, blue].
     */
    private hexToRgb(hex: string): [number, number, number] {
        // Test if the hex string is invalid, black, or improperly formatted; if true, return black (0,0,0)
        if (!hex || hex === 'Black' || !hex.startsWith('#')) return [0, 0, 0]

        // Parse hex chunks into integers
        const r = parseInt(hex.slice(1, 3), 16) || 0
        const g = parseInt(hex.slice(3, 5), 16) || 0
        const b = parseInt(hex.slice(5, 7), 16) || 0
        return [r, g, b]
    }
}

export const networkManager = new NetworkManager()
