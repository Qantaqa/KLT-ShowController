import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FolderOpen,
  AlertCircle,
  Radar,
  Trash2,
  X,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sun,
  Repeat,
  Monitor,
  Lightbulb,
  Settings2,
  Save,
  ExternalLink
} from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import type { LocalMonitorDevice, Device, WLEDDevice } from '../types/devices'
import {
  cn,
  modalBtnIconClass,
  modalBtnPrimary,
  modalBtnSecondary,
  modalHeaderCloseBtn
} from '../lib/utils'
import { getMediaUrl } from '../services/media-player-service'
import LightConfigurator from './LightConfigurator'
import LightFixtureStripPreview from './LightFixtureStripPreview'
import VideoWallPreviewOverlay from './VideoWallPreviewOverlay'

export interface SequenceRowEditModalProps {
  rowIndex: number | null
  onClose: () => void
}

function EventLocationHeaderBar({
  showLabel,
  event,
  eventGroupCounts
}: {
  showLabel: string
  event: ShowEvent
  eventGroupCounts: { light: number; media: number }
}) {
  return (
    <div className="-mx-5 flex min-w-0 items-center justify-between gap-4 border-b border-white/10 bg-[#16161c] px-5 py-3">
      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
        <span className="text-white">{showLabel}</span>
        <span className="mx-1.5 font-normal text-white/40">—</span>
        <span className="text-white/85">{event.act}</span>
        <span className="mx-1.5 font-normal text-white/40">—</span>
        <span className="text-white/80">Scene {event.sceneId}</span>
        <span className="mx-1.5 font-normal text-white/40">—</span>
        <span className="text-white/80">Event {event.eventId}</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#14141a] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75"
          title="Aantal media in dit event"
        >
          <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
          {eventGroupCounts.media}
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#14141a] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75"
          title="Aantal lichtregels in dit event"
        >
          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
          {eventGroupCounts.light}
        </div>
      </div>
    </div>
  )
}

