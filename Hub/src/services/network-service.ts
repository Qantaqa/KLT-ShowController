import { io, Socket } from 'socket.io-client'
import { useSequencerStore } from '../store/useSequencerStore'

/**
 * Handles real-time communication between the client and the Central Hub.
 * Manages Socket.io connections, state synchronization, remote execution, and camera streaming.
 */
class NetworkService {
    private socket: Socket | null = null // Current Socket.io connection instance
    private currentUrl: string | null = null

    /**
     * Establishes a connection to the Central Hub server.
     * @param url The URL of the Hub server (default: http://localhost:3001).
     */
    connect(url: string = 'http://localhost:3001') {
        // If we already have a socket:
        // - keep it if it's connected to the same URL
        // - otherwise reconnect (URL changed or we got stuck disconnected)
        if (this.socket) {
            const sameUrl = this.currentUrl === url
            const isConnected = !!this.socket.connected
            if (sameUrl && isConnected) return
            try { this.socket.disconnect() } catch (_) { }
            this.socket = null
        }

        this.currentUrl = url
        this.socket = io(url)

        // Event: Successful initial connection or reconnection
        this.socket.on('connect', () => {
            console.log('--- NETWORK: Connected to Hub, socket ID:', this.socket?.id)
            // Immediately identify this client type to the server
            this.registerClient()
        })

        // Event: Generic execution message from server or other clients
        this.socket.on('execute', (data: any) => {
            // Noise reduction: skip high-frequency / bulk payloads in the generic execute log
            const quietTypes = new Set(['CAMERA_FRAME', 'DEVICE_STATUS_UPDATE'])
            if (!quietTypes.has(data.type)) {
                console.log('Remote execution command:', data.type, data)
            }

            // --- Logic Branch: Show Event Triggering ---
            // Test if an event was triggered remotely (e.g. by another client or host)
            if (data.type === 'EVENT_TRIGGER') {
                const event = data.event
                // Log specific media loading for video wall debugging
                if (event.type === 'Media' || (event.fixture && event.fixture.includes('Video'))) {
                    console.log(`VIDEO WALL: Loading ${event.filename || event.effect}`)
                }

                const store = useSequencerStore.getState()
                // Test if our local state already matches the remote event index
                const currentIndex = store.events.findIndex(e =>
                    e.act === event.act &&
                    e.sceneId === event.sceneId &&
                    e.eventId === event.eventId &&
                    e.type === event.type &&
                    e.cue === event.cue
                )

                // If found and different, update the local active event index
                if (currentIndex !== -1 && currentIndex !== store.activeEventIndex) {
                    console.log('SYNC: Remote triggered event jump to index', currentIndex)
                    store.setActiveEvent(currentIndex)
                }
            }
            // --- Logic Branch: Manual host page navigation sync (remote ignores this — free navigation) ---
            else if (data.type === 'SYNC_PAGE') {
                // Remote clients do NOT auto-follow manual host navigation
                // They only follow EVENT_PAGE (event-triggered jumps)
                console.log('SYNC: Host manual page update (remote ignoring):', data.page)
            }
            // --- Logic Branch: Event-triggered page jump (remote follows this) ---
            else if (data.type === 'EVENT_PAGE') {
                console.log('SYNC: Event-triggered page jump to', data.page)
                useSequencerStore.getState().setCurrentScriptPage(data.page)
            }
            // --- Logic Branch: Script File Sync ---
            else if (data.type === 'SET_SCRIPT') {
                console.log('SYNC: Updating script URL to', data.url)
                useSequencerStore.getState().updateActiveShowPdf(data.url)
            }
            // --- Logic Branch: Full State Sync ---
            else if (data.type === 'STATE_SYNC') {
                console.log('SYNC: Received full state sync from host')
                useSequencerStore.getState().syncFromRemote(data.state)
                // Test if the sync packet includes application-wide settings
                if (data.state.appSettings) {
                    useSequencerStore.getState().syncAppSettings(data.state.appSettings)
                }
            }
            // --- Logic Branch: State Request ---
            else if (data.type === 'REQUEST_STATE') {
                // Test if this client is the HOST (has access to Node/Electron modules)
                if (!!(window as any).require) {
                    console.log('SYNC: Remote requested state, broadcasting...')
                    // As the host, broadcast current state to all remote clients
                    useSequencerStore.getState().broadcastState()
                }
            }
            // --- Logic Branch: Connected Clients List Update ---
            else if (data.type === 'CLIENTS_UPDATE') {
                const store = useSequencerStore.getState()
                store.setConnectedClients(data.clients)

                // Synchronize remote locking: Test if the current client is locked/unlocked by an admin
                const me = data.clients.find((c: any) => c.uuid === store.clientUUID)
                if (me && me.isLocked !== undefined && me.isLocked !== store.appLocked) {
                    console.log('SYNC: Remote lock status changed to', me.isLocked)
                    useSequencerStore.setState({ appLocked: me.isLocked })
                }
            }
            // --- Logic Branch: Incoming Webcam Stream Frame ---
            else if (data.type === 'CAMERA_FRAME') {
                const senderUUID = data.clientUUID || data.clientId // Test for legacy ID or modern UUID
                useSequencerStore.getState().updateCameraFrame(senderUUID, data.frame)

                const store = useSequencerStore.getState()
                const { selectedCameraClients, dismissedWebcams } = store
                const isHost = !!(window as any).require

                // Auto-selection: Test if the stream is new and hasn't been manually dismissed
                if (senderUUID && !selectedCameraClients.includes(senderUUID) && !dismissedWebcams.includes(senderUUID)) {
                    const senderClient = store.connectedClients.find(c => c.uuid === senderUUID || c.id === senderUUID)
                    const isHostSender = senderClient?.type === 'HOST'

                    /**
                     * Automatic Stream Selection Logic:
                     * 1. If we are the HOST: Auto-select non-host (remote) streams.
                     * 2. If we are a REMOTE: Auto-select the HOST stream.
                     */
                    if ((isHost && !isHostSender) || (!isHost && isHostSender)) {
                        // Test if we have space in the current UI layout (max 2 streams)
                        if (selectedCameraClients.length < 2) {
                            console.log('CAMERA: Auto-selecting stream', senderUUID)
                            store.toggleCameraSelection(senderUUID)
                        }
                    }
                }
            }
            // --- Logic Branch: Webcam Stream Stopped ---
            else if (data.type === 'CAMERA_STOPPED') {
                const stoppedUUID = data.clientUUID || data.clientId
                console.log('CAMERA: Client stopped camera:', stoppedUUID)
                useSequencerStore.getState().clearCameraStream(stoppedUUID)
            }
            // --- Logic Branch: Remote Control Commands (Next/Prev) ---
            else if (data.type === 'REMOTE_CONTROL') {
                const isHost = !!(window as any).require
                // Only the HOST process should execute physical hardware changes
                if (isHost) {
                    console.log('HOST: Executing remote control command:', data.action)
                    const store = useSequencerStore.getState()
                    // Test action type and execute corresponding store method
                    if (data.action === 'nextEvent') store.nextEvent(data.force)
                    else if (data.action === 'nextScene') store.nextScene(data.force)
                    else if (data.action === 'nextAct') store.nextAct(data.force)
                    else if (data.action === 'startShow') store.startShow()
                    else if (data.action === 'stop' || data.action === 'setActiveEvent') {
                        store.setActiveEvent(data.index !== undefined ? data.index : -1)
                    }
                }
            }
            // --- Logic Branch: Remote workstation requests host media controls ---
            else if (data.type === 'HOST_MEDIA_CONTROL') {
                const isHost = !!(window as any).require
                if (isHost) {
                    const store = useSequencerStore.getState() as any
                    const action = data.action
                    const idxFromSender = data.index
                    const ref = data.eventRef

                    const resolveIndex = () => {
                        const events = (store.events || []) as any[]
                        if (ref) {
                            const match = events.findIndex((e: any) =>
                                e &&
                                e.act === ref.act &&
                                (e.sceneId ?? 0) === (ref.sceneId ?? 0) &&
                                (e.eventId ?? 0) === (ref.eventId ?? 0) &&
                                (e.type || '') === (ref.type || '') &&
                                ((e.filename || '') === (ref.filename || '')) &&
                                ((e.fixture || '') === (ref.fixture || ''))
                            )
                            if (match !== -1) return match
                        }
                        return typeof idxFromSender === 'number' ? idxFromSender : -1
                    }

                    const index = resolveIndex()
                    if (index < 0) return

                    console.log('HOST: Executing host media control:', action, { index })

                    if (action === 'restartMedia') store.restartMedia(index)
                    else if (action === 'pauseMedia') store.pauseMedia(index)
                    else if (action === 'stopMedia') store.stopMedia(index)
                    else if (action === 'setMediaVolume') store.setMediaVolume(index, data.volume)
                    else if (action === 'toggleAudio') store.toggleAudio(index)
                    else if (action === 'toggleRepeat') store.toggleRepeat(index)
                    else if (action === 'setMediaBrightness') store.setMediaBrightness(index, data.brightness)
                }
            }
            // --- Logic Branch: Media Finished ---
            else if (data.type === 'MEDIA_FINISHED') {
                const store = useSequencerStore.getState()
                const currentEvent = store.events[store.activeEventIndex]

                if (currentEvent && currentEvent.type?.toLowerCase() === 'trigger' && currentEvent.effect?.toLowerCase() === 'media') {
                    // Check if a specific media was targeted, or fallback to any media finishing
                    const targetId = currentEvent.mediaTriggerId;
                    const finishedId = `${data.src}|${data.deviceId}`;

                    if (!targetId || targetId === finishedId) {
                        console.log('SYNC: Media finished, triggering next event');
                        store.nextEvent(true);
                    }
                }
            }
            // --- Logic Branch: Device Availability Update ---
            else if (data.type === 'DEVICE_STATUS_UPDATE') {
                useSequencerStore.getState().setDeviceAvailability(data.statuses)
            }
            // --- Logic Branch: Client Registration Feedback ---
            else if (data.type === 'REGISTRATION_REQUIRED') {
                useSequencerStore.setState({
                    registrationStatus: data.status,
                    registrationData: { existingClients: data.existingClients },
                    clientFriendlyName: data.friendlyName || ''
                })
            }
            // --- Logic Branch: Security/Pin Feedback ---
            else if (data.type === 'HOST_PIN_CORRECT') {
                useSequencerStore.setState({ registrationStatus: 'WAITING_REGISTRATION' })
            } else if (data.type === 'HOST_PIN_INCORRECT') {
                useSequencerStore.getState().addToast('Ongeldige Host Pin', 'error')
            }
            // --- Logic Branch: Authorization Success ---
            else if (data.type === 'AUTHORIZED') {
                useSequencerStore.setState({
                    isAuthorized: true,
                    registrationStatus: 'AUTHORIZED',
                    clientFriendlyName: data.friendlyName,
                    appLocked: false
                })
                // Once authorized, fetch the latest state from the hub
                this.sendCommand({ type: 'REQUEST_STATE' })
            }
            // --- Logic Branch: Authorization Failure ---
            else if (data.type === 'CLIENT_PIN_INCORRECT') {
                useSequencerStore.getState().addToast('Ongeldige Client Pincode', 'error')
            }
        })

        this.socket.on('disconnect', () => {
            console.log('Disconnected from Central Hub')
        })
    }

    /**
     * Sends a command packet to the server via the established socket.
     * @param data The payload containing command type and parameters.
     */
    sendCommand(data: any) {
        // Test if the socket is currently active; if so, emit the command
        if (this.socket?.connected) {
            this.socket.emit('command', data)
        } else {
            console.warn('Socket not connected. Command buffered or ignored.')
        }
    }

    /**
     * @returns The unique socket identifier for this session.
     */
    getSocketId() {
        return this.socket?.id
    }

    /**
     * Gracefully closes the connection to the hub.
     */
    disconnect() {
        this.socket?.disconnect()
        this.socket = null
    }

    /**
     * Announces this client's unique UUID and role (Host/Remote) to the server.
     */
    registerClient() {
        const state = useSequencerStore.getState()
        const uuid = state.clientUUID
        const isHost = !!(window as any).require

        // Test if UUID is set and socket is ready; if so, register
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
