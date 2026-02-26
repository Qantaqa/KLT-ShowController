import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Clock, FileText, ToggleLeft, ToggleRight, Calendar, Check } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'

const WEEKDAYS = [
    { id: 1, name: 'Maandag' },
    { id: 2, name: 'Dinsdag' },
    { id: 3, name: 'Woensdag' },
    { id: 4, name: 'Donderdag' },
    { id: 5, name: 'Vrijdag' },
    { id: 6, name: 'Zaterdag' },
    { id: 0, name: 'Zondag' }
]

interface ProjectSettingsProps {
    isOpen: boolean
    onClose: () => void
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ isOpen, onClose }) => {
    const { activeShow, updateActiveShow, addToast } = useSequencerStore()
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        pdfPath: '',
        totalPages: 0,
        invertScriptColors: false,
        schedule: {} as Record<number, { time1: string; time2: string }>
    })

    useEffect(() => {
        if (isOpen && activeShow) {
            setFormData({
                name: activeShow.name || '',
                pdfPath: activeShow.pdfPath || '',
                totalPages: activeShow.totalPages || 0,
                invertScriptColors: activeShow.invertScriptColors || false,
                schedule: activeShow.schedule || {}
            })
        }
    }, [isOpen, activeShow])

    if (!isOpen || !activeShow) return null

    const onSaveAction = async (shouldClose: boolean) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await updateActiveShow(formData)
            addToast('Projectinstellingen succesvol opgeslagen', 'info')
            if (shouldClose) onClose()
        } catch (error: any) {
            console.error('Failed to save project settings:', error)
            addToast(`Fout bij opslaan: ${error.message || 'Onbekende fout'}`, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const updateSchedule = (dayId: number, slot: 'time1' | 'time2', value: string) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [dayId]: {
                    ...(prev.schedule[dayId] || { time1: '', time2: '' }),
                    [slot]: value
                }
            }
        }))
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Show Instellingen</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">Configuratie & Planning</p>
                        </div>
                    </div>
                    <button onClick={onClose} title="Sluiten" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 opacity-40" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-8 custom-scrollbar">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2 opacity-60 uppercase tracking-wider">
                            <FileText className="w-4 h-4" /> Algemeen
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 grayscale-0">
                                <label htmlFor="showName" className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Show Naam</label>
                                <input
                                    id="showName"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                    value={formData.name}
                                    title="Show Naam"
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                        </div>
                    </section>

                    {/* PDF Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2 opacity-60 uppercase tracking-wider">
                            <FileText className="w-4 h-4" /> Script (PDF)
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="pdfPath" className="text-[11px] font-bold text-muted-foreground uppercase ml-1">PDF Document Pad</label>
                                <div className="flex gap-2">
                                    <input
                                        id="pdfPath"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                        value={formData.pdfPath}
                                        placeholder="/database/your-script.pdf"
                                        title="PDF Document Pad"
                                        onChange={e => setFormData(prev => ({ ...prev, pdfPath: e.target.value }))}
                                    />
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { ipcRenderer } = (window as any).require('electron');
                                                const result = await ipcRenderer.invoke('select-file', {
                                                    properties: ['openFile'],
                                                    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
                                                });
                                                if (!result.canceled && result.filePaths.length > 0) {
                                                    setFormData(prev => ({ ...prev, pdfPath: result.filePaths[0] }));
                                                }
                                            } catch (e) {
                                                console.error('Failed to pick PDF', e);
                                            }
                                        }}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                    >
                                        Bladeren...
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5 grayscale-0">
                                <label htmlFor="totalPages" className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Totaal Aantal Pagina's</label>
                                <input
                                    id="totalPages"
                                    type="number"
                                    min="1"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                    value={formData.totalPages}
                                    title="Totaal Aantal Pagina's"
                                    onChange={e => setFormData(prev => ({ ...prev, totalPages: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, invertScriptColors: !prev.invertScriptColors }))}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex-1"
                            >
                                {formData.invertScriptColors ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 opacity-40" />}
                                <div className="text-left">
                                    <div className="text-sm font-bold">Inverteer PDF Kleuren</div>
                                    <div className="text-[10px] opacity-40">Gebruik voor donkere weergave op witte PDF's</div>
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Schedule */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2 opacity-60 uppercase tracking-wider">
                            <Clock className="w-4 h-4" /> Show Planning
                        </h3>
                        <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5">
                            {WEEKDAYS.map(day => (
                                <div key={day.id} className="p-4 grid grid-cols-3 items-center gap-4">
                                    <div className="text-xs font-bold uppercase opacity-80">{day.name}</div>
                                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                                        <span className="text-[9px] font-black opacity-20 uppercase">Show 1</span>
                                        <input
                                            type="time"
                                            className="bg-transparent text-xs text-white outline-none w-full"
                                            value={formData.schedule[day.id]?.time1 || ''}
                                            title={`Show 1 tijd voor ${day.name}`}
                                            aria-label={`Show 1 tijd voor ${day.name}`}
                                            onChange={e => updateSchedule(day.id, 'time1', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                                        <span className="text-[9px] font-black opacity-20 uppercase">Show 2</span>
                                        <input
                                            type="time"
                                            className="bg-transparent text-xs text-white outline-none w-full"
                                            value={formData.schedule[day.id]?.time2 || ''}
                                            title={`Show 2 tijd voor ${day.name}`}
                                            aria-label={`Show 2 tijd voor ${day.name}`}
                                            onChange={e => updateSchedule(day.id, 'time2', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg hover:bg-white/10 text-xs font-bold uppercase transition-all text-white/60 hover:text-white"
                    >
                        Annuleren
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onSaveAction(false)}
                            disabled={isSaving}
                            className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 opacity-60" /> {isSaving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                            onClick={() => onSaveAction(true)}
                            disabled={isSaving}
                            className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs font-bold uppercase shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" /> {isSaving ? 'Opslaan...' : 'Opslaan & Sluiten'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.getElementById('portal-root')!
    )
}

export default ProjectSettings
