import React, { useState, useEffect, useCallback } from 'react'
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
  Play,
  StopCircle,
  Clock,
  FileText,
  Cloud,
  Maximize,
  Minimize,
  Layers,
  Laptop,
  Video,
  Camera
} from 'lucide-react'
import { useShowStore } from './store/useShowStore'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import SequenceGrid from './components/SequenceGrid'
import ProjectSettings from './components/ProjectSettings'
import PdfViewer from './components/PdfViewer'
import AppSettings from './components/AppSettings'
import { DatabaseManager } from './components/DatabaseManager'
import SimpleModal from './components/SimpleModal'
import CameraStreamer from './components/CameraStreamer'
import { networkService } from './services/network-service'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
    lastTransitionTime,
    autoFollowScript,
    toggleAutoFollowScript,
    setCurrentScriptPage,
    connectedClients,
    isCameraActive,
    setCameraActive,
    activeCameraStreams,
    selectedCameraClients,
    toggleCameraSelection,
    toasts,
    addToast,
    removeToast
  } = useShowStore()

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
  const [pinInput, setPinInput] = useState('')
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [hasInitialSync, setHasInitialSync] = useState(false)

  // Double click protection for version
  const [versionClickCount, setVersionClickCount] = useState(0)
  const [versionClickTimer, setVersionClickTimer] = useState<any>(null)
  const [isDeveloperMode, setIsDeveloperMode] = useState(false)

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm' as 'confirm' | 'prompt',
    defaultValue: '',
    onConfirm: (val?: string) => { console.log(val) }
  })

  const [showCameraHelp, setShowCameraHelp] = useState(false)

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const isHost = !!(window as any).require

  // Set initial sync to true if we are the host
  useEffect(() => {
    if (isHost) setHasInitialSync(true);
  }, [isHost]);

  // Auto-fullscreen on host mount
  useEffect(() => {
    if (isHost) {
      // Small delay to ensure everything is settled
      setTimeout(() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            console.log('Fullscreen attempt blocked or failed');
          });
        }
      }, 2000);
    }
  }, [isHost]);

  // Listen for sync to set hasInitialSync
  useEffect(() => {
    if (!isHost) {
      const checkSync = () => {
        const state = useShowStore.getState();
        if (state.activeShow || state.appSettings.serverPort) {
          setHasInitialSync(true);
        }
      };
      // Check frequently early on
      const interval = setInterval(checkSync, 500);
      return () => clearInterval(interval);
    }
  }, [isHost]);

  const showPinScreen = !isLocalhost && !isHost && (appSettings.accessPin ? !isPinVerified : false)

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
  const activeEvent = activeEventIndex >= 0 ? events[activeEventIndex] : null
  const titleRow = activeEvent ? events.find(e => e.act === activeEvent.act && e.sceneId === activeEvent.sceneId && e.eventId === activeEvent.eventId && e.type === 'Title') : null
  const eventDuration = titleRow?.duration || 0
  const eventElapsed = lastTransitionTime ? Math.round((Date.now() - lastTransitionTime) / 1000) : 0
  const eventRemaining = Math.max(0, eventDuration - eventElapsed)
  const isEventOverdue = eventDuration > 0 && eventRemaining === 0
  const pulseClass = isEventOverdue ? "animate-fast-bright-pulse" : "animate-bright-pulse"

  useEffect(() => {
    initializeShows()
  }, [])

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
    if (activeEventIndex !== -1 && autoFollowScript) {
      const activeEvent = events[activeEventIndex]
      if (activeEvent && activeEvent.scriptPg) {
        setCurrentScriptPage(activeEvent.scriptPg)
      }
    }
  }, [activeEventIndex, events])

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
      useShowStore.getState().broadcastState()
    }
  }, [activeShow?.id, activeEventIndex])

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-select camera clients when they start streaming (so host sees them automatically)
  useEffect(() => {
    if (!isHost) return
    const myId = networkService.getSocketId()
    Object.keys(activeCameraStreams).forEach(clientId => {
      if (clientId !== myId && !selectedCameraClients.includes(clientId)) {
        toggleCameraSelection(clientId)
      }
    })
  }, [activeCameraStreams]) // eslint-disable-line react-hooks/exhaustive-deps

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
        useShowStore.getState().updateAppSettings({ serverIp: ip })
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

  console.log('--- App.tsx: Proceeding to render JSX ---')

  if (!hasInitialSync) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white p-12">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-bright-pulse mb-8">
          <Activity className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tighter mb-2">LedShow Initialisatie</h2>
        <p className="text-white/40 text-sm animate-pulse mb-12">Verbinden met systeem-service...</p>
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

  if (showPinScreen) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-white p-8">
        <div className="glass border border-white/10 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300">
          <div className="p-4 rounded-2xl bg-primary/20 text-primary">
            <Laptop className="w-8 h-8" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Remote Toegang</h2>
            <p className="text-sm text-white/40">Voer de pincode in van de Show Controller om verbinding te maken.</p>
          </div>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value
              setPinInput(val)
              if (val === appSettings.accessPin) setIsPinVerified(true)
            }}
            placeholder="PINCODE"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[1em] focus:border-primary/50 outline-none transition-all"
            autoFocus
          />
          <div className="text-[10px] text-white/20 uppercase tracking-widest font-black">
            Verbinding via {window.location.hostname}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden font-sans select-none relative">
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
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors -mr-2 -mt-2"><X className="w-4 h-4 opacity-50" /></button>
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
              onClick={() => setLocked(!isLocked)}
              className={cn(
                "h-10 px-4 rounded-xl flex items-center gap-3 transition-all font-bold text-xs uppercase tracking-widest",
                isLocked
                  ? "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                  : "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] text-black"
              )}
            >
              {isLocked
                ? <><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> In Show</>
                : <><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg> Edit mode</>
              }
            </button>
          )}

          {isHost && (
            <div className="relative group/menu">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "h-10 px-4 rounded-xl border border-white/10 flex items-center gap-3 transition-all hover:bg-white/5",
                  isMenuOpen ? "bg-white/10 border-white/20 shadow-lg" : "bg-black/20"
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
                      <button onClick={() => { setModalConfig({ isOpen: true, title: 'Nieuwe Show', message: 'Voer de naam in voor de nieuwe show:', type: 'prompt', defaultValue: 'Mijn LedShow', onConfirm: (name) => { if (name) createNewShow(name); setModalConfig(p => ({ ...p, isOpen: false })); } }); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold"><Plus className="w-3.5 h-3.5 text-primary" /> Nieuwe Show Maken</button>

                      <div className="relative group/submenu">
                        <button className="w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-white/10 rounded-lg transition-colors font-bold">
                          <div className="flex items-center gap-3"><Layers className="w-3.5 h-3.5 text-blue-400" /> Show Laden</div>
                          <ChevronRight className="w-3 h-3 opacity-40 group-hover/submenu:translate-x-1 transition-transform" />
                        </button>
                        <div className="absolute right-full top-0 mr-1 w-64 bg-[#0a0a0a] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 hidden group-hover/submenu:block animate-in fade-in slide-in-from-right-2 duration-200">
                          {availableShows.length === 0 ? (<div className="px-4 py-2 text-[10px] text-muted-foreground italic text-left">Geen shows gevonden</div>) : availableShows.map((show) => (<button key={show.id} onClick={async () => { await setActiveShow(show); setIsMenuOpen(false); }} className={cn("w-full px-4 py-2 text-left text-[10px] hover:bg-white/10 transition-colors truncate text-left", activeShow?.id === show.id && "text-primary font-bold bg-primary/5")}>{show.name || 'Naamloze Show'}</button>))}
                        </div>
                      </div>

                      {activeShow && (
                        <>
                          <div className="h-px bg-white/10 my-1" />
                          <button onClick={() => { if (!activeShow) return; setModalConfig({ isOpen: true, title: 'Show Verwijderen', message: `Weet je zeker dat je show "${activeShow.name}" wilt verwijderen (archiveren)?`, type: 'confirm', defaultValue: '', onConfirm: () => { archiveShow(activeShow.id); setModalConfig(prev => ({ ...prev, isOpen: false })); setIsMenuOpen(false); } }); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors text-red-500 opacity-60 hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /> Show Verwijderen</button>
                          <div className="h-px bg-white/10 my-1" />
                          <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-left"><Settings className="w-3.5 h-3.5 text-primary" /> Show Instellingen</button>
                          <div className="h-px bg-white/10 my-1" />
                          <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <Clock className={cn("w-3.5 h-3.5", isTimeTracking ? "text-primary" : "text-muted-foreground/40", isTimeTracking && "animate-pulse")} />
                              <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timing Bijhouden</span><span className="text-[8px] opacity-40 uppercase font-bold">{isTimeTracking ? 'Actief' : 'Uitgeschakeld'}</span></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleTimeTracking(); }} className={cn("w-10 h-5 rounded-full relative transition-all duration-500 p-1 border border-white/10", isTimeTracking ? "bg-primary/20 shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.1)]" : "bg-white/5 shadow-inner")}><div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg", isTimeTracking ? "ml-auto bg-primary shadow-[0_0_8px_#f97316]" : "mr-auto bg-white/20")} /></button>
                          </div>
                          <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/5">
                            <div className="flex items-center gap-3 text-left">
                              <FileText className={cn("w-3.5 h-3.5", autoFollowScript ? "text-primary" : "text-muted-foreground/40")} />
                              <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volg Script</span><span className="text-[8px] opacity-40 uppercase font-bold text-left">{autoFollowScript ? 'Automatisch' : 'Handmatig'}</span></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleAutoFollowScript(); }} className={cn("w-10 h-5 rounded-full relative transition-all duration-500 p-1 border border-white/10", autoFollowScript ? "bg-primary/20 shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.1)]" : "bg-white/5 shadow-inner")}><div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg", autoFollowScript ? "ml-auto bg-primary shadow-[0_0_8px_#f97316]" : "mr-auto bg-white/20")} /></button>
                          </div>
                        </>
                      )}
                      <div className="h-px bg-white/10 my-1" />
                      <button onClick={() => { setIsAppSettingsOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold opacity-60 hover:opacity-100 text-left"><Settings2 className="w-3.5 h-3.5" /> App Instellingen</button>
                      {isDeveloperMode && (<button onClick={() => { setIsDbManagerOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/10 rounded-lg transition-colors font-bold text-yellow-500/80 text-left"><Monitor className="w-3.5 h-3.5" /> Database Beheer</button>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isHost && (
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title={isFullscreen ? 'Minimize' : 'Maximize'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      < main className="flex-1 flex overflow-hidden relative" >
        {!activeShow && (
          <div className="absolute inset-0 z-[60] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
              <Layers className="w-10 h-10 text-primary opacity-40" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Geen Show Geladen</h2>
              <p className="text-sm text-muted-foreground max-w-xs">Kies een bestaande show of maak een nieuwe aan om te beginnen.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {/* Recent shows list */}
              {availableShows.length > 0 && (
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
              {availableShows.length > 0 && (
                <div className="flex items-center gap-3 px-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">of</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              <button
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'Nieuwe Show',
                    message: 'Voer de naam in voor de nieuwe show:',
                    type: 'prompt',
                    defaultValue: 'Mijn LedShow',
                    onConfirm: (name) => {
                      if (name) createNewShow(name)
                      setModalConfig(p => ({ ...p, isOpen: false }))
                    }
                  })
                }}
                className="w-full py-3 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-3"
              >
                <Plus className="w-4 h-4" /> Nieuwe Show
              </button>
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
                <h3 className="text-xl font-bold text-white mb-2">Show in Onderhoud</h3>
                <p className="text-sm text-white/40 max-w-xs">
                  De hoofdcomputer is de show momenteel aan het aanpassen.<br />
                  Zodra deze weer wordt vergrendeld, zie je hier de actuele planning.
                </p>
              </div>
            )}
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Sequence</span>
              <div className="flex items-center gap-2 text-[10px] font-mono opacity-40">
                {activeEventIndex + 1} / {events.length}
              </div>
            </div>
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

          {/* Right: PDF Viewer (Resizable) */}
          <section
            // eslint-disable-next-line react/no-unknown-property
            style={{ '--sidebar-width': `${activeShow?.sidebarWidth || 600}px` } as React.CSSProperties}
            className="sidebar-resizable flex flex-col bg-black/40 shrink-0"
          >
            <div className="flex flex-col flex-1">
              {/* Camera Viewing Boxes */}
              {selectedCameraClients.length > 0 && (
                <>
                  <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Webcam Streams</span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/10 shrink-0 h-48 overflow-hidden">
                    {[0, 1].map((idx) => {
                      const clientId = selectedCameraClients[idx]
                      const frame = clientId ? activeCameraStreams[clientId] : null
                      const remoteIdx = connectedClients.findIndex(c => c === clientId)
                      const label = remoteIdx === 0 ? 'Host' : remoteIdx > 0 ? `Workstation ${remoteIdx + 1}` : `Client ${idx + 1}`
                      return (
                        <div key={idx} className="relative bg-black flex items-center justify-center overflow-hidden h-full group border-r border-white/5">
                          {clientId && frame ? (
                            <>
                              <img src={frame} className="w-full h-full object-cover" alt={`Camera ${idx + 1}`} />
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white/60 border border-white/10 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                {label}
                              </div>
                            </>
                          ) : clientId && !frame ? (
                            // Client selected but camera is off / no frame yet
                            <div className="flex flex-col items-center gap-2 text-white/30">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <line x1="2" y1="2" x2="22" y2="22" />
                                <path d="M10.68 10.68a2 2 0 0 0 2.64 2.64" />
                                <path d="M14 14H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3.5-2H21a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
                                <path d="M16 8l4-4" />
                              </svg>
                              <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label} — Camera Uit</span>
                            </div>
                          ) : (
                            // Empty slot
                            <div className="flex flex-col items-center gap-2 opacity-10">
                              <Camera className="w-8 h-8" />
                              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Kijkvenster {idx + 1}</span>
                            </div>
                          )}
                          {clientId && (
                            <button
                              onClick={() => toggleCameraSelection(clientId)}
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
                <PdfViewer
                  pdfUrl={activeShow?.pdfPath || ''}
                  pageNumber={currentScriptPage}
                  invertScriptColors={activeShow?.invertScriptColors}
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                  <div className="w-32 aspect-video glass rounded border border-white/10 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center z-10 transition-opacity">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/60 text-center px-2">Remote Wall 1<br />Preview Coming Soon</span>
                    </div>
                    <Monitor className="w-4 h-4 opacity-10" />
                  </div>
                </div>
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

              {/* HUB */}
              <div className="flex flex-col items-center gap-2" title="Hub Status">
                <span className="text-[7px] font-black opacity-40 uppercase tracking-tight">HUB</span>
                <div className={cn("w-2 h-2 rounded-full", socketConnected ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500 animate-pulse")} />
              </div>

              {/* LIGHTS */}
              <div className="flex flex-col items-center gap-2" title="Lights Status">
                <span className="text-[7px] font-black opacity-40 uppercase tracking-tight">LTS</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
              </div>

              {/* MEDIA */}
              <div className="flex flex-col items-center gap-2" title="Media Status">
                <span className="text-[7px] font-black opacity-40 uppercase tracking-tight">MDA</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
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
                    <span>Devices ({activeShow?.devices?.filter(d => d.type === 'wled' || d.type === 'wiz').length || 0})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 px-1">
                    {activeShow?.devices?.filter(d => d.type === 'wled' || d.type === 'wiz').map(device => (
                      <div key={device.id} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-white/5 border border-white/5 transition-all hover:bg-white/10">
                        <span className="opacity-80 truncate max-w-[120px]">{device.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] opacity-40">{device.type}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                        </div>
                      </div>
                    ))}
                    {(!activeShow?.devices || activeShow.devices.filter(d => d.type === 'wled' || d.type === 'wiz').length === 0) && (
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
                  {activeShow?.devices?.filter(d => d.type === 'local_monitor' || d.type === 'remote_ledwall').map(device => (
                    <div key={device.id} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-white/5 border border-white/5 font-mono transition-all hover:bg-white/10">
                      <span className="opacity-80 truncate max-w-[120px]">{device.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] opacity-40">{device.type}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                      </div>
                    </div>
                  ))}
                  {(!activeShow?.devices || activeShow.devices.filter(d => d.type === 'local_monitor' || d.type === 'remote_ledwall').length === 0) && (
                    <div className="text-[10px] opacity-20 italic px-2 font-mono">LOCAL DISPLAY OK</div>
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
                    <button
                      onClick={() => {
                        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                          setShowCameraHelp(true)
                        } else {
                          setCameraActive(!isCameraActive)
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
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {/* Show Host First (usually index 0) */}
                    {connectedClients.length > 0 && (() => {
                      const myId = networkService.getSocketId()
                      return connectedClients.map((clientId) => {
                        const idx = connectedClients.findIndex(c => c === clientId)
                        const isSelf = clientId === myId
                        const isHostClient = idx === 0
                        const isSelected = selectedCameraClients.includes(clientId)

                        return (
                          <div key={clientId} className={cn(
                            "flex items-center justify-between text-[10px] p-2 rounded-lg border transition-all",
                            isSelf ? "bg-primary/5 border-primary/20" : "bg-white/2 border-white/5 hover:bg-white/5"
                          )}>
                            <div className="flex items-center gap-2">
                              <Monitor className={cn("w-3 h-3", isHostClient ? "text-yellow-500/60" : "text-purple-400/60")} />
                              <div className="flex flex-col">
                                <span className="font-mono">
                                  {isHostClient ? 'Host Controller' : `Workstation ${idx + 1}`}
                                  {isSelf && <span className="text-[8px] text-primary ml-1.5 opacity-60">(Jij)</span>}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isSelf && (
                                <button
                                  onClick={() => toggleCameraSelection(clientId)}
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
                        {Object.entries(activeCameraStreams).map(([clientId, frame]) => {
                          const idx = connectedClients.findIndex(c => c === clientId)
                          const label = idx === 0 ? 'Host' : idx > 0 ? `Workstation ${idx + 1}` : clientId.slice(0, 8)
                          return (
                            <div key={clientId} className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
                              <img src={frame} className="w-full object-cover" alt={label} style={{ aspectRatio: '4/3' }} />
                              <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                                {label}
                              </div>
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
      {isDeveloperMode && isHost && Object.keys(activeCameraStreams).length > 0 && (
        <div className="fixed bottom-28 left-8 z-[9999] bg-black/80 text-green-400 p-2 rounded-lg border border-green-500/30 text-[10px] font-mono pointer-events-none">
          <div className="font-bold border-b border-green-500/30 mb-1">CAMERA DEBUG</div>
          {Object.entries(activeCameraStreams).map(([cid, frame]) => (
            <div key={cid}>
              {cid.slice(0, 8)}: Received {(frame.length / 1024).toFixed(1)} KB
            </div>
          ))}
        </div>
      )}

      {/* Bottom Control Bar */}
      <footer className="h-24 glass-header border-t border-white/10 shrink-0 flex items-center justify-between px-8 bg-black/60 z-[100]" >
        <div className="flex-1 flex items-center gap-6">
          {/* Layout placeholder for balance */}
        </div>

        <div className="flex-[2] flex items-center justify-center gap-6">
          <button
            onClick={() => {
              if (!isTimeTracking && activeEventIndex === -1) {
                setModalConfig({
                  isOpen: true,
                  title: 'Timing Starten?',
                  message: 'Wil je de timing bijhouden voor deze show? Dit wordt opgeslagen in de database.',
                  type: 'confirm',
                  defaultValue: '',
                  onConfirm: () => {
                    toggleTimeTracking();
                    setActiveEvent(0);
                    setModalConfig(p => ({ ...p, isOpen: false }));
                  },
                  onCancel: () => {
                    // Start show WITHOUT tracking timings
                    setActiveEvent(0);
                    setModalConfig(p => ({ ...p, isOpen: false }));
                  }
                } as any);
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
            <div className="h-14 min-w-[140px] px-4 rounded-xl glass border-white/10 flex flex-col items-center justify-center gap-0.5 bg-black/20">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 text-center leading-tight">Tijd tot volgend<br />event/scene</span>
              <span className={cn(
                "text-lg font-mono font-black tabular-nums tracking-tighter leading-none",
                (() => {
                  const activeEvent = events[activeEventIndex]
                  const titleRow = events.find(e => e.act === activeEvent.act && e.sceneId === activeEvent.sceneId && e.eventId === activeEvent.eventId && e.type === 'Title')
                  const dur = titleRow?.duration || 0
                  if (dur === 0) return "text-white/40"
                  const elapsed = Math.round((Date.now() - (lastTransitionTime || Date.now())) / 1000)
                  const remaining = Math.max(0, dur - elapsed)
                  return remaining === 0 ? "text-red-500 animate-pulse" : "text-orange-400"
                })()
              )}>
                {(() => {
                  const activeEvent = events[activeEventIndex]
                  const titleRow = events.find(e => e.act === activeEvent.act && e.sceneId === activeEvent.sceneId && e.eventId === activeEvent.eventId && e.type === 'Title')
                  const dur = titleRow?.duration || 0
                  if (dur === 0) return "--:--"
                  const elapsed = Math.round((Date.now() - (lastTransitionTime || Date.now())) / 1000)
                  return formatTime(Math.max(0, dur - elapsed))
                })()}
              </span>
            </div>
          )}

          <div className="flex gap-3">
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
              <SkipForward className={cn("w-5 h-5", (blinkingNextEvent || navigationWarning === 'event') ? "text-white" : "text-primary")} />
              <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextEvent || navigationWarning === 'event') ? "text-white" : "text-muted-foreground")}>
                {navigationWarning === 'event' ? 'Override?' : 'Next Event'}
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
              <Layers className={cn("w-5 h-5", (blinkingNextScene || navigationWarning === 'scene') ? "text-white" : "text-blue-400")} />
              <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextScene || navigationWarning === 'scene') ? "text-white" : "text-muted-foreground")}>
                {navigationWarning === 'scene' ? 'Override?' : 'Next Scene'}
              </span>
            </button>
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
              <SkipForward className={cn("w-5 h-5 rotate-90", (blinkingNextAct || navigationWarning === 'act') ? "text-white" : "text-orange-400")} />
              <span className={cn("text-xs font-black uppercase tracking-widest", (blinkingNextAct || navigationWarning === 'act') ? "text-white" : "text-muted-foreground")}>
                {navigationWarning === 'act' ? 'Override?' : 'Next Act'}
              </span>
            </button>
          </div>

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
        </div>

        <div className="flex-1 flex flex-col items-end justify-center gap-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
          <span
            className={cn("cursor-default select-none transition-colors", isDeveloperMode && "text-yellow-500/60")}
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
            V0.1.0{isDeveloperMode ? ' 🛠' : ''}
          </span>
          <span>{serverIp}:5173</span>
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

      <CameraStreamer />


      <SimpleModal
        isOpen={showCameraHelp}
        title="Webcam Beveiliging"
        message={`Om je camera te kunnen gebruiken op deze remote laptop, moet de browser toestemming geven voor onbeveiligde verbindingen.\n\nInstructies:\n1. Open een nieuw tabblad en ga naar:\nchrome://flags/#unsafely-treat-insecure-origin-as-secure\n\n2. Vul bij \'Unsafely treat insecure origin as secure\' dit adres in:\nhttp://${window.location.hostname}:5173\n\n3. Zet de optie op \'Enabled\' en herstart de browser.`}
        type="confirm"
        onConfirm={() => setShowCameraHelp(false)}
        onCancel={() => setShowCameraHelp(false)}
      />

      <SimpleModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        defaultValue={modalConfig.defaultValue}
        onConfirm={modalConfig.onConfirm}
        onCancel={(modalConfig as any).onCancel || (() => setModalConfig({ ...modalConfig, isOpen: false }))}
      />
    </div>
  )
}
