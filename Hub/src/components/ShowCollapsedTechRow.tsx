import React, { useMemo } from 'react'
import { Send, Square, Pause, Play, Volume2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS } from '../lib/light-strip-preview'
import type { ShowEvent } from '../types/show'
import type { Device } from '../types/devices'
import LightFixtureStripPreview from './LightFixtureStripPreview'
import { useSequencerStore } from '../store/useSequencerStore'
import { ResumeMediaPlayer } from '../services/media-player-service'
import { RepeatToggleGlyph, SpeakerMutedGlyph } from '../lib/media-ui-glyphs'

export function isCollapsedShowProjectionMediaRow(event: ShowEvent, devices: Device[]): boolean {
    if ((event.type || '').toLowerCase() !== 'media') return false
    const d = event.fixture ? devices.find(x => x.name === event.fixture) : undefined
    const t = d?.type
    return t === 'videowall_agent' || t === 'local_monitor' || t === 'remote_VideoWall'
}

async function invokeLightFixtureBlack(fixture: string) {
    const w = window as any
    if (!w.require) return
    try {
        await w.require('electron').ipcRenderer.invoke('light:fixture-black', { fixture })
    } catch (e) {
        console.warn('light:fixture-black failed', e)
    }
}

const iconBtn =
    'h-6 w-6 shrink-0 inline-flex items-center justify-center rounded border border-white/15 bg-black/40 text-white/80 hover:bg-white/12 hover:text-white transition-colors'

/**
 * Show-modus + ingeklapt event: peek + optioneel actieknoppen (actief event).
 */
