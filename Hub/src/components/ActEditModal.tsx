import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import { modalBtnIconClass, modalBtnPrimary, modalBtnSecondary, modalHeaderCloseBtn } from '../lib/utils'

/** Act-niveau commentaar (pre-of post-reindex: geen echte scene/event). */
function findActLevelCommentIndex(events: ShowEvent[], actUid: string): number {
    return events.findIndex(e => {
        if (e.actUid !== actUid) return false
        if ((e.type || '').toLowerCase() !== 'comment') return false
        const s = e.sceneId
        const ev = e.eventId
        return (s === undefined || s === 0) && (ev === undefined || ev === 0)
    })
}

/** `actId` is de stabiele actUid. */
const ActEditModal: React.FC<{ actId: string | null; onClose: () => void }> = ({ actId, onClose }) => {
    const events = useSequencerStore(s => s.events)
    const renameAct = useSequencerStore(s => s.renameAct)
    const addActComment = useSequencerStore(s => s.addActComment)
    const saveCurrentShow = useSequencerStore(s => s.saveCurrentShow)

    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')

    const displayActName =
        (actId && (events.find(e => e.actUid === actId && (e.type || '').toLowerCase() === 'act') || events.find(e => e.actUid === actId))?.act) ||
        actId ||
        ''

    useEffect(() => {
        if (!actId) return
        setTitle(displayActName)
    }, [actId, displayActName])

    useEffect(() => {
        if (!actId) return
        const idx = findActLevelCommentIndex(events, actId)
        setNote(idx >= 0 ? events[idx].cue || '' : '')
    }, [actId, events])

    useEffect(() => {
        if (!actId) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [actId, onClose])

    if (!actId) return null

    const handleSave = async () => {
        const newTitle = title.trim() || displayActName
        if (newTitle !== displayActName) {
            const ok = await renameAct(actId!, newTitle)
            if (!ok) return
        }
        const store = useSequencerStore.getState()
        const cue = note.trim()
        let idx = findActLevelCommentIndex(store.events, actId!)
        if (idx >= 0) {
            if (cue !== (store.events[idx].cue || '')) {
                store.updateEvent(idx, { cue })
            }
        } else if (cue.length > 0) {
            addActComment(actId!)
            idx = findActLevelCommentIndex(useSequencerStore.getState().events, actId!)
            if (idx >= 0) {
                useSequencerStore.getState().updateEvent(idx, { cue })
            }
        }
        await saveCurrentShow()
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
                aria-labelledby="act-edit-title"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id="act-edit-title" className="text-sm font-black uppercase tracking-wider text-primary">
                        Act bewerken
                    </h2>
                    <button type="button" onClick={onClose} className={modalHeaderCloseBtn()} title="Sluiten">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Titel</label>
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 mb-4 outline-none focus:border-primary/45"
                    placeholder="Actnaam…"
                    autoFocus
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Opmerking / commentaar</label>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 resize-y mb-5 outline-none focus:border-primary/45"
                    placeholder="Notities bij deze act…"
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

export default ActEditModal
