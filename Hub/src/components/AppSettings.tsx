import React, { useState, useEffect, useRef } from 'react'
import { X, Upload, Save, Shield, Globe, Code, Monitor, Laptop, Settings2, Check } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import DevicesSettings from './DevicesSettings'
import KeyboardSettings from './KeyboardSettings'
import { cn, modalBtnIconClass, modalBtnPrimary, modalBtnSecondary, modalHeaderCloseBtn } from '../lib/utils'

interface AppSettingsProps {
    isOpen: boolean
    onClose: () => void
    isDeveloperMode: boolean
    setIsDeveloperMode: (value: boolean) => void
    serverIp: string
}

const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose, isDeveloperMode, setIsDeveloperMode, serverIp }) => {
    const { appSettings, updateAppSettings, addToast, openModal, appSettingsLaunch, consumeAppSettingsLaunch } = useSequencerStore()
    const [localSettings, setLocalSettings] = useState(appSettings)
    const [isSaving, setIsSaving] = useState(false)
    const [displayList, setDisplayList] = useState<{ id: number; index: number; isPrimary: boolean; label: string }[]>([])
    const [activeTab, setActiveTab] = useState<'general' | 'devices' | 'workstations' | 'keyboard'>('general')
    const [devicesFocusDeviceId, setDevicesFocusDeviceId] = useState<string | null>(null)
    const logoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(appSettings)
            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron')
                ipcRenderer.invoke('get-displays').then(setDisplayList)
            }
        } else {
            setDevicesFocusDeviceId(null)
        }
    }, [isOpen, appSettings])

    useEffect(() => {
        if (!isOpen || !appSettingsLaunch) return
        if (appSettingsLaunch.tab) setActiveTab(appSettingsLaunch.tab)
        if (appSettingsLaunch.deviceId) setDevicesFocusDeviceId(appSettingsLaunch.deviceId)
        consumeAppSettingsLaunch()
    }, [isOpen, appSettingsLaunch, consumeAppSettingsLaunch])

    if (!isOpen) return null

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && (window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                const arrayBuffer = await file.arrayBuffer();
                const persistentUrl = await ipcRenderer.invoke('db:save-logo', { arrayBuffer });
                setLocalSettings(prev => ({ ...prev, defaultLogo: persistentUrl }));
                await updateAppSettings({ defaultLogo: persistentUrl });
            } catch (err) {
                console.error('Failed to save logo', err);
            }
        }
        e.target.value = ''
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
                    setLocalSettings(prev => ({ ...prev, testVideoPath: result.filePaths[0] }))
                }
            } catch (error) {
                console.error("Error selecting file:", error)
            }
        }
    }

    const handleSave = async (shouldClose: boolean) => {
        if (isSaving) return
        setIsSaving(true)
        try {
            await updateAppSettings(localSettings)
            addToast('App instellingen succesvol opgeslagen', 'info')
            if (shouldClose) onClose()
        } catch (error: any) {
            console.error('Failed to save app settings:', error)
            addToast(`Fout bij opslaan: ${error.message || 'Onbekende fout'}`, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-6xl max-h-[90vh] glass border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-primary/20 text-primary">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">App Instellingen</h2>
                    </div>
                    <button type="button" onClick={onClose} title="Sluiten" className={modalHeaderCloseBtn('p-2.5')}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-6 border-b border-white/5 bg-white/[0.02]">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                        <Settings2 className="w-3.5 h-3.5" /> Algemeen
                    </button>
                    <button
                        onClick={() => setActiveTab('devices')}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'devices' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                        <Laptop className="w-3.5 h-3.5" /> Apparaten
                    </button>
                    <button
                        onClick={() => setActiveTab('workstations')}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'workstations' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                        <Globe className="w-3.5 h-3.5" /> Workstations
                    </button>
                    <button
                        onClick={() => setActiveTab('keyboard')}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'keyboard' ? 'border-primary text-primary' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Remote Keyboard
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {activeTab === 'general' && (
                        <div className="p-6 space-y-8">
                            {/* Default Logo */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold uppercase tracking-widest opacity-60">Standaard Logo</label>
                                    {localSettings.defaultLogo && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setLocalSettings(prev => ({ ...prev, defaultLogo: '' }))
                                                await updateAppSettings({ defaultLogo: '' })
                                            }}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Verwijderen
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-48 h-24 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden relative group">
                                        {localSettings.defaultLogo ? (
                                            <img
                                                src={localSettings.defaultLogo}
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
                                            Wordt linksboven in de Hub getoond en gebruikt wanneer een project geen eigen logo heeft.
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
                                        <label htmlFor="accessPin" className="text-xs opacity-60 font-bold uppercase tracking-widest">Toegangspincode</label>
                                        <input
                                            id="accessPin"
                                            type="text"
                                            value={localSettings.accessPin || ''}
                                            onChange={(e) => {
                                                setLocalSettings(prev => ({ ...prev, accessPin: e.target.value }))
                                            }}
                                            placeholder="Bijv. 1234"
                                            title="Toegangspincode"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:border-primary/50 outline-none"
                                        />
                                        <p className="text-[10px] opacity-30 italic">Laptops & Tablets gebruiken dit om te verbinden.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="serverPort" className="text-xs opacity-60 font-bold uppercase tracking-widest">Server Poort</label>
                                        <input
                                            id="serverPort"
                                            type="number"
                                            value={localSettings.serverPort || 3001}
                                            onChange={(e) => {
                                                setLocalSettings(prev => ({ ...prev, serverPort: parseInt(e.target.value) || 3001 }))
                                            }}
                                            title="Server Poort"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary/50 outline-none"
                                        />
                                        <p className="text-[10px] opacity-30 italic">Huidige IP: {serverIp}</p>
                                    </div>
                                </div>
                            </div>

                            {(window as any).require && (
                                <>
                                    <div className="h-px bg-white/5" />

                                    <div className="space-y-4">
                                        <label className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                                            <Monitor className="w-3.5 h-3.5" /> Hub-venster
                                        </label>
                                        <p className="text-[10px] opacity-40 leading-relaxed">
                                            Op welk scherm de Show Controller op deze computer wordt getoond. Wordt opgeslagen en toegepast bij de volgende start.
                                            Sneltoetsen: <span className="font-mono text-white/50">Ctrl+Alt+1</span> eerste scherm,{' '}
                                            <span className="font-mono text-white/50">Ctrl+Alt+2</span> tweede,{' '}
                                            <span className="font-mono text-white/50">Ctrl+Alt+3</span> derde (volgorde zoals Windows de schermen aanbiedt).
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                            <div className="flex-1 space-y-2">
                                                <label htmlFor="controllerMonitor" className="text-xs opacity-60 font-bold uppercase tracking-widest">Scherm</label>
                                                <select
                                                    id="controllerMonitor"
                                                    title="Scherm voor Hub-venster"
                                                    value={localSettings.controllerMonitorIndex ?? 0}
                                                    onChange={(e) => setLocalSettings(prev => ({
                                                        ...prev,
                                                        controllerMonitorIndex: Math.max(0, parseInt(e.target.value, 10) || 0)
                                                    }))}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                                >
                                                    {displayList.length === 0 ? (
                                                        <option value={0}>Scherm 1 (laden…)</option>
                                                    ) : (
                                                        displayList.map((d) => (
                                                            <option key={d.id} value={d.index}>{d.label}</option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const { ipcRenderer } = (window as any).require('electron')
                                                    ipcRenderer.invoke('get-displays').then(setDisplayList)
                                                }}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest shrink-0 h-[42px] sm:h-auto"
                                            >
                                                Vernieuwen
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="h-px bg-white/5" />

                            {/* Developer Mode */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <Code className="w-3.5 h-3.5" /> Developer Settings
                                </label>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold">Developer Mode</p>
                                        <p className="text-[10px] opacity-40">Toon extra debugging informatie en tools.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsDeveloperMode(!isDeveloperMode)}
                                        title="Toggle Developer Mode"
                                        className={cn(
                                            "w-10 h-5 rounded-full relative transition-colors",
                                            isDeveloperMode ? "bg-primary" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                            isDeveloperMode ? "left-6" : "left-1"
                                        )} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs opacity-60 font-bold uppercase tracking-widest">Standaard Test Video</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={localSettings.testVideoPath || ''}
                                            readOnly
                                            placeholder="Geen video geselecteerd"
                                            title="Standaard Test Video pad"
                                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono opacity-60"
                                        />
                                        <button
                                            onClick={handleSelectTestVideo}
                                            title="Bladeren"
                                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold transition-all"
                                        >
                                            Bladeren
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'devices' && (
                        <div className="p-6 h-full">
                            <DevicesSettings
                                devices={localSettings.devices || []}
                                onChange={(devices) => setLocalSettings(prev => ({ ...prev, devices }))}
                                focusDeviceId={devicesFocusDeviceId}
                                onConsumedFocusDevice={() => setDevicesFocusDeviceId(null)}
                            />
                        </div>
                    )}

                    {activeTab === 'workstations' && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-primary" /> Verbonden Workstations
                                    </h3>
                                    <p className="text-sm opacity-40">Beheer verbonden tablets, laptops en andere stations.</p>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {useSequencerStore.getState().connectedClients.length === 0 ? (
                                    <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                        <p className="text-xs opacity-40">Geen stations geregistreerd</p>
                                    </div>
                                ) : useSequencerStore.getState().connectedClients.map((client, wsIdx) => {
                                    const isHostClient = client.type === 'HOST'
                                    const clientUuid = client.uuid || null
                                    const clientKey = `${clientUuid || client.id || 'ws'}-${wsIdx}`
                                    return (
                                        <div key={clientKey} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center border",
                                                    isHostClient ? "bg-orange-500/20 border-orange-500/20 text-orange-500" : "bg-primary/20 border-primary/20 text-primary"
                                                )}>
                                                    {isHostClient ? <Shield className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">{client.friendlyName}</span>
                                                        {isHostClient && <span className="text-[8px] bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">HOST</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] opacity-40">
                                                        <span className="font-mono">{clientUuid ? `${clientUuid.slice(0, 8)}...` : `${(client.id || '').slice(0, 8)}...`}</span>
                                                        <span>•</span>
                                                        <span className={client.isAuthorized ? "text-green-500" : "text-yellow-500"}>
                                                            {client.isAuthorized ? 'Geautoriseerd' : 'Wacht op PIN'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!isHostClient && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                if (!clientUuid) {
                                                                    addToast('Station is nog niet geregistreerd (geen UUID). Probeer opnieuw na een paar seconden.', 'warning')
                                                                    return
                                                                }
                                                                openModal({
                                                                    title: 'Pincode wijzigen',
                                                                    message: `Nieuwe pincode voor "${client.friendlyName}" (4 cijfers):`,
                                                                    type: 'prompt',
                                                                    defaultValue: '',
                                                                    onConfirm: async (val?: string) => {
                                                                        const pin = (val || '').trim()
                                                                        if (!/^[0-9]{4}$/.test(pin)) {
                                                                            addToast('Pincode moet precies 4 cijfers zijn.', 'warning')
                                                                            return
                                                                        }
                                                                        if ((window as any).require) {
                                                                            const { ipcRenderer } = (window as any).require('electron')
                                                                            await ipcRenderer.invoke('db:update-row', {
                                                                                tableName: 'remote_clients',
                                                                                id: clientUuid,
                                                                                data: { pinCode: pin }
                                                                            })
                                                                            addToast('Pincode bijgewerkt', 'info')
                                                                        }
                                                                    }
                                                                })
                                                            }}
                                                            className="p-2 rounded-lg bg-white/5 text-white/70 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-white"
                                                            title="Pincode wijzigen"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if ((window as any).require) {
                                                                    const { ipcRenderer } = (window as any).require('electron')
                                                                    if (!clientUuid) {
                                                                        addToast('Station is nog niet geregistreerd (geen UUID). Probeer opnieuw na een paar seconden.', 'warning')
                                                                        return
                                                                    }
                                                                    openModal({
                                                                        title: 'Station verwijderen',
                                                                        message: `Weet je zeker dat je station "${client.friendlyName}" wilt verwijderen?`,
                                                                        type: 'confirm',
                                                                        onConfirm: async () => {
                                                                            await ipcRenderer.invoke('db:delete-row', { tableName: 'remote_clients', id: clientUuid })
                                                                            addToast('Station verwijderd', 'info')
                                                                        }
                                                                    })
                                                                }
                                                            }}
                                                            className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                            title="Station verwijderen"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'keyboard' && (
                        <KeyboardSettings />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={onClose} className={modalBtnSecondary()}>
                        <X className={modalBtnIconClass} />
                        Annuleren
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className={modalBtnSecondary()}
                        >
                            <Save className={modalBtnIconClass} />
                            {isSaving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className={modalBtnPrimary()}
                        >
                            <Check className="h-4 w-4 shrink-0 text-white" />
                            {isSaving ? 'Opslaan...' : 'Opslaan & Sluiten'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AppSettings
