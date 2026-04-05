import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Lightbulb, Play, Save } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import { modalBtnIconClass, modalBtnPrimary, modalBtnSecondary, modalHeaderCloseBtn } from '../lib/utils'

function sameEventGroupRow(e: ShowEvent, anchor: ShowEvent): boolean {
    if (anchor.eventUid && e.eventUid) return e.eventUid === anchor.eventUid
    return (
        e.act === anchor.act &&
        (e.sceneId ?? 0) === (anchor.sceneId ?? 0) &&
        (e.eventId ?? 0) === (anchor.eventId ?? 0)
    )
}

function findFirstEventGroupCommentIndex(events: ShowEvent[], anchor: ShowEvent): number {
    for (let i = 0; i < events.length; i++) {
        const e = events[i]
        if (!sameEventGroupRow(e, anchor)) continue
        if ((e.type || '').toLowerCase() !== 'comment') continue
        return i
    }
    return -1
}

function countEventGroupActions(events: ShowEvent[], anchor: ShowEvent) {
    let light = 0
    let media = 0
    let action = 0
    for (const e of events) {
        if (!sameEventGroupRow(e, anchor)) continue
        const t = (e.type || '').toLowerCase()
        if (t === 'light') light++
        if (t === 'media') media++
        if (t === 'action') action++
    }
    return { light, media, action }
}

export type EventEditTarget = { titleOriginalIndex: number }

const EventEditModal: React.FC<{ eventEdit: EventEditTarget | null; onClose: () => void }> = ({ eventEdit, onClose }) => {
    const events = useSequencerStore(s => s.events)
    const activeShow = useSequencerStore(s => s.activeShow)
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const updateActiveShow = useSequencerStore(s => s.updateActiveShow)
    const addCommentToEvent = useSequencerStore(s => s.addCommentToEvent)

    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    const [scriptPage, setScriptPage] = useState('')
    const [showSequenceComments, setShowSequenceComments] = useState(true)

    const titleIdx = eventEdit?.titleOriginalIndex
    const titleEv = titleIdx !== undefined ? events[titleIdx] : undefined
    const actId = titleEv?.act
    const sceneId = titleEv?.sceneId
    const eventId = titleEv?.eventId

    const counts = useMemo(() => {
        if (!titleEv) return { light: 0, media: 0, action: 0 }
        return countEventGroupActions(events, titleEv)
    }, [titleEv, events])

    useEffect(() => {
        if (titleIdx === undefined) return
        const ev = events[titleIdx]
        if (!ev) return
        setTitle(ev.cue || '')
        const pg = ev.scriptPg
        setScriptPage(pg !== undefined && pg > 0 ? String(pg) : '')
    }, [titleIdx, eventEdit, events])

    useEffect(() => {
        if (!titleEv) return
        const cidx = findFirstEventGroupCommentIndex(events, titleEv)
        setNote(cidx >= 0 ? events[cidx].cue || '' : '')
    }, [titleEv, events])

    useEffect(() => {
        if (!eventEdit) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [eventEdit, onClose])

    useEffect(() => {
        if (!eventEdit) return
        setShowSequenceComments(activeShow?.viewState?.showSequenceComments !== false)
    }, [eventEdit, activeShow?.viewState?.showSequenceComments])

    if (titleIdx === undefined || !titleEv || !actId || sceneId === undefined || eventId === undefined) return null

    const handleSave = () => {
        const evNow = useSequencerStore.getState().events[titleIdx]
        if (!evNow) {
            onClose()
            return
        }
        const newTitle = title.trim()
        if (newTitle !== (evNow.cue || '')) {
            updateEvent(titleIdx, { cue: newTitle })
        }

        const rawPg = scriptPage.trim()
        const nPg = rawPg === '' ? 0 : parseInt(rawPg, 10)
        const nextPg = Number.isFinite(nPg) && nPg > 0 ? nPg : 0
        const prevPg = evNow.scriptPg || 0
        if (nextPg !== prevPg) {
            updateEvent(titleIdx, { scriptPg: nextPg })
        }

        const cue = note.trim()
        let evs = useSequencerStore.getState().events
        let cidx = findFirstEventGroupCommentIndex(evs, evNow)
        if (cidx >= 0) {
            if (cue !== (evs[cidx].cue || '')) {
                updateEvent(cidx, { cue })
            }
        } else if (cue.length > 0) {
            addCommentToEvent(titleIdx)
            evs = useSequencerStore.getState().events
            const anchor = useSequencerStore.getState().events[titleIdx]
            cidx = anchor ? findFirstEventGroupCommentIndex(evs, anchor) : -1
            if (cidx >= 0) updateEvent(cidx, { cue })
        }

        const show = useSequencerStore.getState().activeShow
        if (show) {
            void updateActiveShow({
                viewState: {
                    ...show.viewState,
                    showSequenceComments,
                },
            })
        }

        onClose()
    }

    const showLabel = activeShow?.name?.trim() || 'Script / show'

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="w-full max-w-md rounded-xl border border-white/15 bg-[#1e1e24] shadow-2xl p-5"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-edit-title"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id="event-edit-title" className="text-sm font-black uppercase tracking-wider text-primary">
                        Event bewerken
                    </h2>
                    <button type="button" onClick={onClose} className={modalHeaderCloseBtn()} title="Sluiten">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
                    Onderdeel van <span className="font-semibold text-white/80">{actId}</span>
                    {' · '}
                    Scene <span className="font-mono text-white/75">{sceneId}</span>, Event <span className="font-mono text-white/75">{eventId}</span>
                    <br />
                    <span className="text-white/45">Script / show:</span> <span className="text-white/70">{showLabel}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Inhoud</span>
                    <div className="flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] text-yellow-200">
                        <User className="h-3 w-3" /> {counts.action}
                    </div>
                    <div className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-200">
                        <Play className="h-3 w-3" /> {counts.media}
                    </div>
                    <div className="flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-200">
                        <Lightbulb className="h-3 w-3" /> {counts.light}
                    </div>
                </div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Titel</label>
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 mb-4 outline-none focus:border-primary/45"
                    placeholder="Eventtitel…"
                    autoFocus
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Opmerking</label>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 resize-y mb-4 outline-none focus:border-primary/45"
                    placeholder="Opmerking bij dit event…"
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Gekoppelde scriptpagina (PDF)</label>
                <input
                    type="number"
                    min={1}
                    value={scriptPage}
                    onChange={e => setScriptPage(e.target.value)}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 mb-4 outline-none focus:border-primary/45"
                    placeholder="Geen koppeling"
                />
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/12 bg-[#13131a] px-3 py-2.5 mb-5">
                    <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-white/30 bg-black/40"
                        checked={showSequenceComments}
                        onChange={e => setShowSequenceComments(e.target.checked)}
                    />
                    <span className="text-xs text-white/85">Opmerkingen tonen in sequentie</span>
                </label>
                <div className="flex flex-wrap justify-end gap-2">
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
        </div>,
        document.body
    )
}

export default EventEditModal
