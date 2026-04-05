import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, ArrowRightLeft } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import { modalBtnIconClass, modalBtnPrimary, modalBtnSecondary, modalHeaderCloseBtn } from '../lib/utils'
import { splitEventsIntoActBlocks, stableSceneMetaKey } from '../lib/sequenceStableIds'

/** Resolved storage key for sceneNames / sceneScriptPages (stable + legacy fallbacks). */
function sceneMetaStorageKey(events: ShowEvent[], actUid: string, sceneId: number): string {
    const header =
        events.find(
            e =>
                e.actUid === actUid &&
                (e.type || '').toLowerCase() === 'scene' &&
                (e.sceneId ?? 0) === (sceneId ?? 0)
        ) || events.find(e => e.actUid === actUid && (e.sceneId ?? 0) === (sceneId ?? 0))
    if (header) return stableSceneMetaKey(header)
    const anyRow = events.find(e => e.actUid === actUid)
    return `${anyRow?.act ?? actUid}-${sceneId}`
}

function findSceneLevelCommentIndex(events: ShowEvent[], actUid: string, sceneId: number): number {
    return events.findIndex(e => {
        if (e.actUid !== actUid) return false
        if ((e.sceneId ?? 0) !== (sceneId ?? 0)) return false
        if ((e.type || '').toLowerCase() !== 'comment') return false
        const ev = e.eventId
        return ev === undefined || ev === 0
    })
}

/** actId = actUid (stabiele act-reference). */
export type SceneEditTarget = { actId: string; sceneId: number }

