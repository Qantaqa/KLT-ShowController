import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Menu,
  Activity,
  ChevronRight,
  Monitor,
  Wifi,
  Cpu,
  Settings,
  X,
  Plus,
  Trash2,
  Settings2,
  SkipForward,
  Laptop,
  Video,
  Camera,
  ChevronDown,
  Lock,
  ShieldAlert,
  Fingerprint,
  Play,
  StopCircle,
  Clock,
  FileText,
  Cloud,
  FastForward,
  Maximize,
  Minimize,
  Layers,
  Download,
  Radar
} from 'lucide-react'
import { useSequencerStore } from './store/useSequencerStore'
import SequenceGrid from './components/SequenceGrid'
import ProjectSettings from './components/ProjectSettings'
import PdfViewer from './components/PdfViewer'
import AppSettings from './components/AppSettings'
import { useRemoteKeyboard } from './hooks/useRemoteKeyboard'
import { DatabaseManager } from './components/DatabaseManager'
import SimpleModal from './components/SimpleModal'
import CameraStreamer from './components/CameraStreamer'
import MediaPreflightModal from './components/MediaPreflightModal'
import { StickyHub } from './components/StickyHub'
import { networkService } from './services/network-service'

import { cn } from './lib/utils'

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatTimeLong = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const {
    isLocked,
    setLocked,
    events,
    activeEventIndex,
    setActiveEvent,
    blinkingNextEvent,
    blinkingNextScene,
    blinkingNextAct,
    navigationWarning,
    nextEvent,
    nextScene,
    nextAct,
    activeShow,
    availableShows,
    showsLoading,
    showsLoadError,
    appSettings,
    updateActiveShowSidebarWidth,
    archiveShow,
    createNewShow,
    initializeShows,
    setActiveShow,
    showStartTime,
    actualStartTime,
    isPaused,
    pauseStartTime,
    isTimeTracking,
    toggleTimeTracking,
    togglePause,
    lastTransitionTime,
    autoFollowScript,
    toggleAutoFollowScript,
    setEventPage,
    connectedClients,
    isCameraActive,
    setCameraActive,
    isSelfPreviewVisible,
    setSelfPreviewVisible,
    activeCameraStreams,
    selectedCameraClients,
    toggleCameraSelection,
    deviceAvailability,
    toasts,
    addToast,
    removeToast,
    importShow,
    modalConfig,  // From store
    openModal,    // From store

    // Auth & Registration
    isAuthorized,
    registrationStatus,
    registrationData,
    clientFriendlyName,
    appLocked,
    verifyHostPin,
    completeRegistration,
    verifyClientPin,
    setAppLocked
  } = useSequencerStore()

  const isHost = !!(window as any).require

  // Start keyboard shortcut listener (remote keyboard)
  useRemoteKeyboard()

  const handleImportShow = useCallback(async () => {
    if (!isHost) return
    const { ipcRenderer } = (window as any).require('electron')
    const result = await ipcRenderer.invoke('select-file', {
      title: 'Importeer XML Show',
      filters: [{ name: 'XML Bestanden', extensions: ['xml'] }],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      try {
        const fs = (window as any).require('fs')
        const content = fs.readFileSync(filePath, 'utf-8')
        await importShow('', content, filePath)
        addToast('Show succesvol geïmporteerd', 'info')
      } catch (err: any) {
        addToast(`Fout bij importeren: ${err.message}`, 'error')
      }
    }
  }, [isHost, importShow, addToast])

  const handleCreateShowWithScript = useCallback(async () => {
    if (!isHost) return
    const { ipcRenderer } = (window as any).require('electron')
    const result = await ipcRenderer.invoke('select-file', {
      title: 'Selecteer Script (PDF)',
      filters: [{ name: 'PDF Documenten', extensions: ['pdf'] }],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const scriptPath = result.filePaths[0]
      openModal({
        title: 'Nieuwe Show met Script',
        message: `Voer de naam in voor de nieuwe show gebaseerd op script:\n${scriptPath.split(/[\\/]/).pop()}`,
        type: 'prompt',
        defaultValue: scriptPath.split(/[\\/]/).pop()?.replace('.pdf', '') || 'Mijn LedShow',
        onConfirm: (name: string) => {
          if (name) createNewShow(name, scriptPath);
        }
      })
    }
  }, [isHost, createNewShow, openModal])

  const handleExportShow = useCallback(async () => {
    if (!isHost || !activeShow) return
    const { ipcRenderer } = (window as any).require('electron')
    const result = await ipcRenderer.invoke('save-file-dialog', {
      title: 'Exporteer Show',
      defaultPath: `${activeShow.name || 'show'}.json`,
      filters: [{ name: 'JSON Bestanden', extensions: ['json'] }]
    })

    if (!result.canceled && result.filePath) {
      try {
        const fs = (window as any).require('fs')
        const data = {
          show: activeShow,
          events: events
        }
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2))
        addToast('Show succesvol geëxporteerd', 'info')
      } catch (err: any) {
        addToast(`Fout bij exporteren: ${err.message}`, 'error')
      }
    }
  }, [isHost, activeShow, events, addToast])


  const currentScriptPage = activeShow?.viewState?.currentScriptPage || 1

  const [currentTime, setCurrentTime] = useState(new Date())
  const [serverIp, setServerIp] = useState('...')
  const [socketConnected, setSocketConnected] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false)
  const [isDbManagerOpen, setIsDbManagerOpen] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasInitialSync, setHasInitialSync] = useState(false)
  const [isWebcamExpanded, setIsWebcamExpanded] = useState(true)
  const [displays, setDisplays] = useState<any[]>([])
  const [pinInput, setPinInput] = useState('')
  const [setupWizardStep, setSetupWizardStep] = useState<number | null>(null)
  const [foundAgent, setFoundAgent] = useState<any>(null)
  const [isWizardScanning, setIsWizardScanning] = useState(false)
  const [showPreflight, setShowPreflight] = useState(false)
  const [showStartupShowSelect, setShowStartupShowSelect] = useState(false)

  // Clear PIN input when switching between auth screens
  useEffect(() => {
    setPinInput('')
  }, [registrationStatus, appLocked])

  // Fetch displays for status sidebar
  useEffect(() => {
    if (isHost) {
      const { ipcRenderer } = (window as any).require('electron')
      ipcRenderer.invoke('get-displays').then(setDisplays)

      // Periodically refresh displays
      const interval = setInterval(() => {
        ipcRenderer.invoke('get-displays').then(setDisplays)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [isHost])

  const isScanning = useRef<boolean>(false);

  // Auto-discovery for Wizard (uses fast UDP-only scan, ~2.5s per cycle)
  useEffect(() => {
    let interval: any;
    if (isWizardScanning && isHost) {
      const { ipcRenderer } = (window as any).require('electron')

      const checkNewAgents = async () => {
        if (isScanning.current) return;
        isScanning.current = true;

        try {
          // Use fast UDP-only scan instead of full network sweep
          const agents = await ipcRenderer.invoke('scan-agents-only')
          console.log(`[Wizard] Fast scan complete. Found ${agents.length} agent(s).`, agents)

          if (agents.length > 0) {
            const agent = agents[0]; // Take the first found agent
            const currentDevices = useSequencerStore.getState().appSettings.devices || []

            // Check if this agent is already in our device list (only check other videowall_agents)
            const matchedDevice = currentDevices.find((d: any) =>
              d.type === 'videowall_agent' && (
                d.ip === agent.ip || (d.mac && agent.mac && agent.mac !== 'unknown' && d.mac === agent.mac)
              )
            )
            const alreadyExists = !!matchedDevice;
            console.log(`[Wizard] Agent IP: ${agent.ip}, MAC: ${agent.mac}. Already exists: ${alreadyExists}`, matchedDevice || 'no match');

            if (!alreadyExists) {
              // Auto-add to device settings
              const deviceId = `VideoWall_${agent.mac && agent.mac !== 'unknown' ? agent.mac.replace(/:/g, '') : agent.ip.replace(/\./g, '_')}`;
              console.log(`[Wizard] Will add device with id: ${deviceId}`);

              try {
                const { addDevice } = useSequencerStore.getState();
                await addDevice({
                  id: deviceId,
                  name: agent.name || 'VideoWall Agent',
                  type: 'videowall_agent',
                  enabled: true,
                  mac: agent.mac || 'unknown',
                  ip: agent.ip,
                  port: agent.details?.port || 3003,
                  model: agent.details?.model || '4-screen',
                  layout: agent.details?.layout || '2x2',
                  orientation: agent.details?.orientation || 'landscape',
                } as any);
                console.log(`[Wizard] addDevice completed successfully.`);
                addToast(`Agent ${agent.name} toegevoegd aan apparaten!`, 'info')
              } catch (addErr) {
                console.error('[Wizard] addDevice FAILED:', addErr);
                addToast(`Fout bij toevoegen agent: ${addErr}`, 'error')
              }
            } else {
              console.log('[Wizard] Agent already in settings, proceeding anyway.');
              addToast(`Agent herkend op ${agent.ip}`, 'info')
            }

            // Always proceed to Step 3
            setFoundAgent(agent)
            setSetupWizardStep(3)
            setIsWizardScanning(false)
          }
        } catch (e) {
          console.error('Wizard scan failed:', e)
        } finally {
          isScanning.current = false;
        }
      }

      checkNewAgents()
      // Poll every 4 seconds (scan itself takes ~2.5s, leaves 1.5s gap)
      interval = setInterval(checkNewAgents, 4000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isWizardScanning, isHost, addToast])

  // Set initial sync to true if we are the host
  useEffect(() => {
    if (isHost) {
      console.log('--- APP: Setting hasInitialSync to true for Host');
      setHasInitialSync(true);
    }
  }, [isHost]);

  // Version & Dev mode
  const [versionClickCount, setVersionClickCount] = useState(0)
  const [versionClickTimer, setVersionClickTimer] = useState<any>(null)
  const [isDeveloperMode, setIsDeveloperMode] = useState(false)

  useEffect(() => {
    console.log('--- APP: registrationStatus changed:', registrationStatus)
  }, [registrationStatus])

  // Auto-fullscreen is handled by Electron main process (fullscreen: true)
  // Redundant web API call removed to prevent console error about user gesture


  // Listen for sync to set hasInitialSync
  useEffect(() => {
    if (!isHost) {
      const checkSync = () => {
        const state = useSequencerStore.getState();
        if (state.isSynced) {
          setHasInitialSync(true);
        }
      };
      // Check frequently early on
      const interval = setInterval(checkSync, 500);
      return () => clearInterval(interval);
    }
  }, [isHost]);


  // Timer Calculation Logic
  const getShowTimer = () => {
    try {
      if (isPaused && pauseStartTime) {
        const elapsed = Math.floor((Date.now() - pauseStartTime) / 1000)
        return { label: 'PAUZE', time: formatTimeLong(elapsed), color: 'text-yellow-500' }
      }

      if (actualStartTime) {
        const elapsed = Math.floor((Date.now() - actualStartTime) / 1000)
        const h = Math.floor(elapsed / 3600).toString().padStart(2, '0')
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
        const s = (elapsed % 60).toString().padStart(2, '0')
        return { label: 'LOOPTIJD', time: `${h}:${m}:${s}`, color: 'text-orange-400 animate-pulse' }
      }

      // Default: show count towards start time
      const [hStr, mStr] = (showStartTime || "19:30").split(':').map(Number)
      const target = new Date()
      target.setHours(hStr, mStr, 0, 0)

      const diff = target.getTime() - currentTime.getTime()
      if (diff > 0) {
        const totalSec = Math.floor(diff / 1000)
        return { label: 'START OVER', time: formatTimeLong(totalSec), color: 'text-orange-400/70' }
      }

      return { label: 'AANVANG', time: showStartTime, color: 'text-orange-400/40' }
    } catch (e) {
      return { label: 'STATUS', time: '--:--', color: 'text-white/20' }
    }
  }

  const { label: timerLabel, time: timerValue, color: timerColor } = getShowTimer()

  // Calculate fast blink state
  const { eventDuration, eventRemaining, isEventOverdue } = useMemo(() => {
    const activeEvent = activeEventIndex >= 0 ? events[activeEventIndex] : null
    if (!activeEvent) return { eventDuration: 0, eventRemaining: 0, isEventOverdue: false }

    const groupRows = events.filter(e => e.act === activeEvent.act && e.sceneId === activeEvent.sceneId && e.eventId === activeEvent.eventId)
    const titleRowElement = groupRows.find(e => e.type?.toLowerCase() === 'title')
    const triggerRowElement = groupRows.find(e => e.type?.toLowerCase() === 'trigger')
    const dur = (triggerRowElement?.effect?.toLowerCase() === 'timed' ? triggerRowElement.duration : 0) || titleRowElement?.duration || 0

    const elapsed = isPaused
      ? Math.round(((pauseStartTime || Date.now()) - (lastTransitionTime || Date.now())) / 1000)
      : (lastTransitionTime ? Math.round((Date.now() - lastTransitionTime) / 1000) : 0)

    const remaining = Math.max(0, dur - elapsed)
    return {
      eventDuration: dur,
      eventRemaining: remaining,
      isEventOverdue: dur > 0 && remaining === 0
    }
  }, [activeEventIndex, events, isPaused, pauseStartTime, lastTransitionTime, currentTime])

  // "Quiet" pulse when running, "Fast/Bright" pulse when overdue OR in last 5s
  const isFastBlinking = (isEventOverdue || (eventDuration > 0 && eventRemaining > 0 && eventRemaining <= 5)) && !isPaused
  const pulseClass = isFastBlinking ? "animate-fast-bright-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "animate-pulse"

  useEffect(() => {
    initializeShows()
  }, [])

  // Host-only startup prompt: if no active show after loading, open the selector.
  useEffect(() => {
    if (!isHost) return
    if (showsLoading) return
    if (activeShow) {
      setShowStartupShowSelect(false)
      return
    }
    // Only prompt when we have finished a load attempt (success or error).
    setShowStartupShowSelect(true)
  }, [isHost, showsLoading, activeShow?.id])

  // Host-only hotkey: Ctrl+F5 reloads show list (and gives feedback)
  useEffect(() => {
    if (!isHost) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F5') {
        e.preventDefault()
        initializeShows().then(() => {
          addToast('Showlijst herladen', 'info')
        }).catch(() => {
          // initializeShows handles toast/error state itself; keep this silent
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isHost, initializeShows, addToast])

  // Open Project Settings from child components (edit-mode only)
  useEffect(() => {
    const handler = () => {
      if (isLocked) return
      setIsSettingsOpen(true)
    }
    window.addEventListener('hub:open-project-settings' as any, handler as any)
    return () => window.removeEventListener('hub:open-project-settings' as any, handler as any)
  }, [isLocked])

  useEffect(() => {
    const port = appSettings.serverPort || 3001
    networkService.connect(`http://${window.location.hostname}:${port}`)
    const checkConn = setInterval(() => {
      setSocketConnected(true) // For now assume true if service lives
    }, 2000)
    return () => clearInterval(checkConn)
  }, [appSettings.serverPort])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = window.innerWidth - e.clientX
    if (newWidth > 300 && newWidth < window.innerWidth - 300) {
      updateActiveShowSidebarWidth(newWidth)
    }
  }, [isResizing, updateActiveShowSidebarWidth])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Splitter logic sync back to store
  useEffect(() => {
    if (!isResizing && activeShow) {
      // Logic for saving might go here if needed
    }
  }, [isResizing, activeShow])

  // Sync scroll on active event change
  useEffect(() => {
    if (activeEventIndex !== -1 && autoFollowScript && isLocked) {
      const activeEvent = events[activeEventIndex]
      if (activeEvent && activeEvent.scriptPg) {
        // setEventPage updates local view AND broadcasts EVENT_PAGE to remote clients
        setEventPage(activeEvent.scriptPg)
      }
    }
  }, [activeEventIndex, events, autoFollowScript, isLocked, setEventPage])

  // Sync back to extension when page changes locally
  useEffect(() => {
    networkService.sendCommand({
      type: 'PAGE_UPDATE',
      page: currentScriptPage,
      showId: activeShow?.id
    })
  }, [currentScriptPage, activeShow?.id])

  // Broadcast full state when show or index changes (for remote notebooks)
  useEffect(() => {
    if ((window as any).require && activeShow) { // Only the Host (Electron) should broadcast the source of truth
      useSequencerStore.getState().broadcastState()
    }
  }, [activeShow?.id, activeEventIndex])

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-transition logic for timed events
  useEffect(() => {
    if (!isLocked || !isHost || isPaused || activeEventIndex === -1) return

    const activeEvent = events[activeEventIndex]
    // Find the trigger row for the current active group
    const trigger = events.find(e =>
      e.act === activeEvent.act &&
      e.sceneId === activeEvent.sceneId &&
      e.eventId === activeEvent.eventId &&
      e.type?.toLowerCase() === 'trigger'
    )

    if (trigger?.effect?.toLowerCase() === 'timed') {
      const dur = trigger.duration || 0
      if (dur > 0) {
        const elapsed = Math.round((Date.now() - (lastTransitionTime || Date.now())) / 1000)
        // Check if we hit or exceeded the duration
        if (elapsed >= dur) {
          console.log(`--- AUTO TRIGGER: [${activeEvent.act} ${activeEvent.sceneId}.${activeEvent.eventId}] Timer elapsed (${elapsed}s >= ${dur}s), transitioning...`)
          nextEvent()
        }
      }
    }
  }, [currentTime, isLocked, isHost, isPaused, activeEventIndex, events, lastTransitionTime, nextEvent])

  useEffect(() => {
    if (!isHost) {
      setServerIp(window.location.hostname)
      return
    }
    const getIp = async () => {
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron')
        const ip = await ipcRenderer.invoke('get-ip-address')
        setServerIp(ip)
        // Store the IP in appSettings so broadcastState can use it for logo URL rewriting
        useSequencerStore.getState().updateAppSettings({ serverIp: ip })
      } catch (e) {
        console.error('IP Check failed', e)
      }
    }
    getIp()
  }, [isHost])

  useEffect(() => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron')
      const handleFlash = (_: any, { type, message }: { type: 'info' | 'warning' | 'error', message: string }) => {
        addToast(message, type)
      }
      ipcRenderer.on('flash-message', handleFlash)
      return () => {
        ipcRenderer.removeListener('flash-message', handleFlash)
      }
    }
  }, [addToast])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }



  if (isAuthorized && !hasInitialSync) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white p-12">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-bright-pulse mb-8">
          <Activity className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tighter mb-2">LedShow Initialisatie</h2>
        <p className="text-white/40 text-sm animate-pulse mb-12">Showgegevens synchroniseren...</p>
        <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/2 animate-[loading_2s_infinite_ease-in-out]" />
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes loading {
            0% { transform: translateX(-100%); width: 30%; }
            50% { width: 60%; }
            100% { transform: translateX(333%); width: 30%; }
          }
        `}} />
      </div>
    )
  }


  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden font-sans select-none relative">
      {/* Pre-flight media check modal */}
      {showPreflight && (
        <MediaPreflightModal
          agents={(appSettings.devices || []).filter((d: any) => d.type === 'videowall_agent' && d.enabled !== false) as any[]}
          events={events}
          onComplete={() => {
            setShowPreflight(false)
            setLocked(true)
          }}
          onCancel={() => setShowPreflight(false)}
        />
      )}

      {/* Pre-flight media check modal — runs when transitioning from edit to show mode */}
      {showPreflight && (
        <MediaPreflightModal
          agents={(appSettings.devices || []).filter((d: any) => d.type === 'videowall_agent' && d.enabled !== false) as any[]}
          events={events}
          onComplete={() => {
            setShowPreflight(false)
            setLocked(true)
          }}
          onCancel={() => setShowPreflight(false)}
        />
      )}

      {/* Host-only startup show selector (when no active show is loaded) */}
      {isHost && showStartupShowSelect && (
        <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Kies een show</div>
                  <div className="text-[11px] text-white/50">
                    {showsLoading ? 'Shows laden…' : showsLoadError ? 'Kon shows niet laden' : 'Selecteer een show om te starten'}
                  </div>
                </div>
              </div>

              <button
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Sluiten"
                onClick={() => setShowStartupShowSelect(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {showsLoadError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-white">
                  <div className="text-xs font-bold mb-1">Fout</div>
                  <div className="text-[11px] text-white/70 font-mono break-words">{showsLoadError}</div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  className={cn(
                    "px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors",
                    showsLoading
                      ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  )}
                  disabled={showsLoading}
                  onClick={async () => { await initializeShows() }}
                  title="Herlaad de showlijst"
                >
                  Herlaad shows
                </button>

                <button
                  className={cn(
                    "px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors",
                    showsLoading
                      ? "bg-blue-500/10 border-blue-400/10 text-blue-200/40 cursor-not-allowed"
                      : "bg-blue-500/10 hover:bg-blue-500/15 border-blue-400/20 text-blue-200"
                  )}
                  disabled={showsLoading}
                  onClick={() => {
                    openModal({
                      title: 'Nieuwe show',
                      message: 'Voer een naam in voor de nieuwe show.',
                      type: 'prompt',
                      defaultValue: 'Mijn LedShow',
                      onConfirm: (name: string) => {
                        if (name) createNewShow(name)
                      }
                    })
                  }}
                  title="Maak een nieuwe show"
                >
                  Nieuwe show
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="text-[11px] font-bold text-white/80">Beschikbare shows</div>
                  <div className="text-[10px] text-white/40">{availableShows.length}</div>
                </div>

                <div className="max-h-[340px] overflow-auto">
                  {showsLoading ? (
                    <div className="px-4 py-6 text-[11px] text-white/50 italic">Shows laden…</div>
                  ) : availableShows.length === 0 ? (
                    <div className="px-4 py-6 text-[11px] text-white/50 italic">Geen shows gevonden</div>
                  ) : (
                    <div className="p-2">
                      {availableShows.map(show => (
                        <button
                          key={show.id}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
                          onClick={async () => {
                            await setActiveShow(show)
                            setShowStartupShowSelect(false)
                          }}
                          title={`Laad show: ${show.name}`}
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-400/80" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold truncate">{show.name || 'Naamloze Show'}</div>
                            <div className="text-[10px] text-white/40 font-mono truncate">{show.id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={cn(
            "pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 text-white animate-in slide-in-from-right-10 fade-in duration-300 flex items-start gap-3",
            toast.type === 'error' ? "bg-red-500/20 border-red-500/20" :
              toast.type === 'warning' ? "bg-yellow-500/20 border-yellow-500/20" :
                "bg-black/60"
          )}>
            {toast.type === 'error' && <Activity className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <Activity className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold leading-tight">{toast.type === 'error' ? 'Foutmelding' : toast.type === 'warning' ? 'Waarschuwing' : 'Info'}</p>
              <p className="text-xs opacity-80 leading-relaxed font-mono">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors -mr-2 -mt-2" title="Melding sluiten"><X className="w-4 h-4 opacity-50" /></button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="h-16 glass-header border-b border-white/5 shrink-0 flex items-center justify-between px-6 z-[100] bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-4 group">
            {appSettings.defaultLogo ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <img
                  src={appSettings.defaultLogo}
                  alt="App Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:scale-105 transition-transform duration-300">
                <Activity className="w-6 h-6 text-black font-black" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-widest text-white uppercase truncate max-w-[200px]">
                {activeShow?.name || 'LAAD PROJECT'}
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Time Displays */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Actuele Tijd</span>
            <span className="text-sm font-mono font-black tabular-nums tracking-tighter text-orange-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">{timerLabel}</span>
            <span className={cn("text-sm font-mono font-black tabular-nums tracking-tighter", timerColor)}>
              {timerValue}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          {activeShow && isHost && (
            <button
              onClick={() => {
                if (!isLocked) {
                  // Transitioning edit → show: run pre-flight check first
                  setShowPreflight(true)
                } else {
                  // Transitioning show → edit: unlock immediately
                  setLocked(false)
                }
              }}
              className={cn(
                "h-10 px-4 rounded-xl flex items-center gap-3 transition-all font-bold text-xs uppercase tracking-widest border border-white/10",
                isLocked
                  ? "bg-black/20 text-white/90 hover:bg-white/5"
                  : "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] text-black"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={cn("w-3.5 h-3.5", isLocked ? "text-primary" : "text-black")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {isLocked ? (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                ) : (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
                )}
              </svg>
              {isLocked ? "In Show" : "Edit mode"}
            </button>
          )}

          {isHost && (
            <div className="relative group/menu">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "h-10 px-4 rounded-xl border border-white/10 flex items-center gap-3 transition-all bg-black/20 hover:bg-white/5",
                  isMenuOpen && "bg-white/10 border-white/20 shadow-lg"
                )}
              >
                <Menu className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold">Menu</span>
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[110]"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute top-12 right-0 w-64 bg-[#0a0a0a] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-3 z-[120] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 mb-2 border-b border-white/5 text-left">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Hoofdmenu</span>
                    </div>

                    <div className="px-2 space-y-1">
                      {isLocked ? (
                        <div className="px-4 py-2 text-[10px] text-white/40 italic text-center">
                          Show Modus Actief
                          <br />
                          Ontgrendel om aan te passen
                        </div>
                      ) : (
                        <>
                          {isHost ? (
                            <>
                              <button onClick={() => {
                                openModal({
                                  title: 'Nieuwe Show',
                                  message: 'Voer de naam in voor de nieuwe show:',
                                  type: 'prompt',
                                  defaultValue: 'Mijn LedShow',
                                  onConfirm: (name: string) => {
                                    if (name) createNewShow(name);
                                  }
                                });
                                setIsMenuOpen(false);
                              }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Maak een nieuwe show aan">
                                <Plus className="w-3.5 h-3.5 text-purple-500" /> Nieuwe show maken
                              </button>

                              <button onClick={() => { handleCreateShowWithScript(); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Maak een nieuwe show aan op basis van een script">
                                <FileText className="w-3.5 h-3.5 text-purple-500" /> Nieuwe show met script
                              </button>

                              <div className="relative group/submenu">
                                <button className="w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Laad een bestaande show uit de database">
                                  <div className="flex items-center gap-3"><Layers className="w-3.5 h-3.5 text-blue-400" /> Show laden</div>
                                  <ChevronRight className="w-3 h-3 opacity-40 group-hover/submenu:translate-x-1 transition-transform" />
                                </button>
                                <div className="absolute right-full top-0 mr-1 w-64 bg-[#0a0a0a] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 hidden group-hover/submenu:block animate-in fade-in slide-in-from-right-2 duration-200">
                                  <button
                                    onClick={async () => { await initializeShows(); }}
                                    className={cn(
                                      "w-full px-4 py-2 text-left text-[10px] hover:bg-white/10 transition-colors truncate text-white flex items-center gap-2",
                                      showsLoading && "opacity-40 pointer-events-none"
                                    )}
                                    title="Herlaad de showlijst"
                                  >
                                    <Radar className="w-2.5 h-2.5 text-blue-400/60" />
                                    {showsLoading ? 'Shows laden…' : 'Herlaad shows'}
                                  </button>

                                  {showsLoadError && (
                                    <div className="px-4 py-2 text-[10px] text-red-300/80 italic text-left break-words">
                                      Kon shows niet laden
                                    </div>
                                  )}

                                  <div className="h-px bg-white/10 my-1" />

                                  {showsLoading ? (
                                    <div className="px-4 py-2 text-[10px] text-white/40 italic text-left">Shows laden…</div>
                                  ) : availableShows.length === 0 ? (
                                    <div className="px-4 py-2 text-[10px] text-white/40 italic text-left">Geen shows gevonden</div>
                                  ) : availableShows.map((show) => (
                                    <button
                                      key={show.id}
                                      onClick={async () => { await setActiveShow(show); setIsMenuOpen(false); }}
                                      className={cn(
                                        "w-full px-4 py-2 text-left text-[10px] hover:bg-white/10 transition-colors truncate text-white flex items-center gap-2",
                                        activeShow?.id === show.id && "text-blue-400 font-bold bg-blue-400/5"
                                      )}
                                      title={`Laad show: ${show.name}`}
                                    >
                                      <Activity className="w-2.5 h-2.5 text-blue-400/60" />
                                      {show.name || 'Naamloze Show'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button onClick={() => { handleImportShow(); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Importeer een show vanuit een XML of JSON bestand">
                                <FileText className="w-3.5 h-3.5 text-purple-500" /> Show importeren
                              </button>

                              {activeShow && (
                                <button onClick={() => { handleExportShow(); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Exporteer de huidige show naar een JSON bestand">
                                  <Download className="w-3.5 h-3.5 text-purple-500" /> Show exporteren
                                </button>
                              )}

                              {activeShow && (
                                <button onClick={() => {
                                  if (!activeShow) return;
                                  openModal({
                                    title: 'Show Verwijderen',
                                    message: `Weet je zeker dat je show "${activeShow.name}" wilt verwijderen (archiveren)?`,
                                    type: 'confirm',
                                    onConfirm: () => {
                                      archiveShow(activeShow.id);
                                      setIsMenuOpen(false);
                                    }
                                  });
                                }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white" title="Verwijder de huidige show definitief">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" /> Show verwijderen
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="px-4 py-2 text-[10px] text-white/40 italic text-left">
                              Alleen de Hub kan shows beheren.
                            </div>
                          )}

                          <div className="h-px bg-white/10 my-1" />
                        </>
                      )}

                      {activeShow && (
                        <>
                          <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <Clock className={cn("w-3.5 h-3.5 text-purple-500", !isTimeTracking && "opacity-40", isTimeTracking && "animate-pulse")} />
                              <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-white">Timing Bijhouden</span><span className="text-[8px] opacity-40 uppercase font-bold text-white">{isTimeTracking ? 'Actief' : 'Uitgeschakeld'}</span></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleTimeTracking(); }} className={cn("w-10 h-5 rounded-full relative transition-all duration-500 p-1 border border-white/10", isTimeTracking ? "bg-purple-500/20 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]" : "bg-white/5 shadow-inner")} title="Schakel timing bijhouden in/uit"><div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg", isTimeTracking ? "ml-auto bg-purple-500 shadow-[0_0_8px_#a855f7]" : "mr-auto bg-white/20")} /></button>
                          </div>
                          <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/5">
                            <div className="flex items-center gap-3 text-left">
                              <FileText className={cn("w-3.5 h-3.5 text-purple-500", !autoFollowScript && "opacity-40")} />
                              <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-white">Volg Script</span><span className="text-[8px] opacity-40 uppercase font-bold text-left text-white">{autoFollowScript ? 'Automatisch' : 'Handmatig'}</span></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleAutoFollowScript(); }} className={cn("w-10 h-5 rounded-full relative transition-all duration-500 p-1 border border-white/10", autoFollowScript ? "bg-purple-500/20 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]" : "bg-white/5 shadow-inner")} title="Schakel script automatisch volgen in/uit"><div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg", autoFollowScript ? "ml-auto bg-purple-500 shadow-[0_0_8px_#a855f7]" : "mr-auto bg-white/20")} /></button>
                          </div>

                          <button onClick={() => {
                            setSetupWizardStep(1);
                            setIsMenuOpen(false);
                          }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-white border-t border-white/5" title="Configureer externe VideoWall Agents">
                            <Monitor className="w-3.5 h-3.5 text-purple-500" /> VideoWall agent setup
                          </button>
                        </>
                      )}

                      {!isLocked && (
                        <>
                          <div className="h-px bg-white/10 my-1" />

                          {activeShow && (
                            <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-left text-white" title="Pas show-specifieke instellingen aan"><Settings className="w-3.5 h-3.5 text-purple-500" /> Show instellingen</button>
                          )}

                          <button onClick={() => { setIsAppSettingsOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-left text-white" title="Pas algemene applicatie instellingen aan"><Settings2 className="w-3.5 h-3.5 text-purple-500" /> App instellingen</button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

          )}


          {isHost && (
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title={isFullscreen ? 'Minimize' : 'Maximize'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-primary" /> : <Maximize className="w-4 h-4 text-primary" />}
            </button>
          )}

          <button
            onClick={() => {
              if (!appSettings.accessPin) {
                openModal({
                  title: 'Toegangspincode Instellen',
                  message: 'Er is nog geen pincode ingesteld voor dit systeem. Voer een pincode in om de LedShow te kunnen vergrendelen:',
                  type: 'prompt',
                  confirmLabel: 'Opslaan & Vergrendelen',
                  onConfirm: (pin: string) => {
                    if (pin && pin.trim()) {
                      useSequencerStore.getState().updateAppSettings({ accessPin: pin.trim() });
                      setAppLocked(true);
                      addToast('Pincode opgeslagen en systeem vergrendeld', 'info');
                    } else {
                      addToast('Pincode mag niet leeg zijn', 'warning');
                    }
                  }
                });
              } else {
                setAppLocked(true);
              }
            }}
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-all bg-black/20 border border-white/10",
              appLocked ? "text-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
            title="Systeemslot"
          >
            <Lock className="w-4 h-4" />
          </button>

          {isHost && (
            <button
              onClick={() => {
                openModal({
                  title: 'Applicatie Sluiten',
                  message: 'Weet je zeker dat je de applicatie wilt afsluiten?',
                  type: 'confirm',
                  onConfirm: () => {
                    if ((window as any).require) {
                      const { ipcRenderer } = (window as any).require('electron')
                      ipcRenderer.send('app-quit')
                    }
                  }
                });
              }}
              className="w-10 h-10 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-red-500/60 hover:text-red-500"
              title="Applicatie Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative" >
        {!activeShow && (
          <div className="absolute inset-0 z-[60] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
              <Layers className="w-10 h-10 text-primary opacity-40" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Geen show geladen</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isHost
                  ? 'Er is momenteel geen actieve show ingeladen.'
                  : 'Wacht op de Hub om een show te laden…'}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {/* Recent shows list */}
              {isHost && availableShows.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Recente Shows</span>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/40 p-1.5">
                    {availableShows.map((show, idx) => (
                      <button
                        key={show.id}
                        onClick={() => setActiveShow(show)}
                        className="w-full px-4 py-2.5 text-left text-sm rounded-lg hover:bg-primary/20 transition-all flex items-center gap-3 group border border-transparent hover:border-primary/20"
                      >
                        <Activity className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold truncate block ${!show.name ? 'italic text-muted-foreground' : ''}`}>{show.name || 'Naamloze Show'}</span>
                        </div>
                        {idx === 0 && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Recent</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {isHost && availableShows.length > 0 && (
                <div className="flex items-center gap-3 px-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">of</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              {isHost && (
                <button
                  onClick={() => {
                    openModal({
                      title: 'Nieuwe Show',
                      message: 'Voer de naam in voor de nieuwe show:',
                      type: 'prompt',
                      defaultValue: 'Mijn LedShow',
                      onConfirm: (name: string) => {
                        if (name) createNewShow(name);
                      }
                    });
                  }}
                  className="w-full py-3 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-3"
                >
                  <Plus className="w-4 h-4" /> Nieuwe Show
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <section className="flex-1 flex flex-col border-r border-white/5 min-w-[400px] relative">
            {!isLocked && !isHost && (
              <div className="absolute inset-0 z-[2000] bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6 animate-pulse">
                  <Settings className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Show in bewerking</h3>
                <p className="text-sm text-white/40 max-w-xs">
                  De hoofdcomputer is de show momenteel aan het aanpassen. Zodra deze weer wordt vrijgegeven, verschijnt hier de nieuwe actuele show.
                </p>
              </div>
            )}
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Sequence</span>
              <div className="flex items-center gap-2 text-[10px] font-mono opacity-40 border-l border-white/5 pl-4">
                {activeEventIndex + 1} / {events.length}
              </div>
            </div>

            {isLocked && <StickyHub />}

            <div className="flex-1 overflow-auto p-2 custom-scrollbar">
              <SequenceGrid />
            </div>
          </section>

          {/* Splitter Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-1 z-30 cursor-col-resize transition-colors hover:bg-primary/50 relative",
              isResizing ? "bg-primary" : "bg-white/5"
            )}
          >
            <div className="absolute inset-y-0 -left-2 -right-2" />
          </div>

          <section className="sidebar-resizable flex flex-col bg-black/40 shrink-0">
            <div className="flex flex-col flex-1">
              {/* Camera Viewing Boxes */}
              {selectedCameraClients.length > 0 && (
                <>
                  <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Webcam Streams</span>
                    <button
                      onClick={() => setIsWebcamExpanded(!isWebcamExpanded)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                      title={isWebcamExpanded ? "Inklappen" : "Uitklappen"}
                    >
                      {isWebcamExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-40" /> : <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
                    </button>
                  </div>
                  <div className={cn(
                    "grid grid-cols-2 gap-px bg-white/5 border-b border-white/10 shrink-0 transition-all duration-300 overflow-hidden",
                    isWebcamExpanded ? "h-48 opacity-100" : "h-0 opacity-0 border-none"
                  )}>
                    {[0, 1].map((idx) => {
                      const uuid = selectedCameraClients[idx]
                      const frame = uuid ? activeCameraStreams[uuid] : null
                      const clientIdx = connectedClients.findIndex(c => c.uuid === uuid)
                      const label = clientIdx === 0 ? 'Host' : clientIdx > 0 ? `Workstation ${clientIdx + 1}` : `Client ${idx + 1}`
                      return (
                        <div key={idx} className="relative bg-black flex items-center justify-center overflow-hidden h-full group border-r border-white/5">
                          {uuid && frame ? (
                            <>
                              <img src={frame} className="w-full h-full object-cover" alt={`Camera ${idx + 1}`} />
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white/60 border border-white/10 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                {label}
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2 opacity-20">
                              <Camera className="w-6 h-6" />
                              <span className="text-[10px] font-black uppercase tracking-widest">No Stream</span>
                            </div>
                          )}

                          {uuid && (
                            <button
                              onClick={() => {
                                useSequencerStore.getState().clearCameraStream(uuid)
                                toggleCameraSelection(uuid)
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-500"
                              title="Sluiten"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Script</span>
              </div>

              <div className="flex-1 p-0 overflow-hidden relative">
                <PdfViewer />
              </div>
            </div>
          </section>
        </div>

        {/* Collapsible Status Sidebar & Mini-Sidebar Strip */}
        <aside className={cn(
          "h-full border-l border-white/5 glass bg-black/60 transition-all duration-300 ease-in-out z-40 overflow-hidden flex",
          isStatusOpen ? "w-72" : "w-12"
        )}>
          {/* Mini Sidebar Strip (Visible when closed) */}
          {!isStatusOpen && (
            <div className="w-12 flex flex-col items-center py-4 gap-6 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsStatusOpen(true)}>
              <div className="opacity-20 hover:opacity-60 transition-opacity">
                <Activity className="w-4 h-4" />
              </div>

              <div className="h-px w-6 bg-white/10" />

              {/* HUB STATUS */}
              <div className="flex flex-col items-center gap-1.5" title="Hub Status">
                <span className="text-[6px] font-black opacity-40 uppercase tracking-tight text-primary/60">HUB</span>
                <div className={cn("w-2 h-2 rounded-full", socketConnected ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500 animate-pulse")} />
              </div>

              <div className="h-px w-4 bg-white/5" />

              {/* DYNAMIC GROUPED DEVICE DOTS */}
              <div className="flex flex-col items-center gap-4 overflow-y-auto custom-scrollbar-none py-1 max-h-[400px]">
                {[
                  { id: 'wled', label: 'WLED', color: 'text-green-500/60' },
                  { id: 'wiz', label: 'WIZ', color: 'text-green-500/60' },
                  { id: 'local_monitor', label: 'LOCAL', color: 'text-blue-400/60' },
                  { id: 'remote_VideoWall', label: 'WALL', color: 'text-blue-400/60' }
                ].map(group => {
                  const devices = appSettings.devices?.filter(d => d.enabled && d.type === group.id) || []
                  if (devices.length === 0) return null

                  return (
                    <div key={group.id} className="flex flex-col items-center gap-2">
                      <span className={cn("text-[6px] font-black uppercase tracking-tighter opacity-40 whitespace-nowrap", group.color)}>
                        {group.label}
                      </span>
                      <div className="flex flex-col items-center gap-2">
                        {devices.map(device => {
                          const availability = deviceAvailability[device.id]?.status || 'offline'
                          let isOnline = availability === 'online'

                          // Local override for Host: if it's a local monitor, double check against displays
                          if (isHost && device.type === 'local_monitor') {
                            const monitorId = (device as any).monitorId;
                            const hasDisplay = displays.some(d => d.index === monitorId);
                            if (!hasDisplay) isOnline = false;
                          }

                          const colorClass = isOnline ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500 animate-pulse"
                          return (
                            <div key={device.id} className="flex flex-col items-center gap-1" title={`${device.name}: ${isOnline ? 'On-air' : 'OFFLINE'}`}>
                              <span className={cn("text-[5px] font-black uppercase tracking-tighter leading-none transition-colors", isOnline ? "opacity-20" : "text-red-500 opacity-100")}>
                                {device.name.substring(0, 3)}
                              </span>
                              <div className={cn("w-1.5 h-1.5 rounded-full transition-all", colorClass)} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {(!appSettings.devices || appSettings.devices.filter(d => d.enabled).length === 0) && (
                  <span className="text-[7px] opacity-20 font-bold">EMPTY</span>
                )}
              </div>

              <div className="h-px w-6 bg-white/10" />

              {/* CAMERA LOCAL */}
              <div
                className="flex flex-col items-center gap-2 cursor-pointer"
                title="Lokale Camera"
                onClick={(e) => {
                  e.stopPropagation();
                  setCameraActive(!isCameraActive);
                }}
              >
                <span className="text-[7px] font-black opacity-40 uppercase tracking-tight">CAM</span>
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all duration-500",
                  isCameraActive ? "bg-primary shadow-[0_0_8px_#f97316]" : "bg-white/5"
                )} />
              </div>
            </div>
          )}

          {/* Full Sidebar Content */}
          <div className={cn("w-72 flex flex-col h-full", !isStatusOpen && "hidden")}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60 px-2">Status</span>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                title="Inklappen"
              >
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            </div>
            <div className="p-4 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Category: HUB */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
                  <Cloud className="w-3 h-3" /> System Hub
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                    <span>Central Hub</span>
                    <div className={cn("w-1.5 h-1.5 rounded-full", socketConnected ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500")} />
                  </div>
                  <div className="p-3 glass rounded-xl bg-white/5 border border-white/5 text-[11px] font-mono">
                    <div className="flex justify-between"><span>Status</span><span className={socketConnected ? "text-green-500" : "text-red-500"}>{socketConnected ? "CONNECTED" : "OFFLINE"}</span></div>
                    <div className="flex justify-between opacity-60"><span>Environment</span><span>{isHost ? 'NODE_PROV' : 'BROWSER_REMOTE'}</span></div>
                  </div>
                </div>
              </div>

              {/* Category: LIGHTS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-green-500/60">
                  <Wifi className="w-3 h-3" /> Light Fixtures
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                    <span>Devices ({appSettings.devices?.filter(d => d.type === 'wled' || d.type === 'wiz').length || 0})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 px-1">
                    {appSettings.devices?.filter(d => d.type === 'wled' || d.type === 'wiz').map((device) => {
                      const status = deviceAvailability[device.id]?.status || 'offline'
                      const isOnline = status === 'online'
                      // if (idx === 0) console.log('--- SIDEBAR: Device', device.name, 'ID:', device.id, 'Status:', status)
                      return (
                        <div key={device.id} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-white/5 border border-white/5 transition-all hover:bg-white/10">
                          <span className={cn("truncate max-w-[120px]", isOnline ? "opacity-80" : "text-red-400 font-bold")}>{device.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] opacity-40">{device.type}</span>
                            <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500")} />
                          </div>
                        </div>
                      )
                    })}
                    {(!appSettings.devices || appSettings.devices.filter(d => d.type === 'wled' || d.type === 'wiz').length === 0) && (
                      <div className="text-[10px] opacity-20 italic px-2">Geen lights geconfigureerd</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category: MEDIA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60">
                  <Cpu className="w-3 h-3" /> Media Servers
                </div>
                <div className="grid grid-cols-1 gap-1.5 px-1">
                  {appSettings.devices?.filter(d => d.type === 'local_monitor' || d.type === 'remote_VideoWall').map(device => {
                    const availability = deviceAvailability[device.id]?.status || 'offline'
                    let isOnline = availability === 'online'

                    let subtext = device.type as string;
                    if (device.type === 'local_monitor') {
                      const monitorId = (device as any).monitorId;
                      const disp = displays.find(d => d.index === monitorId);

                      // Force offline if display is missing on host
                      if (isHost && !disp) isOnline = false;

                      if (disp) {
                        subtext = `${disp.isPrimary ? 'Hoofdscherm ' : ''}${disp.bounds.width}x${disp.bounds.height}`;
                      } else {
                        subtext = `Monitor ${monitorId + 1} (Niet gevonden)`;
                      }
                    }

                    return (
                      <div key={device.id} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-white/5 border border-white/5 font-mono transition-all hover:bg-white/10" title={device.name}>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn("truncate transition-colors", isOnline ? "opacity-80 text-white" : "text-red-500 font-bold")}>{device.name}</span>
                          <span className={cn("text-[7px] truncate transition-colors", isOnline ? "opacity-30" : "text-red-400 font-black italic uppercase")}>{subtext}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {device.type === 'local_monitor' ? <Monitor className={cn("w-2.5 h-2.5 transition-opacity", isOnline ? "opacity-40" : "opacity-100 text-red-500")} /> : <Layers className="w-2.5 h-2.5 opacity-40" />}
                          <div className={cn("w-2 h-2 rounded-full transition-all", isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 animate-pulse")} />
                        </div>
                      </div>
                    )
                  })}
                  {(!appSettings.devices || appSettings.devices.filter(d => d.type === 'local_monitor' || d.type === 'remote_VideoWall').length === 0) && (
                    <div className="text-[10px] opacity-20 italic px-2 font-mono">Geen media devices</div>
                  )}
                </div>
              </div>

              {/* Category: REMOTE WORKSTATIONS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-purple-400/60">
                    <Laptop className="w-3 h-3" /> Workstations
                  </div>
                </div>
                <div className="space-y-3 px-1">
                  {/* Local Camera Sharing Switch */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-xl border mb-4 transition-all",
                    !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia
                      ? "bg-red-500/5 border-red-500/10 opacity-60"
                      : "bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10"
                  )}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Camera className={cn("w-3 h-3", isCameraActive ? "text-primary" : "text-white/20")} />
                        <span className="text-[10px] font-bold text-white/90">Mijn camera delen</span>
                      </div>
                      <p className="text-[8px] text-white/30 uppercase font-black">
                        {!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia
                          ? 'Systeem geblokkeerd (HTTPS nodig)'
                          : (isCameraActive ? 'Actief' : 'Geweigerd')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => {
                          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                            openModal({
                              title: "Webcam Beveiliging",
                              message: `Om je camera te kunnen gebruiken op deze remote laptop, moet de browser toestemming geven voor onbeveiligde verbindingen.\n\nInstructies:\n1. Open een nieuw tabblad en ga naar:\nchrome://flags/#unsafely-treat-insecure-origin-as-secure\n\n2. Vul bij \'Unsafely treat insecure origin as secure\' dit adres in:\nhttp://${window.location.hostname}:5173\n\n3. Zet de optie op \'Enabled\' en herstart de browser.`,
                              type: "confirm",
                              confirmLabel: "Ik snap het",
                              cancelLabel: "Sluiten",
                              onConfirm: () => { },
                            })
                          } else {
                            const nextActive = !isCameraActive
                            setCameraActive(nextActive)
                            if (nextActive) setSelfPreviewVisible(true)
                          }
                        }}
                        title={!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ? "Camera niet beschikbaar (HTTPS vereist). Klik voor instructies." : "Lokale camera delen aan/uit"}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-all duration-300 p-1 border border-white/10",
                          isCameraActive ? "bg-primary/20" : "bg-white/5 shadow-inner",
                          (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && "bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                        )}
                      >
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all duration-500",
                          isCameraActive ? "ml-auto bg-primary shadow-[0_0_8px_#f97316]" : "mr-auto bg-white/20",
                          (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && "bg-orange-500 animate-pulse"
                        )} />
                      </button>
                      {isCameraActive && !isSelfPreviewVisible && (
                        <button
                          onClick={() => setSelfPreviewVisible(true)}
                          className="text-[7px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors pr-1"
                        >
                          Toon preview
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {/* Show Host First (usually index 0) */}
                    {connectedClients.length > 0 && (() => {
                      const { clientUUID: myUUID } = useSequencerStore.getState()
                      return connectedClients.map((clientObj, idx) => {
                        const { id: clientId, uuid: clientUUID } = clientObj
                        const isSelf = clientUUID === myUUID
                        const isHostClient = idx === 0
                        const isSelected = selectedCameraClients.includes(clientUUID)

                        return (
                          <div key={clientUUID || clientId} className={cn(
                            "flex items-center justify-between text-[10px] p-2 rounded-lg border transition-all",
                            isSelf ? "bg-primary/5 border-primary/20" : "bg-white/2 border-white/5 hover:bg-white/5"
                          )}>
                            <div className="flex items-center gap-2">
                              <Monitor className={cn("w-3 h-3", isHostClient ? "text-yellow-500/60" : "text-purple-400/60")} />
                              <div className="flex flex-col">
                                <span className="font-mono">
                                  {clientObj.friendlyName || (isHostClient ? 'Host Controller' : `Workstation ${idx + 1}`)}
                                  {isSelf && <span className="text-[8px] text-primary ml-1.5 opacity-60">(Jij)</span>}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isSelf && (
                                <button
                                  onClick={() => toggleCameraSelection(clientUUID)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    isSelected ? "bg-primary text-black" : "bg-white/5 text-purple-400 hover:bg-purple-500/20"
                                  )}
                                  title={isSelected ? "Camera verbergen" : "Camera bekijken"}
                                >
                                  <Video className="w-3 h-3" />
                                </button>
                              )}
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isSelf ? "bg-primary shadow-[0_0_5px_#f97316]" : "bg-purple-400 shadow-[0_0_5px_#a855f7]"
                              )} />
                            </div>
                          </div>
                        )
                      })
                    })()}

                    {/* Live Camera Previews in sidebar */}
                    {isDeveloperMode && Object.keys(activeCameraStreams).length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/40 px-1">Live Camera</div>
                        {Object.entries(activeCameraStreams).map(([uuid, frame]) => {
                          const client = connectedClients.find(c => c.uuid === uuid)
                          const label = client?.friendlyName || (uuid.slice(0, 8))
                          return (
                            <div key={uuid} className="relative rounded-lg overflow-hidden border border-white/10 bg-black group/cam">
                              <img src={frame} className="camera-preview-img" alt={label} />
                              <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                                {label}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  useSequencerStore.getState().clearCameraStream(uuid)
                                  if (selectedCameraClients.includes(uuid)) {
                                    toggleCameraSelection(uuid)
                                  }
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover/cam:opacity-100 transition-opacity hover:bg-red-500/20 text-red-500"
                                title="Stream verwijderen"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main >

      {/* Host Debug Overlay for Camera Frames */}
      {
        isDeveloperMode && isHost && Object.keys(activeCameraStreams).length > 0 && (
          <div className="fixed bottom-28 left-8 z-[9999] bg-black/80 text-green-400 p-2 rounded-lg border border-green-500/30 text-[10px] font-mono pointer-events-none">
            <div className="font-bold border-b border-green-500/30 mb-1">CAMERA DEBUG</div>
            {Object.entries(activeCameraStreams).map(([cid, frame]) => (
              <div key={cid}>
                {cid.slice(0, 8)}: Received {(frame.length / 1024).toFixed(1)} KB
              </div>
            ))}
          </div>
        )
      }

      {/* Bottom Control Bar */}
      <footer className="h-24 glass-header border-t border-white/10 shrink-0 flex items-center justify-between px-8 bg-black/60 z-[100]" >
        <div className="flex-1 flex items-center gap-6">
          {/* Layout placeholder for balance */}
        </div>

        <div className="flex-[2] flex items-center justify-center gap-6">
          <button
            onClick={() => {
              if (!isTimeTracking && activeEventIndex === -1) {
                openModal({
                  title: 'Timing Starten?',
                  message: 'Wil je de timing bijhouden voor deze show? Dit wordt opgeslagen in de database.',
                  type: 'confirm',
                  defaultValue: '',
                  confirmLabel: 'Ja, start timing',
                  cancelLabel: 'Nee, alleen starten',
                  onConfirm: () => {
                    toggleTimeTracking();
                    setActiveEvent(0);
                  },
                  onCancel: () => {
                    // Start show WITHOUT tracking timings
                    setActiveEvent(0);
                  }
                });
              } else {
                setActiveEvent(0);
              }
            }}
            disabled={!isLocked || !activeShow}
            title="Start Show / Eerste Event"
            className={cn(
              "w-16 h-16 rounded-full glass border-white/10 flex items-center justify-center transition-all group disabled:opacity-20",
              activeEventIndex === -1 && "bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-bright-pulse border-white/60",
              !isHost && "hidden"
            )}
          >
            <Play className={cn(
              "w-6 h-6 transition-all",
              activeEventIndex === -1 ? "text-white fill-white" : "text-green-400 fill-green-400/20 group-hover:fill-green-400 group-hover:text-black"
            )} />
          </button>

          {/* Active Event Remaining Time */}
          {isLocked && activeEventIndex >= 0 && (
            <button
              onClick={() => isHost && togglePause()}
              disabled={!isHost}
              className={cn(
                "h-14 min-w-[140px] px-4 rounded-xl glass border-white/10 flex flex-col items-center justify-center gap-0.5 transition-all",
                isPaused ? "bg-yellow-500/20 border-yellow-500/40" : "bg-black/20 hover:bg-white/5",
                isFastBlinking && "border-orange-500/50"
              )}
            >
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 text-center leading-tight">Tijd tot volgend<br />event/scene</span>
              <span className={cn(
                "text-lg font-mono font-black tabular-nums tracking-tighter leading-none transition-all",
                isPaused ? "text-yellow-500" :
                  isEventOverdue ? "text-red-500 animate-pulse" :
                    eventRemaining <= 5 ? "text-orange-500 scale-110" : "text-orange-400"
              )}>
                {eventDuration === 0 ? "--:--" : formatTime(eventRemaining)}
              </span>
              {isPaused && <span className="text-[6px] font-black uppercase tracking-[.3em] text-yellow-500/60 mt-0.5 animate-pulse">PAUZE</span>}
            </button>
          )}

          {activeShow && isLocked && activeEventIndex >= 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => nextAct()}
                disabled={!isLocked || !activeShow}
                className={cn(
                  "h-14 min-w-[160px] px-6 rounded-xl glass border-white/10 flex items-center justify-center gap-3 transition-all",
                  blinkingNextAct && `bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] ${pulseClass} border-white/60`,
                  navigationWarning === 'act' && `bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] ${pulseClass} border-white/80`,
                  !isLocked && "opacity-20"
                )}
              >
                <FastForward className={cn("w-5 h-5", (blinkingNextAct || navigationWarning === 'act') ? "text-white" : "text-orange-400")} />
                <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextAct || navigationWarning === 'act') ? "text-white" : "text-muted-foreground")}>
                  {navigationWarning === 'act' ? 'Override?' : 'Next Act'}
                </span>
              </button>

              <button
                onClick={() => nextScene()}
                disabled={!isLocked || !activeShow}
                className={cn(
                  "h-14 min-w-[160px] px-6 rounded-xl glass border-white/10 flex items-center justify-center gap-3 transition-all",
                  blinkingNextScene && `bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] ${pulseClass} border-white/60`,
                  navigationWarning === 'scene' && `bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] ${pulseClass} border-white/80`,
                  !isLocked && "opacity-20"
                )}
              >
                <SkipForward className={cn("w-5 h-5", (blinkingNextScene || navigationWarning === 'scene') ? "text-white" : "text-blue-400")} />
                <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextScene || navigationWarning === 'scene') ? "text-white" : "text-muted-foreground")}>
                  {navigationWarning === 'scene' ? 'Override?' : 'Next Scene'}
                </span>
              </button>
              <button
                onClick={() => nextEvent()}
                disabled={!isLocked || !activeShow}
                className={cn(
                  "h-14 min-w-[160px] px-6 rounded-xl glass border-white/10 flex items-center justify-center gap-3 transition-all",
                  blinkingNextEvent && `bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] ${pulseClass} border-white/60`,
                  navigationWarning === 'event' && `bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] ${pulseClass} border-white/80`,
                  !isLocked && "opacity-20"
                )}
              >
                <FileText className={cn("w-5 h-5", (blinkingNextEvent || navigationWarning === 'event') ? "text-white" : "text-primary")} />
                <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextEvent || navigationWarning === 'event') ? "text-white" : "text-muted-foreground")}>
                  {navigationWarning === 'event' ? 'Override?' : 'Next Event'}
                </span>
              </button>
            </div>
          )}

          {activeShow && isLocked && activeEventIndex === -1 && !isHost && (
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse border border-white/5 px-8 py-4 rounded-xl glass">
              Wachten tot show start
            </div>
          )}

          {activeShow && isLocked && activeEventIndex >= 0 && (
            <button
              onClick={() => { setActiveEvent(-1) }}
              disabled={!activeShow || !isLocked}
              title="Stop/Reset Show"
              className={cn(
                "w-16 h-16 rounded-full glass border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all text-red-500 disabled:opacity-20",
                !activeShow && "cursor-not-allowed"
              )}
            >
              <StopCircle className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-end gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
          <CameraStreamer />
          <div className="flex flex-col items-end justify-center gap-0.5">
            <span
              className={cn("cursor-default select-none transition-colors flex items-center gap-2", isDeveloperMode ? "text-purple-500/60" : "text-muted-foreground/30")}
              onClick={() => {
                const newCount = versionClickCount + 1
                if (versionClickTimer) clearTimeout(versionClickTimer)
                if (newCount >= 3) {
                  setIsDeveloperMode(prev => !prev)
                  setVersionClickCount(0)
                  return
                }
                setVersionClickCount(newCount)
                setVersionClickTimer(setTimeout(() => setVersionClickCount(0), 600))
              }}
              title={isDeveloperMode ? 'Developer Mode actief' : undefined}
            >
              {isDeveloperMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDbManagerOpen(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded-md transition-all text-purple-500/50 hover:text-purple-500 pointer-events-auto"
                  title="Database Beheer"
                >
                  <Monitor className="w-3 h-3" />
                </button>
              )}
              V0.1.0{isDeveloperMode ? ' 🛠' : ''}
            </span>
            <span>{serverIp}:5173</span>
          </div>
        </div>
      </footer >

      <ProjectSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AppSettings
        isOpen={isAppSettingsOpen}
        onClose={() => setIsAppSettingsOpen(false)}
        isDeveloperMode={isDeveloperMode}
        setIsDeveloperMode={setIsDeveloperMode}
        serverIp={serverIp}
      />

      <DatabaseManager
        isOpen={isDbManagerOpen}
        onClose={() => setIsDbManagerOpen(false)}
      />

      {/* Registration Overlay */}
      {
        !isAuthorized && registrationStatus && registrationStatus !== 'AUTHORIZED' && (
          <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="glass border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md flex flex-col items-center gap-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                  <Fingerprint className="w-10 h-10" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black border-4 border-[#050505]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>

              <div className="text-center space-y-3 relative z-10">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Connecting to Hub</h2>
                <p className="text-sm text-white/40 font-medium">Beveiligde verbinding vereist autorisatie</p>
              </div>

              <div className="w-full space-y-6 relative z-10">
                {(!registrationStatus || registrationStatus === 'STARTING') && (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs text-white/40 font-bold tracking-widest uppercase animate-pulse">Verbinden met Hub...</p>
                  </div>
                )}

                {registrationStatus === 'NOT_FOUND' && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 text-center mb-6">Selecteer uw station</p>
                    <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {registrationData?.existingClients?.map((client: { id: string, friendlyName: string }) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            localStorage.setItem('ledshow_client_uuid', client.id)
                            useSequencerStore.setState({
                              clientUUID: client.id,
                              registrationStatus: 'WAITING_PIN',
                              registrationData: { ...registrationData, selectedClientId: client.id }
                            })
                            networkService.registerClient()
                          }}
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center justify-between group/item"
                        >
                          <span className="font-bold text-sm tracking-wide">{client.friendlyName}</span>
                          <ChevronRight className="w-4 h-4 opacity-20 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => useSequencerStore.setState({ registrationStatus: 'WAITING_HOST_PIN' })}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-black uppercase tracking-widest text-white/40 hover:text-primary"
                    >
                      + Nieuw Station Toevoegen
                    </button>
                  </div>
                )}

                {registrationStatus === 'WAITING_HOST_PIN' && (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 text-center">Beheerder Verificatie</p>
                    <p className="text-xs text-white/40 text-center -mt-4 italic">Voer de Host PIN in om een nieuw station te registreren.</p>
                    <div className="space-y-4">
                      <input
                        id="host-pin-input"
                        type="password"
                        placeholder="HOST PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(-4))}
                        maxLength={4}
                        autoComplete="one-time-code"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-center text-3xl font-mono tracking-[0.8em] focus:border-primary/50 outline-none transition-all shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') verifyHostPin(pinInput)
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          verifyHostPin(pinInput)
                        }}
                        className="w-full p-4 rounded-2xl bg-orange-500 text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Verifiëren
                      </button>
                    </div>
                    <button
                      onClick={() => useSequencerStore.setState({ registrationStatus: 'NOT_FOUND' })}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                    >
                      Terug naar lijst
                    </button>
                  </div>
                )}

                {registrationStatus === 'WAITING_REGISTRATION' && (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">Nieuw Station Instellen</p>
                    <div className="space-y-3">
                      <input
                        id="reg-name"
                        type="text"
                        placeholder="STATION NAAM (bijv. Lichtregie)"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center text-sm font-bold tracking-widest focus:border-primary/50 outline-none transition-all"
                        autoFocus
                      />
                      <input
                        id="reg-pin"
                        type="password"
                        placeholder="NIEUWE CLIENT PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(-4))}
                        maxLength={4}
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-center text-xl font-mono tracking-[0.5em] focus:border-primary/50 outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const name = (document.getElementById('reg-name') as HTMLInputElement).value
                        if (name && pinInput) completeRegistration(name, pinInput)
                      }}
                      className="w-full p-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Registratie Voltooien
                    </button>
                  </div>
                )}

                {registrationStatus === 'WAITING_PIN' && (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">Toegang Station</p>
                    <p className="text-xs text-white/40 text-center -mt-4 italic">Voer de PIN in voor dit station.</p>
                    <div className="space-y-4">
                      <input
                        id="client-pin-input"
                        type="password"
                        placeholder="PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(-4))}
                        maxLength={4}
                        autoComplete="one-time-code"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-center text-3xl font-mono tracking-[0.8em] focus:border-primary/50 outline-none transition-all shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') verifyClientPin(pinInput)
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          verifyClientPin(pinInput)
                        }}
                        className="w-full p-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Verbinden
                      </button>
                    </div>
                    <button
                      onClick={() => useSequencerStore.setState({ registrationStatus: 'NOT_FOUND' })}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                    >
                      Andere station kiezen
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black relative z-10 flex items-center gap-2">
                <Wifi className="w-3 h-3 text-primary animate-pulse" />

              </div>
            </div>
          </div>
        )
      }

      {/* Lock Overlay */}
      {
        appLocked && (
          <div className="fixed inset-0 z-[20000] bg-black flex flex-col items-center justify-center p-8 animate-in backdrop-blur-3xl duration-700">
            <div className="flex flex-col items-center gap-12 max-w-sm w-full">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Lock className="w-16 h-16 animate-pulse" />
                </div>
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-white/40 rotate-12">
                  <SkipForward className="w-6 h-6" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Systeem Gesloten</h2>
                <p className="text-sm text-white/40 font-medium">Voer uw pincode in om dit station te ontgrendelen</p>
              </div>

              <div className="w-full space-y-4">
                <input
                  type="password"
                  placeholder="PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(-4))}
                  maxLength={4}
                  autoComplete="one-time-code"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-6 text-center text-4xl font-mono tracking-[1em] focus:border-red-500/50 focus:bg-red-500/5 outline-none transition-all"
                  onKeyDown={(e) => {
                    const val = pinInput
                    if (e.key === 'Enter') {
                      if (isHost) {
                        (async () => {
                          try {
                            // Force refresh app settings from DB first
                            if ((window as any).require) {
                              const { ipcRenderer } = (window as any).require('electron')
                              const settings = await ipcRenderer.invoke('db:get-app-settings')
                              console.log('--- HOST AUTH: Refreshed DB Settings:', settings)
                              useSequencerStore.setState({ appSettings: { ...useSequencerStore.getState().appSettings, ...settings } })
                            }
                            const currentSettings = useSequencerStore.getState().appSettings;
                            const inputPin = val.trim()
                            const masterPin = (currentSettings.accessPin || '').trim()
                            console.log('--- HOST AUTH: Comparing input', `[${inputPin}]`, 'with stored', `[${masterPin}]`)

                            if (inputPin === masterPin) setAppLocked(false)
                            else useSequencerStore.getState().addToast('Ongeldige Host Pin', 'error')
                          } catch (err) {
                            console.error('Auth Error:', err)
                            useSequencerStore.getState().addToast('Fout bij verifiëren', 'error')
                          }
                        })()
                      } else {
                        // Remote clients check their own PIN via server
                        verifyClientPin(val)
                      }
                    }
                  }}
                  autoFocus
                />
                <div className="flex justify-between px-2 items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Station: {clientFriendlyName || (isHost ? 'Host Controller' : 'Unknown')}</span>
                  {isHost && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/40">Host Authentication</span>
                      <button
                        className="text-[9px] text-red-500/50 hover:text-red-500 underline decoration-red-500/30 font-bold uppercase tracking-widest cursor-pointer"
                        onClick={() => {
                          console.log('--- EMERGENCY UNLOCK TRIGGERED ---');
                          console.log('Current Stored PIN:', appSettings.accessPin);
                          if (confirm(`Noodstop: Lock geforceerd verwijderen?\n(Huidige PIN is: '${appSettings.accessPin}')`)) {
                            setAppLocked(false);
                          }
                        }}
                      >
                        NOOD-UNLOCK
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {setupWizardStep !== null && (
        <div className="fixed inset-0 z-[11000] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="glass border border-white/10 p-8 rounded-[2rem] w-full max-w-xl shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Monitor className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">VideoWall Agent Wizard</h2>
              </div>
              <button
                onClick={() => { setSetupWizardStep(null); setIsWizardScanning(false); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Sluiten"
              >
                <X className="w-5 h-5 opacity-40 hover:opacity-100" />
              </button>
            </div>

            <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  setupWizardStep >= s ? "bg-primary" : "bg-white/10"
                )} />
              ))}
            </div>

            {setupWizardStep === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <h3 className="font-bold text-white">Stap 1: Client Voorbereiden</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Open op de externe computer (waar de Videowall op aangesloten is) een browser en ga naar de volgende URL om de software te downloaden en configureren:
                  </p>
                </div>

                <div className="bg-black/40 border border-white/5 p-6 rounded-2xl flex items-center justify-center text-center">
                  <code className="text-primary text-xl font-mono font-bold tracking-wider">
                    http://{serverIp}:{(appSettings.serverPort || 3001) + 1}/setup
                  </code>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-white/20 uppercase font-black tracking-widest text-center">
                    Gezien op hetzelfde netwerk: {serverIp}
                  </p>
                  <button
                    onClick={() => {
                      setSetupWizardStep(2);
                      setIsWizardScanning(true);
                    }}
                    className="w-full bg-primary text-black font-black uppercase py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)]"
                  >
                    Ik ga downloaden & starten
                  </button>
                </div>
              </div>
            )}

            {setupWizardStep === 2 && (
              <div className="space-y-8 py-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="relative">
                    <Radar className="w-16 h-16 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-white">Stap 2: Wachten op Agent...</h3>
                    <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                      Start de agent op de externe computer. De Hub zal de agent automatisch herkennen zodra deze verbinding maakt.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Status</span>
                  <span className="text-xs font-bold text-primary animate-pulse">Scannen naar nieuwe agents op netwerk...</span>
                </div>

                <button
                  onClick={() => setIsWizardScanning(false)}
                  className="w-full py-4 text-xs font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                >
                  Pauzeer scannen
                </button>
              </div>
            )}

            {setupWizardStep === 3 && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 animate-bounce">
                    <Plus className="w-10 h-10 rotate-45" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Agent Gevonden!</h3>
                    <p className="text-xs text-white/40">Een nieuwe VideoWall Agent is succesvol aangemeld.</p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white uppercase">{foundAgent?.name}</div>
                      <div className="text-xs font-mono text-green-500/60">{foundAgent?.ip}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => { setSetupWizardStep(null); setIsWizardScanning(false); }}
                    className="flex-1 py-4 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                  >
                    Sluiten
                  </button>
                  <button
                    onClick={() => {
                      setSetupWizardStep(null);
                      setIsWizardScanning(false);
                      setIsAppSettingsOpen(true);
                      // Wait a bit for settings to open then search? 
                      // For now just opening is enough.
                    }}
                    className="flex-1 bg-primary text-black font-black uppercase py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)]"
                  >
                    Naar Instellingen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <SimpleModal {...modalConfig} />
    </div >
  )
}
