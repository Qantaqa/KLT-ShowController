import React, { useState } from 'react'
import { Plus, Trash2, Settings2, Monitor, Wifi, Tv, ChevronDown, Radar, RefreshCw, WifiOff, Play, X, StopCircle, Volume2, VolumeX } from 'lucide-react'
import { cn } from '../lib/utils'
import { useShowStore } from '../store/useShowStore'
import type { Device, DeviceType, WLEDDevice, LocalMonitorDevice, RemoteLedwallDevice, WiZDevice, VideoWallAgentDevice } from '../store/useShowStore'
import { StartMediaPlayer, StopMediaPlayer, SetVolumeMediaPlayer } from '../services/media-player-service'
import { TurnOnWiz, SetWizColor, TurnOffWiz } from '../services/wiz-service'

const LAYOUTS_4 = ['2x2', '1x1', '1x2', '1x3', '1x4', '4x1', '3x1', '2x1'];
const LAYOUTS_9 = ['1x1', '1x2', '1x3', '1x4', '2x1', '2x2', '2x3', '2x4', '3x1', '3x2', '3x3', '4x1', '4x2'];

const DevicesSettings: React.FC = () => {
    const { appSettings, addDevice, updateDevice, deleteDevice, openModal, addToast } = useShowStore()
    const [expandedDevice, setExpandedDevice] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResults, setScanResults] = useState<any[]>([])
    const [scanProgress, setScanProgress] = useState<{ status: string, progress: number, found: number } | null>(null)
    const [displays, setDisplays] = useState<any[]>([])
    const [unreachableDevices, setUnreachableDevices] = useState<Set<string>>(new Set())
    const [processedScanResults, setProcessedScanResults] = useState<Set<string>>(new Set())
    const [testVolumes, setTestVolumes] = useState<Record<string, number>>({})

    React.useEffect(() => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            ipcRenderer.invoke('get-displays').then(setDisplays)
        }
    }, [])

    const handleScan = async () => {
        setIsScanning(true)
        setScanResults([])
        setScanProgress({ status: 'Starting...', progress: 0, found: 0 })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')

            const onProgress = (_: any, data: any) => {
                setScanProgress(data)
            }
            ipcRenderer.on('scan-progress', onProgress)

            try {
                const results: any[] = await ipcRenderer.invoke('scan-devices')
                setScanResults(results)

                // Calculate unreachable devices
                const currentDevices = useShowStore.getState().appSettings.devices || []
                const foundIps = new Set(results.map(r => r.ip))
                const foundMacs = new Set(results.map(r => r.mac).filter(Boolean))

                const unreachable = new Set<string>()
                currentDevices.forEach(d => {
                    const isFound = (d as any).ip && (foundIps.has((d as any).ip) || (d.mac && foundMacs.has(d.mac)))
                    if (d.type !== 'local_monitor' && !isFound) {
                        unreachable.add(d.id)
                    }
                })
                setUnreachableDevices(unreachable)

                // Auto-process VideoWall Agents (always update/add)
                const agentResults = results.filter(r => r.type === 'ledwall_agent');
                if (agentResults.length > 0) {
                    agentResults.forEach(agent => {
                        handleAddFromScan(agent, true);
                    });
                }

            } catch (e) {
                console.error(e)
            } finally {
                ipcRenderer.removeListener('scan-progress', onProgress)
                setScanProgress(null)
            }
        }
        setIsScanning(false)
    }

    const handleAddFromScan = (device: any, isAuto = false) => {
        // Check if device already exists
        const currentDevices = useShowStore.getState().appSettings.devices || [];
        const existingDevice = currentDevices.find(d =>
            (d.mac && device.mac && d.mac === device.mac) ||
            ((d as any).ip === device.ip)
        );

        if (existingDevice) {
            // Update existing
            const updates: Partial<Device> = {
                ip: device.ip,
                mac: device.mac || existingDevice.mac
            };

            // For auto-updates, avoid overriding names if they were customized, 
            // but update technical config if it changed.
            // If manual (not isAuto), we prioritize the scanned info.
            if (device.type === 'ledwall_agent') {
                if (!isAuto || existingDevice.name.startsWith('VideoWall') || existingDevice.name.startsWith('TestWall')) {
                    updates.name = device.name || existingDevice.name;
                }
                (updates as any).model = device.details?.model || (existingDevice as any).model;
                (updates as any).layout = device.details?.layout || (existingDevice as any).layout;
                (updates as any).orientation = device.details?.orientation || (existingDevice as any).orientation;
            }

            if (device.type === 'wled') {
                const segmentCount = device.details?.leds?.segs?.length || 1;
                const segments = Array.from({ length: segmentCount }, (_, i) => ({
                    id: i,
                    name: device.details?.leds?.segs?.[i]?.n || `Segment ${i}`
                }));
                (updates as any).segments = segments;
            }

            // Only update and toast if something actually changed or if it's manual
            const hasChanges = (existingDevice as any).ip !== device.ip ||
                ((updates as any).name && (existingDevice as any).name !== (updates as any).name) ||
                (device.type === 'ledwall_agent' && (
                    (existingDevice as any).model !== (updates as any).model ||
                    (existingDevice as any).layout !== (updates as any).layout ||
                    (existingDevice as any).orientation !== (updates as any).orientation
                ));

            if (hasChanges || !isAuto) {
                updateDevice(existingDevice.id, updates);
                if (isAuto && hasChanges) {
                    addToast(`VideoWall "${existingDevice.name}" automatisch bijgewerkt naar ${device.ip}`, "info");
                } else if (!isAuto) {
                    addToast(`${existingDevice.name} bijgewerkt`, "info");
                }
            }
        } else {
            // Add new
            const id = `device_${Date.now()}`
            let newDevice: Device | null = null;

            if (device.type === 'wled') {
                const segmentCount = device.details?.leds?.segs?.length || 1;
                const segments = Array.from({ length: segmentCount }, (_, i) => ({
                    id: i,
                    name: device.details?.leds?.segs?.[i]?.n || `Segment ${i}`
                }));

                newDevice = {
                    id,
                    name: device.name || 'WLED Device',
                    type: 'wled',
                    enabled: true,
                    ip: device.ip,
                    mac: device.mac,
                    segments
                }
            } else if (device.type === 'wiz') {
                newDevice = {
                    id,
                    name: device.name || 'WiZ Light',
                    type: 'wiz',
                    enabled: true,
                    ip: device.ip,
                    mac: device.mac
                }
            } else if (device.type === 'ledwall_agent') {
                newDevice = {
                    id,
                    name: device.name || 'VideoWall Agent',
                    type: 'videowall_agent',
                    enabled: true,
                    ip: device.ip,
                    port: 3000,
                    mac: device.mac,
                    model: device.details?.model || '4-screen',
                    layout: device.details?.layout || '2x2',
                    orientation: device.details?.orientation || 'landscape'
                }
            }

            if (newDevice) {
                addDevice(newDevice)
                if (isAuto) {
                    addToast(`Nieuwe VideoWall "${newDevice.name}" automatisch toegevoegd`, "info");
                } else {
                    addToast(`${newDevice.name} toegevoegd`, "info");
                }
                // Mark as processed to hide from list
                setProcessedScanResults(prev => new Set([...prev, device.ip]))
            }
        }
    }

    const handleIgnoreScanResult = (ip: string) => {
        setProcessedScanResults(prev => new Set([...prev, ip]))
    }

    const devices = appSettings.devices || []

    const handleAddDevice = (type: DeviceType) => {
        const id = `device_${Date.now()}`
        let newDevice: Device

        switch (type) {
            case 'wled':
                newDevice = { id, name: 'Nieuwe WLED', type, enabled: true, ip: '', segments: [] }
                break
            case 'wiz':
                newDevice = { id, name: 'Nieuwe WiZ', type, enabled: true, ip: '' }
                break
            case 'local_monitor':
                newDevice = { id, name: 'Lokale Monitor', type, enabled: true, monitorId: 1 }
                break
            case 'remote_ledwall':
                newDevice = { id, name: 'Remote Ledwall', type, enabled: true, ip: '', width: 1920, height: 1080, orientation: 'landscape' }
                break
            case 'videowall_agent':
                newDevice = { id, name: 'Nieuwe VideoWall Agent', type, enabled: true, ip: '', port: 3000, model: '4-screen', layout: '2x2', orientation: 'landscape' }
                break
        }

        addDevice(newDevice)
        setExpandedDevice(id)
    }



    const handleTestDevice = async (device: Device) => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')

            if (device.type === 'local_monitor') {
                const monitor = device as LocalMonitorDevice;
                const testVideoPath = await ipcRenderer.invoke('get-test-video-path');
                if (testVideoPath) {
                    const fadeInTime = (monitor.transitionTime || 0.5) * 1000;
                    const transitionTime = (monitor.transitionTime || 0.5) * 1000;

                    await StartMediaPlayer(device, testVideoPath, true, 100, fadeInTime, undefined, transitionTime);
                    setTestVolumes(prev => ({ ...prev, [device.id]: 100 }))
                    addToast(`Test gestart op monitor: ${device.name}`, "info");
                } else {
                    addToast("Test video bestand niet gevonden!", "error");
                }
            } else if (device.type === 'wiz') {
                const wiz = device as WiZDevice;
                try {
                    // Turn on with fade in
                    await TurnOnWiz(wiz, 100);

                    const transitionMs = (wiz.transitionTime || 0.5) * 1000;

                    // Cycle colors with transition
                    setTimeout(() => SetWizColor(wiz, 255, 0, 0), 1000);
                    setTimeout(() => SetWizColor(wiz, 0, 255, 0), 1000 + transitionMs + 500);
                    setTimeout(() => SetWizColor(wiz, 0, 0, 255), 1000 + (transitionMs + 500) * 2);

                    // Turn off with fade out
                    setTimeout(() => TurnOffWiz(wiz), 1000 + (transitionMs + 500) * 3 + 1000);

                    addToast(`Test gestart voor WiZ: ${device.name}`, "info");
                } catch (e) {
                    addToast("WiZ Test mislukt!", "error");
                }
            } else {
                // Keep original logic for WLED
                await ipcRenderer.invoke('test-device', device)
            }
        }
    }

    const handleStopTest = (device: Device) => {
        StopMediaPlayer(device, 500); // 500ms fadeout default
    }

    const handleVolumeTest = (device: Device, delta: number) => {
        const currentVol = testVolumes[device.id] ?? 100
        const newVol = Math.max(0, Math.min(100, currentVol + delta))
        setTestVolumes(prev => ({ ...prev, [device.id]: newVol }))

        SetVolumeMediaPlayer(device, newVol);
    }

    const handleMuteTest = (device: Device, mute: boolean) => {
        const currentVol = testVolumes[device.id] ?? 100
        // If mute is true, volume is effectively 0, but we might want to store 'muted' state separately or just send 0?
        // Service implementation sends mute flag if volume is 0. 
        // But the previous implementation logic sent specific mute flag with current volume.
        // My new service SetVolume only handles volume.
        // Wait, checking my service implementation: 
        // ipc.send(..., { payload: { volume: newVolume, mute: newVolume === 0 } })
        // It implies mute is only true if volume is 0. 
        // To support explicit MUTE button without losing volume level, I should probably update the service or just send 0.
        // Sending 0 is fine for "Test Mute". 
        // If I want to unmute, I send 'currentVol'.

        SetVolumeMediaPlayer(device, mute ? 0 : currentVol);
    }

    const renderDeviceIcon = (type: DeviceType) => {
        switch (type) {
            case 'wled': return <Wifi className="w-4 h-4" />
            case 'wiz': return <Wifi className="w-4 h-4 text-info" />
            case 'local_monitor': return <Monitor className="w-4 h-4" />
            case 'remote_ledwall': return <Tv className="w-4 h-4" />
            case 'videowall_agent': return <Tv className="w-4 h-4 text-primary" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 opacity-60 uppercase tracking-wider">
                    <Settings2 className="w-4 h-4" /> Apparaten
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 text-primary disabled:opacity-80 min-w-[160px] justify-center"
                    >
                        {isScanning ? (
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="flex items-center gap-2">
                                    <Radar className="w-3 h-3 animate-spin" />
                                    {Math.round(scanProgress?.progress || 0)}%
                                </span>
                                <span className="text-[9px] opacity-70">
                                    {scanProgress?.found || 0} Gevonden
                                </span>
                            </div>
                        ) : (
                            <>
                                <Radar className="w-3 h-3" /> Scan Netwerk
                            </>
                        )}
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button
                        onClick={() => handleAddDevice('wled')}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> WLED
                    </button>
                    <button
                        onClick={() => handleAddDevice('wiz')}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> WiZ
                    </button>
                    <button
                        onClick={() => handleAddDevice('local_monitor')}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Monitor
                    </button>
                    <button
                        onClick={() => handleAddDevice('videowall_agent')}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Agent
                    </button>
                    <button
                        onClick={() => handleAddDevice('remote_ledwall')}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Ledwall
                    </button>
                </div>
            </div>

            {scanResults.length > 0 && (
                <div className="space-y-2 mb-4">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest px-1">Gevonden Apparaten</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {scanResults.filter(r => !processedScanResults.has(r.ip)).map((result, idx) => {
                            const existing = (devices || []).find(d =>
                                (d.mac && result.mac && d.mac === result.mac) ||
                                ((d as any).ip === result.ip)
                            );

                            return (
                                <div key={idx} className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between group hover:bg-primary/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            {renderDeviceIcon(result.type as DeviceType) || <Wifi className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white flex gap-2 items-center">
                                                {result.name}
                                                <span className="text-[9px] uppercase opacity-50 bg-black/20 px-1 rounded">{result.type}</span>
                                            </div>
                                            <div className="text-[10px] text-primary/60 font-mono flex gap-2">
                                                {result.ip}
                                                {result.mac && <span className="opacity-50">({result.mac})</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleIgnoreScanResult(result.ip)}
                                            className="p-2 text-muted-foreground hover:text-white rounded-lg transition-colors"
                                            title="Negeren"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAddFromScan(result)}
                                            className={`p-2 rounded-lg transition-colors ${existing ? 'bg-warning/20 text-warning hover:bg-warning hover:text-white' : 'bg-primary text-primary-foreground hover:bg-white shadow-lg shadow-primary/20'}`}
                                            title={existing ? "Bijwerken" : "Toevoegen"}
                                        >
                                            {existing ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className={devices.length === 0 ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"}>
                {devices.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-xs opacity-30 italic">Nog geen apparaten toegevoegd aan dit project.</p>
                    </div>
                ) : (
                    devices.map(device => {
                        const missingIp = device.type !== 'local_monitor' && !(device as any).ip;
                        const isUnreachable = unreachableDevices.has(device.id);
                        const isExpanded = expandedDevice === device.id;

                        return (
                            <div key={device.id} className={cn(
                                "rounded-2xl border overflow-hidden transition-colors relative transition-all",
                                !device.enabled ? "bg-black/40 border-white/5 opacity-70" : "glass bg-white/5",
                                missingIp ? "border-destructive/50" : (isUnreachable ? "border-destructive/50" : "border-white/10")
                            )}>
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {!device.enabled && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-white/5 text-white/40 rounded">Disabled</span>}
                                    <span className="text-[9px] font-black opacity-20 uppercase px-1.5 py-0.5 bg-white/10 rounded pointer-events-none">
                                        {device.type}
                                    </span>
                                </div>

                                <div
                                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedDevice(isExpanded ? null : device.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.enabled ? 'bg-primary/20 text-primary' : 'bg-white/5 opacity-40'}`}>
                                            {renderDeviceIcon(device.type)}
                                        </div>
                                        <div className="flex-1 pr-4">
                                            <div className="text-sm font-bold flex items-center gap-2">
                                                {device.name}
                                            </div>
                                            <div className="text-[10px] opacity-40 flex items-center gap-2 mt-0.5">
                                                {device.type === 'local_monitor' ? `Monitor ID: ${(device as LocalMonitorDevice).monitorId}` : (device as any).ip || 'Geen IP opgegeven'}
                                                {isUnreachable && (
                                                    <span className="text-destructive flex items-center gap-1 font-bold ml-2 uppercase tracking-tight text-[9px]">
                                                        <WifiOff className="w-3 h-3" /> Niet bereikbaar
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expand Bar */}
                                {!isExpanded && (
                                    <div
                                        className="h-6 w-full flex items-center justify-center bg-black/20 hover:bg-black/40 cursor-pointer border-t border-white/5 group"
                                        onClick={() => setExpandedDevice(device.id)}
                                    >
                                        <ChevronDown className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}

                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Naam</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                    value={device.name}
                                                    placeholder="Apparaat Naam"
                                                    aria-label="Apparaat Naam"
                                                    onChange={e => updateDevice(device.id, { name: e.target.value })}
                                                />
                                            </div>
                                            {device.type !== 'local_monitor' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">IP Adres</label>
                                                    <input
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as any).ip || ''}
                                                        placeholder="192.168.1.x"
                                                        aria-label="IP Adres"
                                                        onChange={e => updateDevice(device.id, { ip: e.target.value } as any)}
                                                    />
                                                </div>
                                            )}
                                            {device.type === 'local_monitor' && (
                                                <>
                                                    <div className="space-y-1.5 col-span-2">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fysiek Scherm</label>
                                                        <select
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                            value={(device as LocalMonitorDevice).monitorId}
                                                            onChange={e => updateDevice(device.id, { monitorId: parseInt(e.target.value) } as any)}
                                                            title="Selecteer Fysiek Scherm"
                                                        >
                                                            {[0, 1, 2].map(idx => {
                                                                const d = displays.find(disp => disp.index === idx);
                                                                return (
                                                                    <option key={idx} value={idx} className="bg-background">
                                                                        Scherm {idx + 1}: {d ? `${d.index === 0 ? '(Hoofdscherm) ' : ''}${d.bounds.width}x${d.bounds.height}` : '(Niet verbonden)'}
                                                                    </option>
                                                                )
                                                            })}
                                                        </select>
                                                        <p className="text-[9px] opacity-30 px-1 italic">
                                                            Dit is het fysieke scherm van de host machine waarop dit venster wordt getoond.
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 mt-4 col-span-2">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-out tijd (sec)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                                value={(device as LocalMonitorDevice).fadeOutTime !== undefined ? (device as LocalMonitorDevice).fadeOutTime : 0.5}
                                                                placeholder="0.5"
                                                                onChange={e => updateDevice(device.id, { fadeOutTime: parseFloat(e.target.value) || 0 } as any)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Transitie tijd (sec)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                                value={(device as LocalMonitorDevice).transitionTime !== undefined ? (device as LocalMonitorDevice).transitionTime : 0.5}
                                                                placeholder="0.5"
                                                                onChange={e => updateDevice(device.id, { transitionTime: parseFloat(e.target.value) || 0 } as any)}
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {device.type === 'wled' && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Segmenten</label>
                                                    <button
                                                        onClick={() => {
                                                            const d = device as WLEDDevice
                                                            const currentSegments = d.segments || []
                                                            const segments = [...currentSegments, { id: currentSegments.length, name: `Segment ${currentSegments.length + 1}` }]
                                                            updateDevice(device.id, { segments } as any)
                                                        }}
                                                        className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                                                    >
                                                        + Segment Toevoegen
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {((device as WLEDDevice).segments || []).map((segment, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <div className="w-8 text-[10px] font-black opacity-20">{segment.id}</div>
                                                            <input
                                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                                value={segment.name}
                                                                placeholder="Segment Naam"
                                                                aria-label="Segment Naam"
                                                                onChange={e => {
                                                                    const d = device as WLEDDevice
                                                                    const segments = (d.segments || []).map((s, si) => si === idx ? { ...s, name: e.target.value } : s)
                                                                    updateDevice(device.id, { segments } as any)
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const d = device as WLEDDevice
                                                                    const segments = (d.segments || []).filter((_, si) => si !== idx)
                                                                    updateDevice(device.id, { segments } as any)
                                                                }}
                                                                className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                                                title="Verwijder segment"
                                                                aria-label="Verwijder segment"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            pocket
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {device.type === 'wiz' && (
                                            <div className="grid grid-cols-3 gap-4 mt-2">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-in (sec)</label>
                                                    <input
                                                        type="number" step="0.1" min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as WiZDevice).fadeInTime ?? 0.5}
                                                        title="Fade-in tijd in seconden"
                                                        placeholder="0.5"
                                                        onChange={e => updateDevice(device.id, { fadeInTime: parseFloat(e.target.value) || 0 } as any)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-out (sec)</label>
                                                    <input
                                                        type="number" step="0.1" min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as WiZDevice).fadeOutTime ?? 0.5}
                                                        title="Fade-out tijd in seconden"
                                                        placeholder="0.5"
                                                        onChange={e => updateDevice(device.id, { fadeOutTime: parseFloat(e.target.value) || 0 } as any)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Kleur-tijd (sec)</label>
                                                    <input
                                                        type="number" step="0.1" min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as WiZDevice).transitionTime ?? 0.5}
                                                        title="Kleur-transitie tijd in seconden"
                                                        placeholder="0.5"
                                                        onChange={e => updateDevice(device.id, { transitionTime: parseFloat(e.target.value) || 0 } as any)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {device.type === 'videowall_agent' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Poort</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                            value={(device as VideoWallAgentDevice).port || 3000}
                                                            title="Netwerk Poort"
                                                            placeholder="3000"
                                                            onChange={e => updateDevice(device.id, { port: parseInt(e.target.value) } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Model</label>
                                                        <select
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                            value={(device as VideoWallAgentDevice).model}
                                                            title="VideoWall Model"
                                                            onChange={e => updateDevice(device.id, { model: e.target.value as any } as any)}
                                                        >
                                                            <option value="4-screen" className="bg-background">4 Schermen</option>
                                                            <option value="9-screen" className="bg-background">9 Schermen</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Orientatie</label>
                                                        <select
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                            value={(device as VideoWallAgentDevice).orientation}
                                                            title="Scherm Oriëntatie"
                                                            onChange={e => updateDevice(device.id, { orientation: e.target.value as any } as any)}
                                                        >
                                                            <option value="landscape" className="bg-background">Landscape</option>
                                                            <option value="portrait" className="bg-background">Portrait</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Layout</label>
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                        {((device as VideoWallAgentDevice).model === '4-screen' ? LAYOUTS_4 : LAYOUTS_9).map(layout => (
                                                            <button
                                                                key={layout}
                                                                onClick={() => updateDevice(device.id, { layout } as any)}
                                                                className={cn(
                                                                    "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                                                    (device as VideoWallAgentDevice).layout === layout
                                                                        ? "bg-primary text-black border-primary"
                                                                        : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                                                                )}
                                                            >
                                                                {layout}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 mt-2">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-In (sec)</label>
                                                        <input
                                                            type="number" step="0.1" min="0"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                            value={(device as VideoWallAgentDevice).fadeInTime ?? 0.5}
                                                            title="Fade-In tijd in seconden"
                                                            placeholder="0.5"
                                                            onChange={e => updateDevice(device.id, { fadeInTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-Out (sec)</label>
                                                        <input
                                                            type="number" step="0.1" min="0"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                            value={(device as VideoWallAgentDevice).fadeOutTime ?? 0.5}
                                                            title="Fade-Out tijd in seconden"
                                                            placeholder="0.5"
                                                            onChange={e => updateDevice(device.id, { fadeOutTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Crossover (sec)</label>
                                                        <input
                                                            type="number" step="0.1" min="0"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                            value={(device as VideoWallAgentDevice).crossoverTime ?? 1.0}
                                                            title="Crossover tijd in seconden"
                                                            placeholder="1.0"
                                                            onChange={e => updateDevice(device.id, { crossoverTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1 block">Repeat</label>
                                                        <button
                                                            onClick={() => updateDevice(device.id, { repeat: !(device as VideoWallAgentDevice).repeat } as any)}
                                                            className={cn(
                                                                "w-full px-3 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2",
                                                                (device as VideoWallAgentDevice).repeat
                                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                                    : "bg-white/5 text-white/40 border-white/10"
                                                            )}
                                                        >
                                                            <RefreshCw className={cn("w-3.5 h-3.5", (device as VideoWallAgentDevice).repeat && "animate-spin-slow")} />
                                                            {(device as VideoWallAgentDevice).repeat ? 'Aan' : 'Uit'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Bezel / Scherm Ruimte (px)</label>
                                                        <span className="text-[10px] font-mono opacity-60">{(device as VideoWallAgentDevice).bezelSize ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="20"
                                                        step="1"
                                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                        value={(device as VideoWallAgentDevice).bezelSize ?? 0}
                                                        onChange={e => updateDevice(device.id, { bezelSize: parseInt(e.target.value) } as any)}
                                                        title="Bezel / Ruimte tussen schermen"
                                                    />
                                                    <p className="text-[9px] opacity-30 italic px-1">
                                                        Dit beïnvloedt de weergave in de preview zodat je rekening kunt houden met de fysieke randen van de schermen.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {
                                            device.type === 'remote_ledwall' && (
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Breedte</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                            value={(device as RemoteLedwallDevice).width}
                                                            title="Breedte"
                                                            placeholder="1920"
                                                            aria-label="Breedte"
                                                            onChange={e => updateDevice(device.id, { width: parseInt(e.target.value) } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Hoogte</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                            value={(device as RemoteLedwallDevice).height}
                                                            title="Hoogte"
                                                            placeholder="1080"
                                                            aria-label="Hoogte"
                                                            onChange={e => updateDevice(device.id, { height: parseInt(e.target.value) } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Orientatie</label>
                                                        <select
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                            value={(device as RemoteLedwallDevice).orientation}
                                                            aria-label="Orientatie"
                                                            title="Scherm Oriëntatie"
                                                            onChange={e => updateDevice(device.id, { orientation: e.target.value as any } as any)}
                                                        >
                                                            <option value="landscape" className="bg-[#1a1a1a]">Landscape</option>
                                                            <option value="portrait" className="bg-[#1a1a1a]">Portrait</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        < div className="flex items-center justify-between pt-2" >
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateDevice(device.id, { enabled: !device.enabled })}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${device.enabled ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground border border-white/10'}`}
                                                >
                                                    {device.enabled ? 'Actief' : 'Gedeactiveerd'}
                                                </button>
                                                <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => handleTestDevice(device)}
                                                        className="px-3 py-1.5 hover:bg-white/10 text-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all"
                                                        title="Start Test"
                                                    >
                                                        <Play className="w-3 h-3" /> Test
                                                    </button>

                                                    {device.type === 'local_monitor' && (
                                                        <>
                                                            <div className="w-px bg-white/10" />
                                                            <button
                                                                onClick={() => handleStopTest(device)}
                                                                className="px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all"
                                                                title="Stop Test"
                                                            >
                                                                <StopCircle className="w-3 h-3" />
                                                            </button>
                                                            <div className="w-px bg-white/10" />
                                                            <button
                                                                onClick={() => handleMuteTest(device, true)}
                                                                className="px-2 py-1.5 hover:bg-white/10 text-white/60 hover:text-white transition-all border-l border-white/10"
                                                                title="Dempen"
                                                            >
                                                                <VolumeX className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="flex items-center gap-0.5 bg-black/40 px-1 border-l border-white/10">
                                                                <button
                                                                    onClick={() => handleVolumeTest(device, -10)}
                                                                    className="w-6 h-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all text-sm font-bold"
                                                                    title="Volume Omlaag"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="text-[9px] font-mono tabular-nums opacity-60 w-6 text-center">{testVolumes[device.id] ?? 100}%</span>
                                                                <button
                                                                    onClick={() => handleVolumeTest(device, 10)}
                                                                    className="w-6 h-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all text-sm font-bold"
                                                                    title="Volume Omhoog"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleMuteTest(device, false)}
                                                                className="px-2 py-1.5 hover:bg-white/10 text-white/60 hover:text-white transition-all border-l border-white/10"
                                                                title="Geluid Aan"
                                                            >
                                                                <Volume2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openModal({
                                                        title: 'Apparaat Verwijderen',
                                                        message: `Weet je zeker dat je apparaat "${device.name}" wilt verwijderen?`,
                                                        type: 'confirm',
                                                        onConfirm: () => deleteDevice(device.id)
                                                    })
                                                }}
                                                className="px-3 py-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                                title="Verwijder apparaat"
                                            >
                                                <Trash2 className="w-3 h-3" /> Verwijderen
                                            </button>
                                        </div>
                                        {/* Collapse Bar */}
                                        <div
                                            className="h-4 flex items-center justify-center bg-black/20 hover:bg-black/40 cursor-pointer -mb-4 opacity-50 hover:opacity-100"
                                            onClick={() => setExpandedDevice(null)}
                                        >
                                            <ChevronDown className="w-3 h-3 rotate-180" />
                                        </div>
                                    </div>
                                )
                                }
                            </div >
                        )
                    })
                )}
            </div >
        </div >
    )
}

export default DevicesSettings
