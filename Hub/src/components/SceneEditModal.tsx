import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'

function sceneViewKey(actId: string, sceneId: number) {
    return `${actId}-${sceneId}`
}

function findSceneLevelCommentIndex(events: ShowEvent[], actName: string, sceneId: number): number {
    return events.findIndex(e => {
        if (e.act !== actName) return false
        if ((e.sceneId ?? 0) !== (sceneId ?? 0)) return false
        if ((e.type || '').toLowerCase() !== 'comment') return false
        const ev = e.eventId
        return ev === undefined || ev === 0
    })
}

export type SceneEditTarget = { actId: string; sceneId: number }

const SceneEditModal: React.FC<{ sceneEdit: SceneEditTarget | null; onClose: () => void }> = ({ sceneEdit, onClose }) => {
    const events = useSequencerStore(s => s.events)
    const activeShow = useSequencerStore(s => s.activeShow)
    const addSceneComment = useSequencerStore(s => s.addSceneComment)
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const updateActiveShow = useSequencerStore(s => s.updateActiveShow)

    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    const [scriptPage, setScriptPage] = useState('')

    const actId = sceneEdit?.actId
    const sceneId = sceneEdit?.sceneId

    useEffect(() => {
        if (!actId || sceneId === undefined) return
        const name = activeShow?.viewState?.sceneNames?.[sceneViewKey(actId, sceneId)] ?? ''
        setTitle(name)
        const pg = activeShow?.viewState?.sceneScriptPages?.[sceneViewKey(actId, sceneId)]
        setScriptPage(pg !== undefined && pg > 0 ? String(pg) : '')
    }, [actId, sceneId, sceneEdit, activeShow?.viewState?.sceneNames, activeShow?.viewState?.sceneScriptPages])

    useEffect(() => {
        if (!actId || sceneId === undefined) return
        const idx = findSceneLevelCommentIndex(events, actId, sceneId)
        setNote(idx >= 0 ? events[idx].cue || '' : '')
    }, [actId, sceneId, events])

    useEffect(() => {
        if (!sceneEdit) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [sceneEdit, onClose])

    if (!actId || sceneId === undefined) return null

    const handleSave = async () => {
        const key = sceneViewKey(actId, sceneId)
        const cue = note.trim()

        let evs = useSequencerStore.getState().events
        let idx = findSceneLevelCommentIndex(evs, actId, sceneId)
        if (idx >= 0) {
            if (cue !== (evs[idx].cue || '')) {
                updateEvent(idx, { cue })
            }
        } else if (cue.length > 0) {
            addSceneComment(actId, sceneId)
            evs = useSequencerStore.getState().events
            idx = findSceneLevelCommentIndex(evs, actId, sceneId)
            if (idx >= 0) updateEvent(idx, { cue })
        }

        const show = useSequencerStore.getState().activeShow
        if (!show) {
            onClose()
            return
        }

        const sceneNames = { ...(show.viewState?.sceneNames || {}) }
        sceneNames[key] = title.trim()

        const raw = scriptPage.trim()
        const n = raw === '' ? 0 : parseInt(raw, 10)
        const sceneScriptPages = { ...(show.viewState?.sceneScriptPages || {}) }
        if (!Number.isFinite(n) || n <= 0) {
            delete sceneScriptPages[key]
        } else {
            sceneScriptPages[key] = n
        }

        await updateActiveShow({
            viewState: {
                ...show.viewState,
                sceneNames,
                sceneScriptPages,
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
                    Onderdeel van <span className="font-semibold text-white/80">{actId}</span>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Gekoppelde scriptpagina (PDF)</label>
                <input
                    type="number"
                    min={1}
                    value={scriptPage}
                    onChange={e => setScriptPage(e.target.value)}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 mb-5 outline-none focus:border-primary/45"
                    placeholder="Geen koppeling"
                />
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
