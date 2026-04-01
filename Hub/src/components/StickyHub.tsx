import React, { useMemo, useState, useEffect } from 'react'
import { useSequencerStore } from '../store/useSequencerStore'
import { cn } from '../lib/utils'
import type { ShowEvent } from '../types/show'

const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60)
    const s = Math.floor(Math.abs(seconds) % 60)
    return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`
}

export const StickyHub: React.FC = () => {
    const {
        events,
        activeEventIndex,
        isLocked,
        activeShow,
        lastTransitionTime,
        isPaused,
        pauseStartTime,
    } = useSequencerStore() as any

    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    const showNotStarted = isLocked && activeEventIndex < 0

    const showHud = useMemo(() => {
        if (!isLocked || events.length === 0) return null
        if (activeEventIndex < 0) return null

        const current = events[activeEventIndex] as ShowEvent | undefined
        if (!current) return null

        const groupRows = events.filter((e: ShowEvent) =>
            e.act === current.act &&
            e.sceneId === current.sceneId &&
            e.eventId === current.eventId
        )
        const titleRow = groupRows.find((e: ShowEvent) => e.type?.toLowerCase() === 'title')
        const triggerRow = groupRows.find((e: ShowEvent) => e.type?.toLowerCase() === 'trigger')

        const sceneLabelKey = `${current.act}-${current.sceneId}`
        const sceneLabel = activeShow?.viewState?.sceneNames?.[sceneLabelKey] || ''

        // Find first row of the next group (event/scene/act boundary)
        let nextGroupIdx = -1
        for (let i = activeEventIndex + 1; i < events.length; i++) {
            const e = events[i]
            if (e.act !== current.act || e.sceneId !== current.sceneId || e.eventId !== current.eventId) {
                nextGroupIdx = i
                break
            }
        }

        const next = nextGroupIdx >= 0 ? (events[nextGroupIdx] as ShowEvent) : null
        const nextKind = !next
            ? null
            : next.act !== current.act
                ? 'act'
                : next.sceneId !== current.sceneId
                    ? 'scene'
                    : 'event'

        const nextGroupRows = next
            ? events.filter((e: ShowEvent) => e.act === next.act && e.sceneId === next.sceneId && e.eventId === next.eventId)
            : []
        const nextTitle = nextGroupRows.find((e: ShowEvent) => e.type?.toLowerCase() === 'title')?.cue || ''
        const nextSceneKey = next ? `${next.act}-${next.sceneId}` : ''
        const nextSceneLabel = next ? (activeShow?.viewState?.sceneNames?.[nextSceneKey] || '') : ''

        const triggerType = (triggerRow?.effect || 'manual').toLowerCase()
        const isTimed = triggerType === 'timed' && (triggerRow?.duration || 0) > 0
        const plannedDur = isTimed ? (triggerRow?.duration || 0) : (titleRow?.duration || 0)

        const elapsedSec = lastTransitionTime
            ? Math.round(((isPaused ? (pauseStartTime || currentTime.getTime()) : currentTime.getTime()) - lastTransitionTime) / 1000)
            : 0
        const remainingSec = plannedDur > 0 ? Math.max(0, plannedDur - elapsedSec) : 0

        return {
            current,
            currentTitle: titleRow?.cue || '',
            currentSceneLabel: sceneLabel,
            next,
            nextKind,
            nextTitle,
            nextSceneLabel,
            isTimed,
            plannedDur,
            remainingSec,
        }
    }, [isLocked, events, activeEventIndex, activeShow?.viewState?.sceneNames, lastTransitionTime, isPaused, pauseStartTime, currentTime])

    if (events.length === 0) return null

    // Calculate blink state for Next Event Override warning (matches bottom bar)
    const isFastBlinking = showHud && 
        ((showHud.plannedDur > 0 && showHud.remainingSec === 0) || 
         (showHud.plannedDur > 0 && showHud.remainingSec > 0 && showHud.remainingSec <= 5)) && 
        !isPaused

    const pulseClass = isFastBlinking ? "animate-fast-bright-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]" : ""

    return (
        <div className="shrink-0 z-30 px-3 py-1 bg-black/40 border-b border-white/10 sticky top-0">
            <div className="rounded-xl border border-white/10 bg-[#0b0b0bcc] backdrop-blur-md shadow-2xl overflow-hidden">
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        {showNotStarted ? (
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Show</div>
                                <div className="mt-1 text-[10px] font-bold text-white/80">
                                    Show nog niet gestart
                                </div>
                                <div className="mt-1 text-[10px] text-white/40">
                                    Start de show door naar een event te gaan.
                                </div>
                            </div>
                        ) : showHud ? (
                            <>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Nu</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <div className="px-2 py-1 rounded bg-primary/15 border border-primary/25 text-[10px] font-black uppercase tracking-widest text-primary">
                                        {showHud.current.act}
                                    </div>
                                    {showHud.current.sceneId !== undefined && showHud.current.sceneId > 0 && (
                                        <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-200">
                                            Scene {showHud.current.sceneId}{showHud.currentSceneLabel ? ` — ${showHud.currentSceneLabel}` : ''}
                                        </div>
                                    )}
                                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-white/90 truncate max-w-[520px]">
                                        {showHud.currentTitle || showHud.current.cue || '—'}
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <div className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
                                        isFastBlinking ? "bg-orange-500/20 text-orange-400" : "opacity-60"
                                    )}>
                                        Overgang: {showHud.isTimed ? 'Timed' : 'Handmatig'}
                                        {showHud.plannedDur > 0 ? ` • Duur ${formatTime(showHud.plannedDur)}` : ''}
                                        {showHud.isTimed && showHud.plannedDur > 0 ? ` • ToGo ${formatTime(showHud.remainingSec)}` : ''}
                                        {isPaused ? ' • PAUZE' : ''}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Edit</div>
                                <div className="mt-1 text-[10px] font-bold text-white/80">
                                    Open/Dicht + Hernummeren
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-start justify-end gap-4 min-w-0">
                        {showHud && !showNotStarted && (
                            <div className="min-w-0 text-right">
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Volgende</div>
                                <div className="mt-1 flex flex-col items-end gap-1">
                                    {showHud.next ? (
                                        <>
                                            <div className={cn(
                                                "px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest transition-all",
                                                showHud.nextKind === 'act' ? "bg-primary/15 border-primary/25 text-primary" :
                                                    showHud.nextKind === 'scene' ? "bg-green-500/10 border-green-500/20 text-green-200" :
                                                        "bg-orange-500/10 border-orange-500/20 text-orange-200",
                                                pulseClass
                                            )}>
                                                {showHud.nextKind === 'act' ? 'Act overgang' : showHud.nextKind === 'scene' ? 'Scene overgang' : 'Event overgang'}
                                            </div>
                                            <div className="text-[10px] font-bold text-white/80 truncate max-w-[420px]">
                                                {showHud.nextKind !== 'event' && showHud.nextSceneLabel
                                                    ? showHud.nextSceneLabel
                                                    : showHud.nextTitle || showHud.next.cue || '—'}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-[10px] font-bold text-white/40 italic">Einde show</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap justify-end pointer-events-auto" />
                    </div>
                </div>
            </div>
        </div>
    )
}