const SceneEditModal: React.FC<{ sceneEdit: SceneEditTarget | null; onClose: () => void }> = ({ sceneEdit, onClose }) => {
    const events = useSequencerStore(s => s.events)
    const activeShow = useSequencerStore(s => s.activeShow)
    const addSceneComment = useSequencerStore(s => s.addSceneComment)
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const updateActiveShow = useSequencerStore(s => s.updateActiveShow)
    const moveSceneToAct = useSequencerStore(s => s.moveSceneToAct)
    const openModal = useSequencerStore(s => s.openModal)

    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    const [showSequenceComments, setShowSequenceComments] = useState(true)

    const actUid = sceneEdit?.actId
    const sceneId = sceneEdit?.sceneId

    const actDisplayLabel = useMemo(() => {
        if (!actUid) return ''
        const actRow =
            events.find(e => e.actUid === actUid && (e.type || '').toLowerCase() === 'act') ||
            events.find(e => e.actUid === actUid)
        return actRow?.act ?? actUid
    }, [events, actUid])

    const otherActs = useMemo(() => {
        if (!actUid) return []
        const blocks = splitEventsIntoActBlocks(events)
        return blocks
            .map(b => ({ uid: b[0]?.actUid, label: b[0]?.act ?? '' }))
            .filter((x): x is { uid: string; label: string } => !!x.uid && x.uid !== actUid)
    }, [events, actUid])

    const [moveTargetActUid, setMoveTargetActUid] = useState<string>('')

    useEffect(() => {
        if (!sceneEdit || otherActs.length === 0) {
            setMoveTargetActUid('')
            return
        }
        setMoveTargetActUid(prev => (prev && otherActs.some(a => a.uid === prev) ? prev : otherActs[0]!.uid))
    }, [sceneEdit, otherActs])

    useEffect(() => {
        if (!actUid || sceneId === undefined) return
        const meta = sceneMetaStorageKey(events, actUid, sceneId)
        const legacy = `${actDisplayLabel}-${sceneId}`
        const name =
            activeShow?.viewState?.sceneNames?.[meta] ??
            activeShow?.viewState?.sceneNames?.[legacy] ??
            ''
        setTitle(name)
    }, [actUid, sceneId, events, actDisplayLabel, activeShow?.viewState?.sceneNames, sceneEdit])

    useEffect(() => {
        if (!actUid || sceneId === undefined) return
        const idx = findSceneLevelCommentIndex(events, actUid, sceneId)
        setNote(idx >= 0 ? events[idx].cue || '' : '')
    }, [actUid, sceneId, events])

    useEffect(() => {
        if (!sceneEdit) return
        setShowSequenceComments(activeShow?.viewState?.showSequenceComments !== false)
    }, [sceneEdit, activeShow?.viewState?.showSequenceComments])

    useEffect(() => {
        if (!sceneEdit) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [sceneEdit, onClose])

    if (!actUid || sceneId === undefined) return null

    const handleSave = async () => {
        const key = sceneMetaStorageKey(useSequencerStore.getState().events, actUid, sceneId)
        const cue = note.trim()

        let evs = useSequencerStore.getState().events
        let idx = findSceneLevelCommentIndex(evs, actUid, sceneId)
        if (idx >= 0) {
            if (cue !== (evs[idx].cue || '')) {
                updateEvent(idx, { cue })
            }
        } else if (cue.length > 0) {
            addSceneComment(actUid, sceneId)
            evs = useSequencerStore.getState().events
            idx = findSceneLevelCommentIndex(evs, actUid, sceneId)
            if (idx >= 0) updateEvent(idx, { cue })
        }

        const show = useSequencerStore.getState().activeShow
        if (!show) {
            onClose()
            return
        }

        const sceneNames = { ...(show.viewState?.sceneNames || {}) }
        sceneNames[key] = title.trim()

        await updateActiveShow({
            viewState: {
                ...show.viewState,
                sceneNames,
                showSequenceComments,
            },
        })
        onClose()
    }

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
                aria-labelledby="scene-edit-title"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id="scene-edit-title" className="text-sm font-black uppercase tracking-wider text-primary">
                        Scene bewerken
                    </h2>
                    <button type="button" onClick={onClose} className={modalHeaderCloseBtn()} title="Sluiten">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[11px] text-white/50 mb-4 leading-relaxed">
                    Scene <span className="font-mono text-white/75">{sceneId}</span>
                    {' · '}
                    Onderdeel van <span className="font-semibold text-white/80">{actDisplayLabel}</span>
                </p>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Titel</label>
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 mb-4 outline-none focus:border-primary/45"
                    placeholder="Scene-omschrijving…"
                    autoFocus
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Opmerking / commentaar</label>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 resize-y mb-4 outline-none focus:border-primary/45"
                    placeholder="Notities bij deze scene…"
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

                {otherActs.length > 0 && (
                    <div className="mb-5 rounded-lg border border-white/12 bg-[#13131a] px-3 py-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                            Verplaatsen naar andere act
                        </div>
                        <p className="text-[11px] text-white/45 mb-2 leading-relaxed">
                            Hele scene met alle events en acties wordt achteraan de gekozen act gezet. Scene- en
                            eventnummers worden daarna opnieuw toegepast.
                        </p>
                        <div className="flex flex-wrap items-stretch gap-2">
                            <select
                                value={moveTargetActUid}
                                onChange={e => setMoveTargetActUid(e.target.value)}
                                className="min-w-0 flex-1 rounded-lg bg-[#0c0c10] border border-white/18 px-2 py-2 text-xs text-white outline-none focus:border-primary/45"
                            >
                                {otherActs.map(a => (
                                    <option key={a.uid} value={a.uid}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!moveTargetActUid || !actUid || sceneId === undefined) return
                                    const destLabel = otherActs.find(a => a.uid === moveTargetActUid)?.label ?? ''
                                    openModal({
                                        title: 'Scene verplaatsen',
                                        message: `Deze hele scene (alle events en acties) wordt naar act "${destLabel}" verplaatst en achteraan die act gezet. Doorgaan?`,
                                        type: 'confirm',
                                        onConfirm: () => {
                                            void (async () => {
                                                await moveSceneToAct(actUid, sceneId, moveTargetActUid)
                                                onClose()
                                            })()
                                        },
                                    })
                                }}
                                className={modalBtnSecondary('px-3 shrink-0 flex items-center gap-1.5')}
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                                Verplaatsen
                            </button>
                        </div>
                    </div>
                )}

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

export default SceneEditModal
