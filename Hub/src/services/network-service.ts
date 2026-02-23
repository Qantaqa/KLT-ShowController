import { io, Socket } from 'socket.io-client'
import { useShowStore } from '../store/useShowStore'

class NetworkService {
    private socket: Socket | null = null

    connect(url: string = 'http://localhost:3001') {
        if (this.socket) return

        this.socket = io(url)

        this.socket.on('connect', () => {
            console.log('--- NETWORK: Connected to Hub, socket ID:', this.socket?.id)
            this.registerClient()
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
                const store = useShowStore.getState()
                store.setConnectedClients(data.clients)
                // Sync local lock state if server says we are locked/unlocked
                const me = data.clients.find((c: any) => c.uuid === store.clientUUID)
                if (me && me.isLocked !== undefined && me.isLocked !== store.appLocked) {
                    console.log('SYNC: Remote lock status changed to', me.isLocked)
                    useShowStore.setState({ appLocked: me.isLocked })
                }
            } else if (data.type === 'CAMERA_FRAME') {
                const senderUUID = data.clientUUID || data.clientId // fallback to clientId if uuid missing
                useShowStore.getState().updateCameraFrame(senderUUID, data.frame)

                // Auto-selection logic based on UUID
                const store = useShowStore.getState()
                const { selectedCameraClients, dismissedWebcams } = store
                const isHost = !!(window as any).require

                // Check if this client was manually dismissed
                if (senderUUID && !selectedCameraClients.includes(senderUUID) && !dismissedWebcams.includes(senderUUID)) {
                    // Host auto-selects remote streams (any client that isn't the host itself)
                    // Remote auto-selects the host stream
                    const senderClient = store.connectedClients.find(c => c.uuid === senderUUID || c.id === senderUUID)
                    const isHostSender = senderClient?.type === 'HOST'

                    if ((isHost && !isHostSender) || (!isHost && isHostSender)) {
                        // Only auto-select if we have space (max 2)
                        if (selectedCameraClients.length < 2) {
                            console.log('CAMERA: Auto-selecting stream', senderUUID)
                            store.toggleCameraSelection(senderUUID)
                        }
                    }
                }
            } else if (data.type === 'CAMERA_STOPPED') {
                const stoppedUUID = data.clientUUID || data.clientId
                console.log('CAMERA: Client stopped camera:', stoppedUUID)
                useShowStore.getState().clearCameraStream(stoppedUUID)
            } else if (data.type === 'REMOTE_CONTROL') {
                const isHost = !!(window as any).require
                if (isHost) {
                    console.log('HOST: Executing remote control command:', data.action)
                    const store = useShowStore.getState()
                    if (data.action === 'nextEvent') store.nextEvent(data.force)
                    else if (data.action === 'nextScene') store.nextScene(data.force)
                    else if (data.action === 'nextAct') store.nextAct(data.force)
                    else if (data.action === 'stop' || data.action === 'setActiveEvent') {
                        store.setActiveEvent(data.index !== undefined ? data.index : -1)
                    }
                }
            } else if (data.type === 'DEVICE_STATUS_UPDATE') {
                console.log('--- NETWORK: Received DEVICE_STATUS_UPDATE for IDs:', Object.keys(data.statuses).join(', '));
                useShowStore.getState().setDeviceAvailability(data.statuses)
            } else if (data.type === 'REGISTRATION_REQUIRED') {
                useShowStore.setState({
                    registrationStatus: data.status,
                    registrationData: { existingClients: data.existingClients },
                    clientFriendlyName: data.friendlyName || ''
                })
            } else if (data.type === 'HOST_PIN_CORRECT') {
                useShowStore.setState({ registrationStatus: 'WAITING_REGISTRATION' })
            } else if (data.type === 'HOST_PIN_INCORRECT') {
                useShowStore.getState().addToast('Ongeldige Host Pin', 'error')
            } else if (data.type === 'AUTHORIZED') {
                useShowStore.setState({
                    isAuthorized: true,
                    registrationStatus: 'AUTHORIZED',
                    clientFriendlyName: data.friendlyName,
                    appLocked: false
                })
                // Once authorized, request state
                this.sendCommand({ type: 'REQUEST_STATE' })
            } else if (data.type === 'CLIENT_PIN_INCORRECT') {
                useShowStore.getState().addToast('Ongeldige Client Pincode', 'error')
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

    registerClient() {
        const state = useShowStore.getState()
        const uuid = state.clientUUID
        const isHost = !!(window as any).require
        if (uuid && this.socket?.connected) {
            this.sendCommand({
                type: 'REGISTER_CLIENT',
                clientUUID: uuid,
                isHost: isHost
            })
            console.log('--- NETWORK: Registered client UUID:', uuid, 'isHost:', isHost)
        }
    }
}

export const networkService = new NetworkService()
