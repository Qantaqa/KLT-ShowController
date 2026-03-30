import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Clock, FileText, ToggleLeft, ToggleRight, Calendar, Check, Radar, Plus, Move, Trash2, Settings2, Image, Video } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import { cn } from '../lib/utils'
import type { LocalMonitorDevice } from '../types/devices'

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
    const { activeShow, updateActiveShow, addToast, appSettings, updateAppSettings } = useSequencerStore()
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'projection'>('general')
    const [calibrationMode, setCalibrationMode] = useState<Record<string, boolean>>({})
    const [displays, setDisplays] = useState<any[]>([])
    const [testImageActive, setTestImageActive] = useState(false)
    const [testVideoActive, setTestVideoActive] = useState(false)

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

            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron')
                ipcRenderer.invoke('get-displays').then(setDisplays)
            }
        }
    }, [isOpen, activeShow])

    // Listen for live mask updates from Projection Window
    useEffect(() => {
        if ((window as any).require && isOpen) {
            const { ipcRenderer } = (window as any).require('electron');
            const handler = (_: any, { deviceId, masks }: { deviceId: string, masks: any[] }) => {
                const device = appSettings.devices.find(d => d.id === deviceId);
                if (device) {
                    const updatedDevices = appSettings.devices.map(d =>
                        d.id === deviceId ? { ...d, projectionMasks: masks } : d
                    );
                    updateAppSettings({ devices: updatedDevices });
                }
            };
            const finishHandler = (_: any, { deviceId }: { deviceId: string }) => {
                setCalibrationMode(prev => ({ ...prev, [deviceId]: false }));
            };
            ipcRenderer.on('projection-masks-updated', handler);
            ipcRenderer.on('projection-calibration-finished', finishHandler);
            return () => {
                ipcRenderer.removeListener('projection-masks-updated', handler);
                ipcRenderer.removeListener('projection-calibration-finished', finishHandler);
            };
        }
    }, [isOpen, appSettings.devices, updateAppSettings]);

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

                {/* Tab Navigation */}
                <div className="flex px-6 border-b border-white/5 bg-white/[0.02]">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'
                        )}
                    >
                        <Settings2 className="w-3.5 h-3.5" /> Algemeen
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={cn(
                            "px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'
                        )}
                    >
                        <Clock className="w-3.5 h-3.5" /> Planning
                    </button>
                    <button
                        onClick={() => setActiveTab('projection')}
                        className={cn(
                            "px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'projection' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'
                        )}
                    >
                        <Radar className="w-3.5 h-3.5" /> Projectiemapping
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-8 custom-scrollbar">
                    {activeTab === 'general' && (
                        <>
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
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                                    >
                                        {formData.invertScriptColors ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 opacity-40" />}
                                        <div className="text-left">
                                            <div className="text-sm font-bold">Inverteer PDF Kleuren</div>
                                            <div className="text-[10px] opacity-40">Gebruik voor donkere weergave op witte PDF's</div>
                                        </div>
                                    </button>
                                </div>
                            </section>
                        </>
                    )}

                    {activeTab === 'schedule' && (
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
                    )}

                    {activeTab === 'projection' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Test Image Section */}
                            <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <Image className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold">Test Afbeelding</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">Grid of referentieplaatje tonen</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={async () => {
                                                if ((window as any).require) {
                                                    const { ipcRenderer } = (window as any).require('electron')
                                                    try {
                                                        const result = await ipcRenderer.invoke('select-file', {
                                                            title: 'Selecteer Test Afbeelding',
                                                            properties: ['openFile'],
                                                            filters: [{ name: 'Afbeeldingen', extensions: ['jpg', 'png', 'svg', 'webp'] }]
                                                        })
                                                        if (!result.canceled && result.filePaths.length > 0) {
                                                            updateAppSettings({ testMappingImage: result.filePaths[0] });
                                                        }
                                                    } catch (error) {
                                                        console.error("Error selecting file:", error)
                                                    }
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Selecteer Afbeelding
                                        </button>
                                        {appSettings.testMappingImage && (
                                            <button
                                                onClick={() => {
                                                    const newState = !testImageActive;
                                                    setTestImageActive(newState);
                                                    if ((window as any).require) {
                                                        const { ipcRenderer } = (window as any).require('electron');
                                                        ipcRenderer.send('projection-test-image', {
                                                            enabled: newState,
                                                            url: appSettings.testMappingImage
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                    testImageActive ? "bg-blue-500 text-white animate-pulse" : "bg-white/10 text-white/60 hover:text-white"
                                                )}
                                            >
                                                {testImageActive ? "Testbeeld AAN" : "Toon Testbeeld"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {appSettings.testMappingImage && (
                                    <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-white/40 truncate max-w-md">{appSettings.testMappingImage}</span>
                                        <button
                                            onClick={() => updateAppSettings({ testMappingImage: '' })}
                                            className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest"
                                        >
                                            Verwijder
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Test Video Section */}
                            <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
                                            <Video className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold">Test Video</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">Loepende video voor beeldafstelling</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={async () => {
                                                if ((window as any).require) {
                                                    const { ipcRenderer } = (window as any).require('electron')
                                                    try {
                                                        const result = await ipcRenderer.invoke('select-file', {
                                                            title: 'Selecteer Test Video',
                                                            properties: ['openFile'],
                                                            filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'mkv'] }]
                                                        })
                                                        if (!result.canceled && result.filePaths.length > 0) {
                                                            updateAppSettings({ testMappingVideo: result.filePaths[0] });
                                                        }
                                                    } catch (error) {
                                                        console.error("Error selecting file:", error)
                                                    }
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Selecteer Video
                                        </button>
                                        {appSettings.testMappingVideo && (
                                            <button
                                                onClick={() => {
                                                    const newState = !testVideoActive;
                                                    setTestVideoActive(newState);
                                                    if ((window as any).require) {
                                                        const { ipcRenderer } = (window as any).require('electron');
                                                        ipcRenderer.send('projection-test-video', {
                                                            enabled: newState,
                                                            url: appSettings.testMappingVideo,
                                                            playing: newState
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                    testVideoActive ? "bg-orange-500 text-black animate-pulse" : "bg-white/10 text-white/60 hover:text-white"
                                                )}
                                            >
                                                {testVideoActive ? "Testvideo AAN" : "Toon Testvideo"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {appSettings.testMappingVideo && (
                                    <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-white/40 truncate max-w-md">{appSettings.testMappingVideo}</span>
                                        <button
                                            onClick={() => updateAppSettings({ testMappingVideo: '' })}
                                            className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest"
                                        >
                                            Verwijder
                                        </button>
                                    </div>
                                )}
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold flex items-center gap-2 opacity-60 uppercase tracking-wider">
                                            <Radar className="w-4 h-4" /> Projectiemapping
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60 mt-1">Beheer polygonale maskers voor lokale schermen</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {appSettings.devices.filter(d => d.type === 'local_monitor').length === 0 ? (
                                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                            <p className="text-xs opacity-30 italic">Geen lokale schermen gevonden in de apparaatinstellingen.</p>
                                        </div>
                                    ) : (
                                        appSettings.devices.filter(d => d.type === 'local_monitor').map(device => (
                                            <div key={device.id} className="glass bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                                            <Radar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold">{device.name}</div>
                                                            <div className="text-[10px] opacity-40">
                                                                {(() => {
                                                                    const monitorId = (device as LocalMonitorDevice).monitorId;
                                                                    const disp = displays.find(d => d.index === monitorId);
                                                                    return disp ? `Scherm ${monitorId + 1}: ${disp.bounds.width}x${disp.bounds.height}` : `Scherm ${monitorId + 1}: (Niet verbonden)`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const enabled = !calibrationMode[device.id];
                                                                setCalibrationMode(prev => ({ ...prev, [device.id]: enabled }));
                                                                if ((window as any).require) {
                                                                    const { ipcRenderer } = (window as any).require('electron');
                                                                    ipcRenderer.send('projection-set-calibration', { deviceId: device.id, enabled });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                                                calibrationMode[device.id] ? "bg-orange-500 text-black animate-pulse" : "bg-white/5 text-orange-500 hover:bg-orange-500/10"
                                                            )}
                                                        >
                                                            {calibrationMode[device.id] ? "Calibratie STOP" : "Start Calibratie"}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const currentMasks = (device as LocalMonitorDevice).projectionMasks || [];
                                                                const newMask: any = {
                                                                    id: `mask_${Date.now()}`,
                                                                    points: [
                                                                        { x: 25, y: 25 },
                                                                        { x: 75, y: 25 },
                                                                        { x: 75, y: 75 },
                                                                        { x: 25, y: 75 }
                                                                    ]
                                                                };
                                                                const newDevices = appSettings.devices.map(d =>
                                                                    d.id === device.id ? { ...d, projectionMasks: [...currentMasks, newMask] } : d
                                                                );
                                                                updateAppSettings({ devices: newDevices });

                                                                if ((window as any).require) {
                                                                    const { ipcRenderer } = (window as any).require('electron');
                                                                    ipcRenderer.send('media-command', {
                                                                        deviceId: device.id,
                                                                        command: 'config-update',
                                                                        payload: { projectionMasks: [...currentMasks, newMask] }
                                                                    });
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                        >
                                                            <Plus className="w-3 h-3" /> Masker Toevoegen
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 space-y-3">
                                                    {!(device as LocalMonitorDevice).projectionMasks?.length && (
                                                        <p className="text-[10px] opacity-30 italic text-center py-4">Geen maskers gedefinieerd voor dit scherm.</p>
                                                    )}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {(device as LocalMonitorDevice).projectionMasks?.map((mask, mIdx) => (
                                                            <div key={mask.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                                        <Move className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] font-bold text-white uppercase tracking-wider">Masker {mIdx + 1}</div>
                                                                        <div className="text-[9px] text-white/40 font-mono">{mask.points.length} punten</div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const newMasks = (device as LocalMonitorDevice).projectionMasks!.filter(m => m.id !== mask.id);
                                                                        const newDevices = appSettings.devices.map(d =>
                                                                            d.id === device.id ? { ...d, projectionMasks: newMasks } : d
                                                                        );
                                                                        updateAppSettings({ devices: newDevices });

                                                                        if ((window as any).require) {
                                                                            const { ipcRenderer } = (window as any).require('electron');
                                                                            ipcRenderer.send('media-command', {
                                                                                deviceId: device.id,
                                                                                command: 'config-update',
                                                                                payload: { projectionMasks: newMasks }
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                                                    title="Verwijder Masker"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
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
