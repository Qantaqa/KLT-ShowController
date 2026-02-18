import { io, Socket } from 'socket.io-client'
import { useShowStore } from '../store/useShowStore'

class NetworkService {
    private socket: Socket | null = null

    connect(url: string = 'http://localhost:3001') {
        if (this.socket) return

        this.socket = io(url)

        this.socket.on('connect', () => {
            console.log('Connected to Antigravity Central Hub, socket ID:', this.socket?.id)
        })

        this.socket.on('execute', (data: any) => {
            // Don't log camera frames (too noisy)
            if (data.type !== 'CAMERA_FRAME') {
                console.log('Remote execution command:', data.type, data)
            }

            if (data.type === 'EVENT_TRIGGER') {
                const event = data.event
                if (event.type === 'Media' || (event.fixture && event.fixture.includes('Video'))) {
                    console.log(`VIDEO WALL: Loading ${event.filename || event.effect}`)
                }

                // Sync the UI if it's not already on this event
                const store = useShowStore.getState()
                const currentIndex = store.events.findIndex(e =>
                    e.act === event.act &&
                    e.sceneId === event.sceneId &&
                    e.eventId === event.eventId &&
                    e.type === event.type &&
                    e.cue === event.cue
                )

                if (currentIndex !== -1 && currentIndex !== store.activeEventIndex) {
                    console.log('SYNC: Remote triggered event jump to index', currentIndex)
                    store.setActiveEvent(currentIndex)
                }
            } else if (data.type === 'SYNC_PAGE') {
                console.log('SYNC: Updating script page to', data.page)
                useShowStore.getState().setCurrentScriptPage(data.page)
            } else if (data.type === 'SET_SCRIPT') {
                console.log('SYNC: Updating script URL to', data.url)
                useShowStore.getState().updateActiveShowPdf(data.url)
            } else if (data.type === 'STATE_SYNC') {
                console.log('SYNC: Received full state sync from host')
                useShowStore.getState().syncFromRemote(data.state)
                if (data.state.appSettings) {
                    useShowStore.getState().syncAppSettings(data.state.appSettings)
                }
            } else if (data.type === 'REQUEST_STATE') {
                // If we are the host, broadcast our state
                if (!!(window as any).require) {
                    console.log('SYNC: Remote requested state, broadcasting...')
                    useShowStore.getState().broadcastState()
                }
            } else if (data.type === 'CLIENTS_UPDATE') {
                console.log('SYNC: Clients updated:', data.clients)
                useShowStore.getState().setConnectedClients(data.clients)
            } else if (data.type === 'CAMERA_FRAME') {
                const store = useShowStore.getState()
                store.updateCameraFrame(data.clientId, data.frame)
                // Auto-select this camera on the host if not already selected (max 2)
                const isHost = !!(window as any).require
                if (isHost && data.clientId) {
                    const { selectedCameraClients } = store
                    if (!selectedCameraClients.includes(data.clientId)) {
                        console.log('CAMERA: Auto-selecting client', data.clientId)
                        store.toggleCameraSelection(data.clientId)
                    }
                }
            } else if (data.type === 'CAMERA_STOPPED') {
                console.log('CAMERA: Client stopped camera:', data.clientId)
                useShowStore.getState().clearCameraStream(data.clientId)
            }
        })

        this.socket.on('disconnect', () => {
            console.log('Disconnected from Central Hub')
        })
    }

    sendCommand(data: any) {
        if (this.socket?.connected) {
            this.socket.emit('command', data)
        } else {
            console.warn('Socket not connected. Command buffered or ignored.')
        }
    }

    getSocketId() {
        return this.socket?.id
    }

    disconnect() {
        this.socket?.disconnect()
        this.socket = null
    }
}

export const networkService = new NetworkService()