/** Licht bewerken: kopbalk + grid (apparaat / WiZ of WLED | stop). */
const LightEditModalSection: React.FC<{ rowIndex: number }> = ({ rowIndex }) => {
  const events = useSequencerStore(s => s.events)
  const activeShow = useSequencerStore(s => s.activeShow)
  const updateEvent = useSequencerStore(s => s.updateEvent)
  const appSettings = useSequencerStore(s => s.appSettings)
  const event = events[rowIndex]

  const showLabel = activeShow?.name?.trim() || 'Script / show'
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5'
  const panelCls = 'rounded-xl border border-white/12 bg-[#18181f] p-4'
  const inputCls =
    'w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/45'

  const eventGroupCounts = useMemo(() => {
    if (!event) return { light: 0, media: 0 }
    let light = 0
    let media = 0
    for (const e of events) {
      if (e.act !== event.act) continue
      if ((e.sceneId ?? 0) !== (event.sceneId ?? 0)) continue
      if ((e.eventId ?? 0) !== (event.eventId ?? 0)) continue
      const t = (e.type || '').toLowerCase()
      if (t === 'light') light++
      if (t === 'media') media++
    }
    return { light, media }
  }, [events, event])

  if (!event || event.type?.toLowerCase() !== 'light') return null

  return (
    <div className="flex flex-col gap-5">
      <EventLocationHeaderBar showLabel={showLabel} event={event} eventGroupCounts={eventGroupCounts} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4 min-w-0">
          <LightConfigurator
            event={event}
            updateEvent={partial => updateEvent(rowIndex, partial)}
            devices={appSettings.devices || []}
            wideLayout
          />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <div className={panelCls}>
            <h3 className={labelCls}>Stop na event</h3>
            <p className="text-[11px] text-white/45 mb-2">Licht kan naar behoefte uit na een later titel-event.</p>
            <select
              title="Stop na"
              className={inputCls}
              value={(() => {
                const stopAct = (event.stopAct || '').trim()
                const stopScene = Number.parseInt(String(event.stopSceneId ?? ''), 10)
                const stopEvent = Number.parseInt(String(event.stopEventId ?? ''), 10)
                return stopAct &&
                  Number.isFinite(stopScene) &&
                  stopScene >= 0 &&
                  Number.isFinite(stopEvent) &&
                  stopEvent > 0
                  ? `${stopAct}|${stopScene}|${stopEvent}`
                  : ''
              })()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const val = e.target.value
                if (!val) {
                  updateEvent(rowIndex, {
                    stopAct: undefined,
                    stopSceneId: undefined,
                    stopEventId: undefined
                  } as any)
                } else {
                  const [act, sId, eId] = val.split('|')
                  const parsedSceneId = Number.parseInt(sId, 10)
                  const parsedEventId = Number.parseInt(eId, 10)
                  updateEvent(rowIndex, {
                    stopAct: act?.trim() || undefined,
                    stopSceneId: Number.isFinite(parsedSceneId) ? parsedSceneId : undefined,
                    stopEventId: Number.isFinite(parsedEventId) ? parsedEventId : undefined
                  })
                }
              }}
            >
              <option value="">— Geen stop moment —</option>
              {events
                .filter((e: ShowEvent, idx: number) => e.type?.toLowerCase() === 'title' && idx > rowIndex)
                .map((titleEvt: ShowEvent, idx: number) => (
                  <option key={idx} value={`${titleEvt.act}|${titleEvt.sceneId}|${titleEvt.eventId}`}>
                    {titleEvt.act}.{titleEvt.sceneId}.{titleEvt.eventId}{' '}
                    {titleEvt.cue ? `(${titleEvt.cue})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Uitgebreide media-editor: preview, uitvoer-bediening, locatie, event-tags, maskers, stop-event. */
const MediaEditModalSection: React.FC<{ rowIndex: number }> = ({ rowIndex }) => {
  const events = useSequencerStore(s => s.events)
  const event = events[rowIndex]
  const appSettings = useSequencerStore(s => s.appSettings)
  const activeShow = useSequencerStore(s => s.activeShow)
  const updateEvent = useSequencerStore(s => s.updateEvent)
  const addToast = useSequencerStore(s => s.addToast)
  const playingMedia = useSequencerStore(s => s.playingMedia)
  const activeEventIndex = useSequencerStore(s => s.activeEventIndex)
  const activeTransfers = useSequencerStore(s => s.activeTransfers)
  const restartMedia = useSequencerStore(s => s.restartMedia)
  const pauseMedia = useSequencerStore(s => s.pauseMedia)
  const stopMedia = useSequencerStore(s => s.stopMedia)
  const toggleAudio = useSequencerStore(s => s.toggleAudio)
  const setMediaVolume = useSequencerStore(s => s.setMediaVolume)
  const setMediaBrightness = useSequencerStore(s => s.setMediaBrightness)
  const toggleRepeat = useSequencerStore(s => s.toggleRepeat)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoTimes, setVideoTimes] = useState({ current: 0, total: 0 })

  const devices = appSettings.devices || []
  const serverIp = appSettings.serverIp || window.location.hostname
  const filePort = (appSettings.serverPort || 3001) + 1
  const getMediaUrlWithContext = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http') || path.startsWith('ledshow-file')) return path
    return `http://${serverIp}:${filePort}/media?path=${encodeURIComponent(path)}`
  }

  const previewShouldLoop = event?.effect === 'repeat'
  const isRowActive = rowIndex === activeEventIndex

  const isActuallyPlaying = useMemo(() => {
    if (!event || event.type?.toLowerCase() !== 'media' || !event.filename) return false
    if (isRowActive) return true
    const entries = Object.entries(playingMedia)
    if (event.fixture) {
      const device = devices.find(d => d.name === event.fixture)
      if (device && playingMedia[device.id]?.filename === event.filename) return true
    } else {
      if (entries.some(([, data]) => data.filename === event.filename)) return true
    }
    return false
  }, [event, isRowActive, playingMedia, devices])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !event?.filename) return
    el.loop = !!previewShouldLoop
    if (isActuallyPlaying) {
      el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [previewShouldLoop, isActuallyPlaying, event?.filename])

  const usedFixtures = useMemo(() => {
    if (!event) return new Set<string>()
    const s = new Set<string>()
    for (const e of events) {
      if (e.act === event.act && e.sceneId === event.sceneId && e.eventId === event.eventId) {
        if (e.type?.toLowerCase() === 'media' && e.fixture) s.add(e.fixture)
      }
    }
    return s
  }, [events, event])

  const eventGroupCounts = useMemo(() => {
    if (!event) return { light: 0, media: 0 }
    let light = 0
    let media = 0
    for (const e of events) {
      if (e.act !== event.act) continue
      if ((e.sceneId ?? 0) !== (event.sceneId ?? 0)) continue
      if ((e.eventId ?? 0) !== (event.eventId ?? 0)) continue
      const t = (e.type || '').toLowerCase()
      if (t === 'light') light++
      if (t === 'media') media++
    }
    return { light, media }
  }, [events, event])

  const showLabel = activeShow?.name?.trim() || 'Script / show'

  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5'
  const panelCls = 'rounded-xl border border-white/12 bg-[#18181f] p-4'
  const inputCls =
    'w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/45'

  if (!event || event.type?.toLowerCase() !== 'media') return null

  const targetDev = event.fixture ? devices.find(d => d.name === event.fixture) : null
  const isVideoWall =
    targetDev?.type === 'videowall_agent' ||
    targetDev?.type === 'remote_VideoWall' ||
    targetDev?.type === 'local_monitor'

  const filteredScreens = devices.filter(
    (d: Device) =>
      (d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent') &&
      (!usedFixtures.has(d.name) || d.name === event.fixture)
  )

  const isPortrait =
    event.fixture &&
    devices.find(d => d.name === event.fixture)?.type === 'videowall_agent' &&
    (devices.find(d => d.name === event.fixture) as any)?.orientation === 'portrait'

  return (
    <div className="flex flex-col gap-5">
      <EventLocationHeaderBar showLabel={showLabel} event={event} eventGroupCounts={eventGroupCounts} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4 min-w-0">
          <div className={panelCls}>
            <h3 className={labelCls}>Scherm & bestand</h3>
            <div className="flex flex-wrap gap-2">
              {filteredScreens.length === 0 ? (
                <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Geen schermen beschikbaar
                </div>
              ) : (
                <select
                  title="Doelscherm"
                  className={cn(inputCls, 'flex-1 min-w-[200px]')}
                  value={event.fixture || ''}
                  onChange={e => updateEvent(rowIndex, { fixture: e.target.value })}
                >
                  <option value="">Kies scherm…</option>
                  {filteredScreens.map((d: Device) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className={cn(
                  modalBtnSecondary(),
                  'max-w-[min(280px,55vw)] shrink-0 px-3 py-2 text-[10px] !normal-case font-semibold tracking-normal'
                )}
                onClick={async () => {
                  if ((window as any).require) {
                    const { ipcRenderer } = (window as any).require('electron')
                    const result = await ipcRenderer.invoke('select-file', {
                      filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi'] }]
                    })
                    if (!result.canceled && result.filePaths.length > 0) {
                      updateEvent(rowIndex, { filename: result.filePaths[0] })
                    }
                  }
                }}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                {event.filename ? event.filename.split(/[\\/]/).pop() : 'Kies video…'}
              </button>
            </div>
          </div>

          {targetDev?.type === 'local_monitor' && (
            <div className={panelCls}>
              <h3 className={labelCls}>Projectiemaskers (local monitor)</h3>
              <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
                Teken en bewerk maskers in het aparte maskervenster. Vereist een gekozen videobron.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!event.filename}
                  title={!event.filename ? 'Kies eerst een videobron' : 'Maskers bewerken'}
                  onClick={async () => {
                    if (!event.filename) {
                      addToast('Kies eerst een videobron.', 'warning')
                      return
                    }
                    if (!activeShow?.id || !(window as any).require) return
                    const { ipcRenderer } = (window as any).require('electron')
                    const d = targetDev as LocalMonitorDevice
                    try {
                      await ipcRenderer.invoke('projection-start-mask-edit', {
                        showId: activeShow.id,
                        eventIndex: rowIndex,
                        deviceId: d.id,
                        monitorIndex: d.monitorId !== undefined ? d.monitorId : 1,
                        videoUrl: getMediaUrl(event.filename!),
                        initialMasks: event.projectionMasks || []
                      })
                    } catch (e) {
                      console.error(e)
                      addToast('Kon masker-editor niet openen.', 'error')
                    }
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-colors flex items-center gap-2',
                    event.filename
                      ? 'bg-primary/20 border-primary/45 hover:bg-primary/28 text-white'
                      : 'opacity-45 cursor-not-allowed border-white/10 text-white/50'
                  )}
                >
                  <Radar className="w-3.5 h-3.5 shrink-0" />
                  Masker bewerken
                </button>
                {(event.projectionMasks?.length ?? 0) > 0 && (
                  <>
                    <span className="text-[11px] text-primary/85">
                      {event.projectionMasks!.length} vlak{event.projectionMasks!.length === 1 ? '' : 'ken'}
                    </span>
                    <button
                      type="button"
                      title="Alle maskers verwijderen"
                      onClick={() => updateEvent(rowIndex, { projectionMasks: [] })}
                      className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase border bg-red-500/15 border-red-500/35 hover:bg-red-500/25 text-red-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3 shrink-0" />
                      Wissen
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className={panelCls}>
            <h3 className={labelCls}>Stop na event</h3>
            <p className="text-[11px] text-white/45 mb-2">Media kan automatisch stoppen als een later event wordt bereikt.</p>
            <select
              title="Stop na"
              className={inputCls}
              value={(() => {
                const stopAct = (event.stopAct || '').trim()
                const stopScene = Number.parseInt(String(event.stopSceneId ?? ''), 10)
                const stopEvent = Number.parseInt(String(event.stopEventId ?? ''), 10)
                return stopAct &&
                  Number.isFinite(stopScene) &&
                  stopScene >= 0 &&
                  Number.isFinite(stopEvent) &&
                  stopEvent > 0
                  ? `${stopAct}|${stopScene}|${stopEvent}`
                  : ''
              })()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const val = e.target.value
                if (!val) {
                  updateEvent(rowIndex, {
                    stopAct: undefined,
                    stopSceneId: undefined,
                    stopEventId: undefined
                  } as any)
                } else {
                  const [act, sId, eId] = val.split('|')
                  const parsedSceneId = Number.parseInt(sId, 10)
                  const parsedEventId = Number.parseInt(eId, 10)
                  updateEvent(rowIndex, {
                    stopAct: act?.trim() || undefined,
                    stopSceneId: Number.isFinite(parsedSceneId) ? parsedSceneId : undefined,
                    stopEventId: Number.isFinite(parsedEventId) ? parsedEventId : undefined
                  })
                }
              }}
            >
              <option value="">— Geen gekoppeld stop-moment —</option>
              {events
                .filter((e: ShowEvent, idx: number) => e.type?.toLowerCase() === 'title' && idx > rowIndex)
                .map((titleEvt: ShowEvent, idx: number) => (
                  <option key={idx} value={`${titleEvt.act}|${titleEvt.sceneId}|${titleEvt.eventId}`}>
                    {titleEvt.act}.{titleEvt.sceneId}.{titleEvt.eventId}{' '}
                    {titleEvt.cue ? `(${titleEvt.cue})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div className={panelCls}>
            <h3 className={labelCls}>Preview</h3>
            {!event.filename ? (
              <div className="aspect-video rounded-lg border border-dashed border-white/15 bg-black/30 flex items-center justify-center text-[11px] text-white/40">
                Geen videobron geselecteerd
              </div>
            ) : (
              <div
                className={cn(
                  'group/media-preview relative rounded-lg border border-white/12 overflow-hidden bg-black mx-auto max-w-full',
                  isPortrait ? 'aspect-[9/16] max-h-[320px]' : 'aspect-video max-h-[280px]'
                )}
              >
                <div
                  className={cn('absolute', isPortrait ? 'top-1/2 left-1/2' : 'inset-0')}
                  style={
                    isPortrait
                      ? { width: '177.77%', height: '56.25%', transform: 'translate(-50%, -50%) rotate(-90deg)' }
                      : {}
                  }
                >
                  <video
                    ref={videoRef}
                    src={getMediaUrlWithContext(event.filename)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onTimeUpdate={e => {
                      const v = e.currentTarget
                      if (v.duration) {
                        const progress = (v.currentTime / v.duration) * 100
                        const bar = v.closest('.group\\/media-preview')?.querySelector('.video-progress-bar') as HTMLElement
                        if (bar) bar.style.width = `${progress}%`
                        setVideoTimes({ current: Math.floor(v.currentTime), total: Math.floor(v.duration) })
                      }
                    }}
                    onLoadedMetadata={e => {
                      const v = e.currentTarget
                      setVideoTimes({ current: 0, total: Math.floor(v.duration) })
                    }}
                  />
                </div>
                {event.fixture && devices.find(d => d.name === event.fixture)?.type === 'videowall_agent' && (
                  <VideoWallPreviewOverlay
                    layout={(devices.find(d => d.name === event.fixture) as any)?.layout || '1x1'}
                    bezelSize={(devices.find(d => d.name === event.fixture) as any)?.bezelSize}
                  />
                )}
                <div
                  className={cn(
                    'absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider',
                    isActuallyPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-black/70 text-white/55'
                  )}
                >
                  {isActuallyPlaying ? 'Live' : 'Preview'}
                </div>
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/65 text-[9px] font-mono rounded text-white/75 tabular-nums">
                  {Math.floor(videoTimes.current / 60)}:
                  {(videoTimes.current % 60).toString().padStart(2, '0')} / {Math.floor(videoTimes.total / 60)}:
                  {(videoTimes.total % 60).toString().padStart(2, '0')}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div className="video-progress-bar h-full bg-primary transition-[width] duration-300 ease-linear w-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cn(panelCls, 'w-full')}>
        <h3 className={labelCls}>Uitvoer-bediening</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => restartMedia(rowIndex)}
            className="p-2.5 bg-green-500 text-black rounded-full hover:bg-green-400 transition-colors shadow-[0_0_12px_rgba(34,197,94,0.25)]"
            title="Afspelen / herstart"
          >
            <Play className="w-4 h-4 fill-black" />
          </button>
          <button
            type="button"
            onClick={() => pauseMedia(rowIndex)}
            className="p-2.5 bg-white/12 hover:bg-amber-500/85 hover:text-white rounded-full transition-colors text-white/85"
            title="Pauze"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => stopMedia(rowIndex)}
            className="p-2.5 bg-white/12 hover:bg-red-500 hover:text-white rounded-full transition-colors text-white/85"
            title="Stop"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
          <div className="w-px h-8 bg-white/12 mx-0.5" />
          <button
            type="button"
            onClick={() => toggleAudio(rowIndex)}
            className={cn(
              'p-2 rounded-lg transition-colors border border-white/12',
              event.sound ? 'bg-white/10 text-white' : 'bg-red-500/18 text-red-300'
            )}
            title={event.sound ? 'Geluid aan' : 'Dempen'}
          >
            {!event.sound ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1 bg-[#13131a] rounded-lg border border-white/12 px-1 py-1">
            <button
              type="button"
              onClick={() =>
                setMediaVolume(rowIndex, Math.max(0, (event.intensity !== undefined ? event.intensity : 100) - 10))
              }
              className="px-2 py-1 rounded hover:bg-white/10 text-white/65 text-sm"
            >
              −
            </button>
            <span className="text-[11px] w-9 text-center tabular-nums font-mono text-white/70">
              {event.intensity !== undefined ? event.intensity : 100}%
            </span>
            <button
              type="button"
              onClick={() =>
                setMediaVolume(rowIndex, Math.min(100, (event.intensity !== undefined ? event.intensity : 100) + 10))
              }
              className="px-2 py-1 rounded hover:bg-white/10 text-white/65 text-sm"
            >
              +
            </button>
            <span className="text-[9px] uppercase text-white/35 pl-1 pr-1">Vol.</span>
          </div>

          {isVideoWall && (
            <>
              <div className="w-px h-8 bg-white/12 mx-0.5" />
              <div className="flex items-center gap-1 bg-[#13131a] rounded-lg border border-white/12 px-1 py-1">
                <Sun className="w-3.5 h-3.5 text-white/40 ml-1 shrink-0" />
                <button
                  type="button"
                  onClick={() =>
                    setMediaBrightness(
                      rowIndex,
                      Math.max(0, (event.brightness !== undefined ? event.brightness : 100) - 10)
                    )
                  }
                  className="px-2 py-1 rounded hover:bg-white/10 text-white/65 text-sm"
                >
                  −
                </button>
                <span className="text-[11px] w-9 text-center tabular-nums font-mono text-white/70">
                  {event.brightness !== undefined ? event.brightness : 100}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMediaBrightness(
                      rowIndex,
                      Math.min(200, (event.brightness !== undefined ? event.brightness : 100) + 10)
                    )
                  }
                  className="px-2 py-1 rounded hover:bg-white/10 text-white/65 text-sm"
                >
                  +
                </button>
                <span className="text-[9px] uppercase text-white/35 pl-1 pr-2">Held.</span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => toggleRepeat(rowIndex)}
            className={cn(
              'p-2 rounded-lg border border-white/12 transition-colors',
              event.effect === 'repeat' ? 'bg-green-500/20 text-green-400 border-green-500/35' : 'bg-white/8 text-white/45'
            )}
            title="Herhalen (loop)"
          >
            <Repeat className="w-4 h-4" />
          </button>

          {targetDev &&
            (() => {
              const transfer = Object.values(activeTransfers).find(t => t.deviceId === targetDev.id)
              if (!transfer) return null
              const statusLabel =
                transfer.status === 'checking'
                  ? '⏳'
                  : transfer.status === 'uploading'
                    ? `⬆ ${transfer.percent}%`
                    : transfer.status === 'complete'
                      ? '✅'
                      : transfer.status === 'skipped'
                        ? '✓'
                        : '❌'
              return (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-amber-500/12 border border-amber-500/25 rounded-lg text-[10px] font-bold text-amber-200">
                  {statusLabel}
                </div>
              )
            })()}
        </div>
        <p className="text-[10px] text-white/35 mt-2 flex items-center gap-1.5">
          <Monitor className="w-3 h-3 shrink-0 opacity-50" />
          Bediening stuurt naar het gekozen scherm (of alle schermen als geen target).
        </p>
      </div>
    </div>
  )
}

const SequenceRowEditModal: React.FC<SequenceRowEditModalProps> = ({ rowIndex, onClose }) => {
  const events = useSequencerStore(s => s.events)
  const updateEvent = useSequencerStore(s => s.updateEvent)
  const activeShow = useSequencerStore(s => s.activeShow)
  const appSettings = useSequencerStore(s => s.appSettings)
  const openAppSettings = useSequencerStore(s => s.openAppSettings)

  const event = rowIndex !== null && rowIndex >= 0 ? events[rowIndex] : null
  const type = event?.type?.toLowerCase() || ''

  const [editActionCue, setEditActionCue] = useState('')
  const [editActionCueMoment, setEditActionCueMoment] = useState('')
  const [editActionAssignee, setEditActionAssignee] = useState('')
  const [editActionPg, setEditActionPg] = useState('')
  const [editActionDuration, setEditActionDuration] = useState('')
  const [editMarkerXPct, setEditMarkerXPct] = useState('')
  const [editMarkerYPct, setEditMarkerYPct] = useState('')
  const [editTitleCue, setEditTitleCue] = useState('')
  const [editTitlePg, setEditTitlePg] = useState('')
  const [editComment, setEditComment] = useState('')

  useEffect(() => {
    if (rowIndex === null || rowIndex < 0 || !events[rowIndex]) return
    const ev = events[rowIndex]
    const t = ev.type?.toLowerCase() || ''
    if (t === 'action') {
      setEditActionCue(ev.cue || '')
      setEditActionCueMoment(ev.actionCueMoment || '')
      setEditActionAssignee(ev.actionAssignee || '')
      setEditActionPg(ev.scriptPg !== undefined && ev.scriptPg > 0 ? String(ev.scriptPg) : '')
      setEditActionDuration(ev.duration !== undefined && ev.duration > 0 ? String(ev.duration) : '')
      const mn = ev.scriptMarkerNorm
      if (mn && typeof mn.x === 'number' && typeof mn.y === 'number' && Number.isFinite(mn.x) && Number.isFinite(mn.y)) {
        setEditMarkerXPct(String(Math.round(mn.x * 100)))
        setEditMarkerYPct(String(Math.round(mn.y * 100)))
      } else {
        setEditMarkerXPct('')
        setEditMarkerYPct('')
      }
    }
    if (t === 'title') {
      setEditTitleCue(ev.cue || '')
      setEditTitlePg(ev.scriptPg !== undefined && ev.scriptPg > 0 ? String(ev.scriptPg) : '')
    }
    if (t === 'comment') setEditComment(ev.cue || '')
  }, [rowIndex, events])

  useEffect(() => {
    if (rowIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rowIndex, onClose])

  if (rowIndex === null || !event) return null

  const titleLabel = (() => {
    switch (type) {
      case 'comment':
        return 'Commentaar bewerken'
      case 'action':
        return 'Actie bewerken'
      case 'light':
        return 'Licht bewerken'
      case 'media':
        return 'Media bewerken'
      case 'title':
        return 'Titel bewerken'
      default:
        return 'Regel bewerken'
    }
  })()

  const showLabel = activeShow?.name?.trim() || 'Script / show'

  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1'
  const inputCls =
    'w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/45'

  const handleSave = () => {
    if (type === 'action') {
      const rawPg = editActionPg.trim()
      const nPg = rawPg === '' ? 0 : parseInt(rawPg, 10)
      const scriptPg = Number.isFinite(nPg) && nPg > 0 ? nPg : 0
      const rawDur = editActionDuration.trim()
      const nDur = rawDur === '' ? NaN : parseInt(rawDur, 10)
      const duration = Number.isFinite(nDur) && nDur > 0 ? nDur : undefined
      const xRaw = editMarkerXPct.trim()
      const yRaw = editMarkerYPct.trim()
      let scriptMarkerNorm: { x: number; y: number } | undefined
      if (xRaw !== '' && yRaw !== '') {
        const x = parseFloat(xRaw.replace(',', '.'))
        const y = parseFloat(yRaw.replace(',', '.'))
        if (Number.isFinite(x) && Number.isFinite(y)) {
          scriptMarkerNorm = {
            x: Math.min(1, Math.max(0, x / 100)),
            y: Math.min(1, Math.max(0, y / 100))
          }
        }
      } else {
        scriptMarkerNorm = undefined
      }
      updateEvent(rowIndex, {
        cue: editActionCue.trim(),
        actionCueMoment: editActionCueMoment.trim() || undefined,
        actionAssignee: editActionAssignee.trim() || undefined,
        scriptPg,
        duration,
        scriptMarkerNorm
      })
    } else if (type === 'title') {
      const raw = editTitlePg.trim()
      const n = raw === '' ? 0 : parseInt(raw, 10)
      updateEvent(rowIndex, {
        cue: editTitleCue.trim(),
        scriptPg: Number.isFinite(n) && n > 0 ? n : 0
      })
    } else if (type === 'comment') {
      updateEvent(rowIndex, { cue: editComment })
    }
    onClose()
  }

  const wide = type === 'media'

  const mediaFixtureDevice =
    type === 'media' && event.fixture
      ? (appSettings.devices || []).find(d => d.name === event.fixture)
      : undefined
  const canOpenScreenDeviceSettings =
    !!mediaFixtureDevice &&
    (mediaFixtureDevice.type === 'videowall_agent' || mediaFixtureDevice.type === 'local_monitor')

  const lightFixtureDevice =
    type === 'light' && event.fixture
      ? (appSettings.devices || []).find(d => d.name === event.fixture)
      : undefined
  const canOpenLightDeviceSettings =
    !!lightFixtureDevice && (lightFixtureDevice.type === 'wled' || lightFixtureDevice.type === 'wiz')

  const deviceForAppSettings = canOpenScreenDeviceSettings
    ? mediaFixtureDevice
    : canOpenLightDeviceSettings
      ? lightFixtureDevice
      : undefined

  const wledWebUiUrl =
    lightFixtureDevice?.type === 'wled'
      ? (() => {
          const raw = ((lightFixtureDevice as WLEDDevice).ip || '').trim()
          if (!raw) return null
          return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
        })()
      : null

  const body = (
    <div className="flex flex-col gap-3">
      {type === 'media' && rowIndex !== null && <MediaEditModalSection rowIndex={rowIndex} />}

      {type === 'light' && rowIndex !== null && <LightEditModalSection rowIndex={rowIndex} />}
    </div>
  )

  const showContextMeta = type === 'action' || type === 'title' || type === 'comment'

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          'w-full max-h-[90vh] min-h-0 flex flex-col rounded-xl border border-white/15 bg-[#1e1e24] shadow-2xl p-5',
          type === 'media' || type === 'light'
            ? 'max-w-5xl w-[min(1080px,calc(100vw-24px))]'
            :             wide
              ? 'max-w-2xl w-[min(720px,calc(100vw-32px))]'
              : type === 'action'
                ? 'max-w-lg w-[min(560px,calc(100vw-32px))]'
                : 'max-w-md'
        )}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {type === 'light' && <LightFixtureStripPreview event={event} compact />}
        <div className={cn('flex items-center justify-between shrink-0 gap-3', type === 'light' ? 'mt-3 mb-4' : 'mb-4')}>
          <h2 className="text-sm font-black uppercase tracking-wider text-primary">{titleLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className={modalHeaderCloseBtn()}
            title="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showContextMeta && (
          <p className="text-[11px] text-white/50 mb-4 leading-relaxed shrink-0">
            Onderdeel van <span className="font-semibold text-white/80">{event.act}</span>
            {' · '}
            Scene <span className="font-mono text-white/75">{event.sceneId}</span>, Event{' '}
            <span className="font-mono text-white/75">{event.eventId}</span>
            <br />
            <span className="text-white/45">Script / show:</span> <span className="text-white/70">{showLabel}</span>
          </p>
        )}

        <div
          className={cn(
            'flex flex-col gap-3 min-h-0 flex-1',
            type === 'media' || type === 'light' ? 'overflow-visible' : 'overflow-y-auto pr-1 max-h-[min(70vh,560px)]'
          )}
        >
          {type === 'comment' && (
            <>
              <label className={labelCls}>Commentaar</label>
              <textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                className={cn(inputCls, 'resize-y')}
                rows={6}
                placeholder="Commentaar..."
                autoFocus
              />
            </>
          )}

          {type === 'action' && (
            <>
              <label className={labelCls}>Cue-moment</label>
              <input
                value={editActionCueMoment}
                onChange={e => setEditActionCueMoment(e.target.value)}
                className={inputCls}
                placeholder="Bijv. na refrein, T+2 min…"
              />
              <label className={labelCls}>Omschrijving (cue)</label>
              <input
                value={editActionCue}
                onChange={e => setEditActionCue(e.target.value)}
                className={inputCls}
                placeholder="Wat moet er gebeuren?"
                autoFocus
              />
              <label className={labelCls}>Wie</label>
              <input
                value={editActionAssignee}
                onChange={e => setEditActionAssignee(e.target.value)}
                className={inputCls}
                placeholder="Naam of rol"
              />
              <label className={labelCls}>Scriptpagina (PDF)</label>
              <input
                type="number"
                min={1}
                value={editActionPg}
                onChange={e => setEditActionPg(e.target.value)}
                className={inputCls}
                placeholder="Geen koppeling"
              />
              <label className={labelCls}>Tijd (seconden)</label>
              <input
                type="number"
                min={1}
                value={editActionDuration}
                onChange={e => setEditActionDuration(e.target.value)}
                className={inputCls}
                placeholder="Optioneel tijdsbudget"
              />
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Marker op pagina (X / Y %)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editMarkerXPct}
                    onChange={e => setEditMarkerXPct(e.target.value)}
                    className={inputCls}
                    placeholder="X 0–100"
                    title="Horizontaal 0–100%"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editMarkerYPct}
                    onChange={e => setEditMarkerYPct(e.target.value)}
                    className={inputCls}
                    placeholder="Y 0–100"
                    title="Verticaal 0–100%"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditMarkerXPct('')
                      setEditMarkerYPct('')
                    }}
                    className={modalBtnSecondary('px-2 shrink-0 text-[10px]')}
                    title="PDF-marker verwijderen"
                  >
                    Wis marker
                  </button>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Vul beide percentages of laat beide leeg. Op de host: selecteer deze regel en klik op de
                  PDF om pagina + positie te zetten (alleen buiten show-modus).
                </p>
              </div>
            </>
          )}

          {type === 'title' && (
            <>
              <label className={labelCls}>Eventnaam</label>
              <input
                value={editTitleCue}
                onChange={e => setEditTitleCue(e.target.value)}
                className={inputCls}
                placeholder="Event naam…"
                autoFocus
              />
              <label className={labelCls}>Gekoppelde scriptpagina (PDF)</label>
              <input
                type="number"
                min={1}
                value={editTitlePg}
                onChange={e => setEditTitlePg(e.target.value)}
                className={inputCls}
                placeholder="Geen koppeling"
              />
            </>
          )}

          {body}
        </div>

        <div className="flex justify-between items-center gap-3 mt-4 pt-3 border-t border-white/15 shrink-0">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            {deviceForAppSettings && (
              <button
                type="button"
                onClick={() => {
                  openAppSettings({ tab: 'devices', deviceId: deviceForAppSettings.id })
                  onClose()
                }}
                className={modalBtnSecondary('px-3')}
                title="App-instellingen openen bij dit apparaat"
              >
                <Settings2 className={modalBtnIconClass} />
                Apparaatinstellingen
              </button>
            )}
            {type === 'light' && wledWebUiUrl && (window as Window & { require?: NodeRequire }).require && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { ipcRenderer } = (window as Window & { require: NodeRequire }).require('electron')
                    await ipcRenderer.invoke('shell:open-external', wledWebUiUrl)
                  } catch (e) {
                    console.error('Open WLED URL failed', e)
                  }
                }}
                className={modalBtnSecondary('px-3')}
                title={`WLED-webinterface openen: ${wledWebUiUrl}`}
              >
                <ExternalLink className={modalBtnIconClass} />
                WLED in browser
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className={modalBtnSecondary('px-3')}>
              <X className={modalBtnIconClass} />
              Annuleren
            </button>
            <button type="button" onClick={handleSave} className={modalBtnPrimary('px-4')}>
              <Save className="h-4 w-4 shrink-0 text-white" />
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SequenceRowEditModal
