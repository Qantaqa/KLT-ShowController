import React, { useRef } from 'react'
import { X, Upload, Save, Shield, Globe, Code, Monitor } from 'lucide-react'
import { useShowStore } from '../store/useShowStore'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface AppSettingsProps {
    isOpen: boolean
    onClose: () => void
    isDeveloperMode: boolean
    setIsDeveloperMode: (value: boolean) => void
    serverIp: string
}

const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose, isDeveloperMode, setIsDeveloperMode, serverIp }) => {
    const { appSettings, updateAppSettings } = useShowStore()
    const [displays, setDisplays] = React.useState<any[]>([])
    const logoInputRef = useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        if (isOpen && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            ipcRenderer.invoke('get-displays').then(setDisplays)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && (window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                const arrayBuffer = await file.arrayBuffer();
                const persistentUrl = await ipcRenderer.invoke('db:save-logo', { arrayBuffer });
                updateAppSettings({ defaultLogo: persistentUrl });
            } catch (err) {
                console.error('Failed to save logo', err);
            }
        }
    }

    const handleSelectTestVideo = async () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                const result = await ipcRenderer.invoke('select-file', {
                    title: 'Selecteer Test Video',
                    properties: ['openFile'],
                    filters: [{ name: 'Videos', extensions: ['mp4', 'webm'] }]
                })
                if (!result.canceled && result.filePaths.length > 0) {
                    updateAppSettings({ testVideoPath: result.filePaths[0] })
                }
            } catch (error) {
                console.error("Error selecting file:", error)
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[700px] glass border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-primary/20 text-primary">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">App Instellingen</h2>
                    </div>
                    <button
                        onClick={onClose}
                        title="Sluiten"
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 opacity-60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Default Logo */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold uppercase tracking-widest opacity-60">Standaard Logo</label>
                            {appSettings.defaultLogo && (
                                <button
                                    onClick={() => updateAppSettings({ defaultLogo: '' })}
                                    className="text-[10px] text-red-500 hover:underline"
                                >
                                    Verwijderen
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="w-48 h-24 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden relative group">
                                {appSettings.defaultLogo ? (
                                    <img
                                        src={appSettings.defaultLogo}
                                        alt="Default Logo"
                                        className="w-full h-full object-contain p-2"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                ) : (
                                    <span className="text-[10px] opacity-20 italic">Geen logo</span>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-xs opacity-40 leading-relaxed">
                                    Dit logo wordt gebruikt wanneer een project geen specifiek logo heeft ingesteld.
                                </p>
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-3.5 h-3.5" /> Upload Nieuw Logo
                                </button>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    title="Upload logo"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Security Settings */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Beveiliging & Netwerk
                        </label>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="accessPin" className="text-xs opacity-60">Toegangspincode</label>
                                <input
                                    id="accessPin"
                                    type="text" // Visible for easiness in this restricted dashboard
                                    value={appSettings.accessPin}
                                    onChange={(e) => updateAppSettings({ accessPin: e.target.value })}
                                    placeholder="Bijv. 1234"
                                    title="Toegangspincode"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:border-primary/50 outline-none"
                                />
                                <p className="text-[10px] opacity-30">
                                    Vereist voor externe verbindingen (niet localhost).
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="serverPort" className="text-xs opacity-60 flex items-center gap-2"><Globe className="w-3 h-3" /> Server Port</label>
                                <input
                                    id="serverPort"
                                    type="number"
                                    value={appSettings.serverPort}
                                    onChange={(e) => updateAppSettings({ serverPort: parseInt(e.target.value) || 3001 })}
                                    title="Server Poort"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary/50 outline-none"
                                />
                                <p className="text-[10px] opacity-30">
                                    Herstart vereist na wijziging.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="serverIpDisplay" className="text-xs opacity-60 flex items-center gap-2"><Globe className="w-3 h-3" /> Machine IP</label>
                                <input
                                    id="serverIpDisplay"
                                    type="text"
                                    value={serverIp}
                                    readOnly
                                    title="Machine IP Adres (Alleen Lezen)"
                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm font-mono opacity-50 cursor-default outline-none"
                                />
                                <p className="text-[9px] opacity-30">
                                    Gedetecteerd IP adres van deze machine.
                                </p>
                            </div>

                            {(window as any).require && (
                                <div className="space-y-2 col-span-2">
                                    <label htmlFor="monitorIndex" className="text-xs opacity-60 flex items-center gap-2"><Monitor className="w-3 h-3" /> Show Controller Monitor</label>
                                    <select
                                        id="monitorIndex"
                                        value={appSettings.controllerMonitorIndex || 0}
                                        onChange={(e) => updateAppSettings({ controllerMonitorIndex: parseInt(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                    >
                                        {displays.length > 0 ? (
                                            displays.map((d: any) => (
                                                <option key={d.id} value={d.index} className="bg-[#111]">{d.label}</option>
                                            ))
                                        ) : (
                                            <option value={0} className="bg-[#111]">1: Hoofdscherm (Standaard)</option>
                                        )}
                                    </select>
                                    <p className="text-[10px] opacity-30">
                                        Het scherm waarop de bediening van LedShow wordt geopend.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Media Testing */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <Monitor className="w-3.5 h-3.5" /> Media & Testen
                        </label>
                        <div className="space-y-2">
                            <label className="text-xs opacity-60">Standaard Test Video</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={appSettings.testVideoPath || ''}
                                    readOnly
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono opacity-60"
                                    placeholder="Standaard testbeeld (intern)"
                                />
                                <button onClick={handleSelectTestVideo} className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold">Kies...</button>
                            </div>
                            <p className="text-[10px] opacity-30">Video die wordt afgespeeld bij het testen van lokale monitoren.</p>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Developer Mode */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <Code className="w-3.5 h-3.5" /> Geavanceerd
                        </label>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="space-y-1">
                                <span className="text-xs font-bold">Developer Mode</span>
                                <p className="text-[10px] opacity-30 leading-relaxed">
                                    Activeert geavanceerde opties zoals database beheer. Wordt niet opgeslagen.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsDeveloperMode(!isDeveloperMode)}
                                title="Developer Mode aan/uit"
                                className={cn(
                                    "w-10 h-5 rounded-full relative transition-all duration-500 p-1 border border-white/10",
                                    isDeveloperMode ? "bg-primary/20 shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.1)]" : "bg-white/5 shadow-inner"
                                )}
                            >
                                <div className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg",
                                    isDeveloperMode ? "ml-auto bg-primary shadow-[0_0_8px_#f97316]" : "mr-auto bg-white/20"
                                )} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between">
                    <button
                        onClick={() => {
                            if ((window as any).require) {
                                (window as any).require('electron').ipcRenderer.send('test-flash');
                            }
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors text-white/60 hover:text-white"
                        title="Stuur een test bericht"
                    >
                        Test Flash Bericht
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Opslaan & Sluiten
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AppSettings