const ShowCollapsedTechRow: React.FC<{
    event: ShowEvent
    originalIndex: number
    gridDevices: Device[]
    /** WLED placeholder voor tweede cue / niet-live peek */
    wledPeekPlaceholder: boolean
    /** Lamp-preview aan (WLED/WiZ); media-strip staat los daarvan */
    lightStripPreviewOn: boolean
    showActions: boolean
}> = ({ event, originalIndex, gridDevices, wledPeekPlaceholder, lightStripPreviewOn, showActions }) => {
    const resendEvent = useSequencerStore(s => s.resendEvent)
    const pauseMedia = useSequencerStore(s => s.pauseMedia)
    const stopMedia = useSequencerStore(s => s.stopMedia)
    const restartMedia = useSequencerStore(s => s.restartMedia)
    const toggleRepeat = useSequencerStore(s => s.toggleRepeat)
    const toggleAudio = useSequencerStore(s => s.toggleAudio)
    const playingMedia = useSequencerStore(s => s.playingMedia)
    const mediaPlaybackByDevice = useSequencerStore(s => s.mediaPlaybackByDevice)

    const type = (event.type || '').toLowerCase()
    const device = event.fixture ? gridDevices.find(d => d.name === event.fixture) : undefined
    const deviceId = device ? String(device.id) : ''

    const isMedia = type === 'media' && isCollapsedShowProjectionMediaRow(event, gridDevices)
    const isLightWled = type === 'light' && device?.type === 'wled'
    const isLightWiz = type === 'light' && device?.type === 'wiz'

    const snap = deviceId ? mediaPlaybackByDevice[deviceId] : undefined
    const playingEntry = deviceId ? playingMedia[deviceId] : undefined

    const mediaProgress = useMemo(() => {
        if (!isMedia || !device) return { pct: 0, indeterminate: false as boolean }
        if (device.type === 'local_monitor' && snap && snap.duration && snap.duration > 0.25) {
            const ct = snap.currentTime ?? 0
            return {
                pct: Math.min(100, Math.max(0, (ct / snap.duration) * 100)),
                indeterminate: false
            }
        }
        if (playingEntry && playingEntry.filename === event.filename) {
            if ((snap?.duration ?? 0) > 0.25) {
                const ct = snap?.currentTime ?? 0
                return {
                    pct: Math.min(100, Math.max(0, (ct / (snap!.duration as number)) * 100)),
                    indeterminate: false
                }
            }
            return { pct: 0, indeterminate: true as boolean }
        }
        return { pct: 0, indeterminate: false as boolean }
    }, [isMedia, device, snap, playingEntry, event.filename])

    if (isLightWled || isLightWiz) {
        if (!lightStripPreviewOn) {
            const name = (event.fixture || device?.name || '—').trim()
            return (
                <div className="flex w-full min-w-0 items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                            className={cn(
                                LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS,
                                'font-medium tabular-nums text-white/90 text-[10px]'
                            )}
                            title={name}
                        >
                            {name}
                        </span>
                        <div className="relative h-1 min-w-0 flex-1 overflow-hidden rounded border border-white/10 bg-black" />
                    </div>
                    {showActions && (
                        <div className="flex shrink-0 gap-0.5">
                            <button
                                type="button"
                                className={iconBtn}
                                title="Herzenden"
                                onClick={e => {
                                    e.stopPropagation()
                                    resendEvent(originalIndex)
                                }}
                            >
                                <Send className="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                className={iconBtn}
                                title="Stop (zwart)"
                                onClick={e => {
                                    e.stopPropagation()
                                    if (event.fixture) void invokeLightFixtureBlack(event.fixture)
                                }}
                            >
                                <Square className="h-3 w-3 fill-current" />
                            </button>
                        </div>
                    )}
                </div>
            )
        }
        return (
            <div className="flex w-full min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                    <LightFixtureStripPreview
                        event={event}
                        compact
                        variant="micro"
                        className="!mb-0"
                        showModeStrip
                        wledPeekPlaceholder={isLightWled ? wledPeekPlaceholder : false}
                    />
                </div>
                {showActions && (
                    <div className="flex shrink-0 gap-0.5">
                        <button
                            type="button"
                            className={iconBtn}
                            title="Herzenden"
                            onClick={e => {
                                e.stopPropagation()
                                resendEvent(originalIndex)
                            }}
                        >
                            <Send className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            className={iconBtn}
                            title="Stop (zwart)"
                            onClick={e => {
                                e.stopPropagation()
                                if (event.fixture) void invokeLightFixtureBlack(event.fixture)
                            }}
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    if (!isMedia || !device) return null

    const name = (event.fixture || 'Scherm').trim()
    const isLocal = device.type === 'local_monitor'
    const playing = !!snap?.playing
    const paused = !!snap?.paused
    const hasTimeline = (snap?.duration ?? 0) > 0.25 && (snap?.currentTime ?? 0) > 0.2
    const isLive = !!(playingEntry && playingEntry.filename === event.filename)

    /** Transport actief: pauze/stop tonen; anders alleen start (plus herhalen + mute). */
    const mediaStarted = isLocal ? playing || paused : isLive

    const onPauseResume = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isLocal) {
            if (playing) pauseMedia(originalIndex)
            else if (paused || hasTimeline) ResumeMediaPlayer(device)
            else restartMedia(originalIndex)
            return
        }
        if (device.type === 'videowall_agent' || device.type === 'remote_VideoWall') {
            if (isLive) pauseMedia(originalIndex)
            else restartMedia(originalIndex)
        }
    }

    const onStart = (e: React.MouseEvent) => {
        e.stopPropagation()
        restartMedia(originalIndex)
    }

    const onStop = (e: React.MouseEvent) => {
        e.stopPropagation()
        stopMedia(originalIndex)
    }

    const onRepeat = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleRepeat(originalIndex)
    }

    const onMute = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleAudio(originalIndex)
    }

    const repeatOn = event.effect === 'repeat'

    const isTransportPaused =
        (isLocal && !!paused && !playing) || (!isLocal && isLive && !!snap?.paused)

    const pauseResumeIcon = isTransportPaused
        ? Play
        : isLocal
          ? playing
              ? Pause
              : Play
          : Pause

    const pauseResumeTitle = isTransportPaused
        ? 'Hervatten'
        : isLocal
          ? playing
              ? 'Pauze'
              : paused || hasTimeline
                ? 'Hervatten'
                : 'Starten'
          : 'Pauze'

    const PrIcon = pauseResumeIcon

    return (
        <div className="flex w-full min-w-0 items-center gap-1.5">
            <span
                className={cn(
                    LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS,
                    'font-medium tabular-nums text-white/90 text-[10px]'
                )}
                title={name}
            >
                {name}
            </span>
            <div className="relative h-1 min-w-0 flex-1 overflow-hidden rounded border border-white/10 bg-black/85">
                {mediaProgress.indeterminate ? (
                    <div
                        className="absolute inset-y-0 w-1/3 bg-emerald-600/90"
                        style={{ animation: 'collapsedMediaIndet 1.2s linear infinite' }}
                    />
                ) : (
                    <div
                        className="h-full bg-emerald-600/90 transition-[width] duration-300"
                        style={{ width: `${mediaProgress.pct}%` }}
                    />
                )}
            </div>
            {showActions && (
                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        className={iconBtn}
                        title={repeatOn ? 'Herhalen uit' : 'Herhalen aan'}
                        onClick={onRepeat}
                    >
                        <RepeatToggleGlyph repeatOn={repeatOn} />
                    </button>
                    <button type="button" className={iconBtn} title={event.sound ? 'Dempen' : 'Geluid aan'} onClick={onMute}>
                        {!event.sound ? <SpeakerMutedGlyph /> : <Volume2 className="h-3 w-3" />}
                    </button>
                    {mediaStarted ? (
                        <>
                            <button type="button" className={iconBtn} title={pauseResumeTitle} onClick={onPauseResume}>
                                <PrIcon
                                    className={cn(
                                        'h-3 w-3 fill-current',
                                        isTransportPaused && 'motion-safe:animate-pulse'
                                    )}
                                />
                            </button>
                            <button type="button" className={iconBtn} title="Stoppen" onClick={onStop}>
                                <Square className="h-3 w-3 fill-current" />
                            </button>
                        </>
                    ) : (
                        <button type="button" className={iconBtn} title="Starten" onClick={onStart}>
                            <Play className="h-3 w-3 fill-current" />
                        </button>
                    )}
                </div>
            )}
            <style>{`
        @keyframes collapsedMediaIndet {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
        </div>
    )
}

export default ShowCollapsedTechRow
