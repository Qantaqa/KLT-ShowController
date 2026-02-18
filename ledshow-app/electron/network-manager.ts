import axios from 'axios'
import dgram from 'node:dgram'
import type { ShowEvent } from '../src/services/xml-service'

export interface WledCommand {
    ip: string
    on?: boolean
    bri?: number
    seg?: any[]
}

class NetworkManager {
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

    // Handle various show event types
    processEvent(event: ShowEvent) {
        if (event.type === 'Light' && event.fixture) {
            // Find IP for fixture (we'll need a device map)
            const ipMap: Record<string, string> = {
                'Beuk Cour': '192.168.0.10',
                'Beuk Jardin': '192.168.0.11',
                'WIZ Lamp': '192.168.0.119'
            }

            const ip = ipMap[event.fixture] || ipMap[event.fixture.split('/')[0]]
            if (ip) {
                this.sendWledCommand({
                    ip,
                    on: true,
                    bri: event.brightness,
                    seg: [{
                        fx: (event as any).colEffectId || 0,
                        pal: (event as any).colPaletteId || 0,
                        col: [
                            this.hexToRgb(event.color1),
                            this.hexToRgb(event.color2),
                            this.hexToRgb(event.color3)
                        ]
                    }]
                })
            }
        }
    }

    async testDevice(device: any) {
        console.log('Testing device:', device.name, device.ip, device.type)

        if (device.type === 'wled') {
            const url = `http://${device.ip}/json/state`
            try {
                // Flash Red
                await axios.post(url, { on: true, bri: 255, seg: [{ id: 0, col: [[255, 0, 0]] }] }, { timeout: 1000 })

                // Wait 500ms then Green
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 255, 0]] }] }).catch(() => { }), 500)

                // Wait 1000ms then Blue
                setTimeout(() => axios.post(url, { seg: [{ id: 0, col: [[0, 0, 255]] }] }).catch(() => { }), 1000)

                // Wait 1500ms then restore/off? Keep it simple for now. 
            } catch (e: any) {
                console.error(`Test WLED failed: ${e.message}`)
            }
        } else if (device.type === 'wiz') {
            const socket = dgram.createSocket('udp4')
            const msg = JSON.stringify({ method: "setPilot", params: { r: 255, g: 0, b: 0, dimming: 100 } })

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

    private hexToRgb(hex: string): [number, number, number] {
        if (!hex || hex === 'Black' || !hex.startsWith('#')) return [0, 0, 0]
        const r = parseInt(hex.slice(1, 3), 16) || 0
        const g = parseInt(hex.slice(3, 5), 16) || 0
        const b = parseInt(hex.slice(5, 7), 16) || 0
        return [r, g, b]
    }
}

export const networkManager = new NetworkManager()
