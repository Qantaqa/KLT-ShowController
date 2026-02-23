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
class NetworkManager {
    /**
     * Doel: Verstuurt een JSON commando naar een WLED apparaat.
     * Input: command (WledCommand object met IP en parameters).
     * Output: Void.
     * Condities: Gebruikt HTTP POST naar de /json/state endpoint. Timeout van 1s.
     * Integriteit: Foutafhandeling vangt netwerkproblemen op zonder het hoofdproces te blokkeren.
     */
    async sendWledCommand(command: WledCommand) {
        const { ip, ...params } = command
        const url = `http://${ip}/json/state`

        try {
            console.log(`Sending WLED command to ${ip}:`, JSON.stringify(params))
            await axios.post(url, params, { timeout: 1000 })
        } catch (error: any) {
            console.error(`WLED command failed for ${ip}:`, error.message)
        }
    }

    /**
     * Doel: Verstuurt een commando naar een WiZ lamp via het UDP protocol.
     * Input: ip (target), method (setPilot/getPilot), params (parameters voor de lamp).
     * Output: Promise met het resultaat van de lamp.
     * Condities: Gebruikt UDP poort 38899. Wacht op antwoord bij 'getPilot'.
     * Integriteit: Sluit de socket altijd af na verzending of timeout om resources vrij te maken.
     * Protocol-Strict: Volgt het WiZ JSON-over-UDP protocol.
     */
    async sendWizCommand(ip: string, method: string, params: any) {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4')
            const msg = JSON.stringify({ method, params })

            socket.send(msg, 38899, ip, (err) => {
                if (err) {
                    socket.close()
                    reject(err)
                    return
                }

                if (method === 'getPilot') {
                    socket.on('message', (msg) => {
                        try {
                            const result = JSON.parse(msg.toString())
                            socket.close()
                            resolve(result)
                        } catch (e) {
                            socket.close()
                            reject(e)
                        }
                    })
                    // Timeout voor status: Voorkom dat de promise oneindig blijft hangen als apparaat offline is.
                    setTimeout(() => {
                        try { socket.close() } catch (e) { }
                        resolve({ error: 'timeout' })
                    }, 2000)
                } else {
                    socket.close()
                    resolve({ success: true })
                }
            })
        })
    }

    /**
     * Doel: Haalt de huidige status en informatie op van een WLED apparaat.
     * Input: ip van het apparaat.
     * Output: Object met info en state, of null bij falen.
     * Condities: Twee HTTP GET requests (info en state).
     * Integriteit: Gebruikt timeouts om vertraging bij offline apparaten te beperken.
     */
    async getWledInfo(ip: string) {
        try {
            const response = await axios.get(`http://${ip}/json/info`, { timeout: 2000 })
            const stateResponse = await axios.get(`http://${ip}/json/state`, { timeout: 2000 })
            return { info: response.data, state: stateResponse.data }
        } catch (error: any) {
            console.error(`Failed to get WLED info from ${ip}:`, error.message)
            return null
        }
    }

    /**
     * Doel: Haalt de lijst met beschikbare effecten op van een WLED apparaat.
     * Input: ip.
     * Output: Array van effectnamen.
     * Integriteit: Retourneert lege array bij fout.
     */
    async getWledEffects(ip: string) {
        try {
            const response = await axios.get(`http://${ip}/json/eff`, { timeout: 2000 })
            return response.data
        } catch (error: any) {
            console.error(`Failed to get WLED effects from ${ip}:`, error.message)
            return []
        }
    }

    /**
     * Doel: Haalt de lijst met beschikbare kleurenpaletten op van een WLED apparaat.
     * Input: ip.
     * Output: Array van paletnamen.
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
     * Doel: Verwerkt een ShowEvent en vertaalt deze naar specifieke hardware commando's.
     * Input: event (ShowEvent object uit de show runner).
     * Output: Void.
     * Condities: Alleen voor 'light' events. Zoekt bijbehorende IP in de database.
     * Logica: 
     *  - Als type 'wiz' is: Gebruik sendWizCommand met RGB conversie.
     *  - Als type 'wled' is: Gebruik sendWledCommand met segment-ondersteuning.
     * Integriteit: Valt terug op statische IP mapping als database device niet gevonden wordt.
     */
    processEvent(event: ShowEvent) {
        if (event.type?.toLowerCase() === 'light' && event.fixture) {
            // Statische fallback map voor bekende apparaten
            const ipMap: Record<string, string> = {
                'Beuk Cour': '192.168.0.10',
                'Beuk Jardin': '192.168.0.11',
                'WIZ Lamp': '192.168.0.119'
            }

            // Dynamische lookup in DB
            const devices = dbManager.getDevices('GLOBAL') || [];
            const device = devices.find((d: any) => d.name === event.fixture);
            const ip = device?.ip || ipMap[event.fixture];

            if (ip) {
                if (device?.type === 'wiz') {
                    // WiZ Protocol integratie: RGB naar 0-255, Dimming naar 0-100
                    this.sendWizCommand(ip, 'setPilot', {
                        r: this.hexToRgb(event.color1)[0],
                        g: this.hexToRgb(event.color1)[1],
                        b: this.hexToRgb(event.color1)[2],
                        dimming: (event.brightness !== undefined ? Math.round(event.brightness / 2.55) : 100)
                    });
                } else {
                    // WLED JSON API integratie
                    const payload: any = {
                        on: true,
                        bri: event.brightness,
                        seg: []
                    };

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

                    if (event.segmentId !== undefined && event.segmentId >= 0) {
                        // Specifiek segment targeten
                        payload.seg.push({ id: event.segmentId, ...segUpdate });
                    } else {
                        // Alle segmenten targeten: We halen eerst de state op om te weten welke segmenten bestaan.
                        try {
                            this.getWledInfo(ip).then(data => {
                                if (data && data.state && data.state.seg) {
                                    payload.seg = data.state.seg.map((s: any) => ({ id: s.id, ...segUpdate }));
                                    this.sendWledCommand({ ip, ...payload });
                                } else {
                                    // Fallback: alleen segment 0 als lookup faalt
                                    payload.seg.push({ id: 0, ...segUpdate });
                                    this.sendWledCommand({ ip, ...payload });
                                }
                            });
                            return;
                        } catch (e) {
                            payload.seg.push({ id: 0, ...segUpdate });
                        }
                    }

                    this.sendWledCommand({ ip, ...payload });
                }
            }
        }
    }

    /**
     * Doel: Test de verbinding met een apparaat door een visuele feedback (kleurwissel) te geven.
     * Input: device object.
     * Condities: Voor WLED: Flash R-G-B. Voor WiZ: Directe RGB wissel via UDP.
     * Integriteit: Wordt gebruikt in de configuratie-portal om hardware te identificeren.
     */
    async testDevice(device: any) {
        console.log('Testing device:', device.name, device.ip, device.type)

        if (device.type === 'wled') {
            const url = `http://${device.ip}/json/state`
            try {
                // Test Loop: R -> G -> B met timeouts
                await axios.post(url, { on: true, bri: 255, seg: [{ id: 0, col: [[255, 0, 0]] }] }, { timeout: 1000 })
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 255, 0]] }] }).catch(() => { }), 500)
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 0, 255]] }] }).catch(() => { }), 1000)
            } catch (e: any) {
                console.error(`Test WLED failed: ${e.message}`)
            }
        } else if (device.type === 'wiz') {
            const socket = dgram.createSocket('udp4')
            const msg = JSON.stringify({ method: "setPilot", params: { r: 255, g: 0, b: 0, dimming: 100 } })

            // WiZ Test Loop: R -> G -> B via UDP stream
            socket.send(msg, 38899, device.ip, (err) => {
                if (err) console.error('WiZ test failed:', err)
                setTimeout(() => {
                    const msgG = JSON.stringify({ method: "setPilot", params: { r: 0, g: 255, b: 0, dimming: 100 } })
                    socket.send(msgG, 38899, device.ip)
                }, 500)
                setTimeout(() => {
                    const msgB = JSON.stringify({ method: "setPilot", params: { r: 0, g: 0, b: 255, dimming: 100 } })
                    socket.send(msgB, 38899, device.ip, () => socket.close())
                }, 1000)
            })
        }
    }

    /**
     * Doel: Converteert HEX kleur naar RGB array voor hardware protocols.
     * Input: hex string (bijv. "#FF0000").
     * Output: [r, g, b] array.
     * Condities: Handelt 'Black' en ontbrekende '#' af.
     * Integriteit: Voorkomt NaN errors door fallback naar 0.
     */
    private hexToRgb(hex: string): [number, number, number] {
        if (!hex || hex === 'Black' || !hex.startsWith('#')) return [0, 0, 0]
        const r = parseInt(hex.slice(1, 3), 16) || 0
        const g = parseInt(hex.slice(3, 5), 16) || 0
        const b = parseInt(hex.slice(5, 7), 16) || 0
        return [r, g, b]
    }
}

export const networkManager = new NetworkManager()
