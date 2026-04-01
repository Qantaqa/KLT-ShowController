import React, { useState } from 'react'
import { Plus, Trash2, Settings2, Monitor, Wifi, Tv, ChevronDown, Radar, RefreshCw, Play, X, StopCircle, Save, Upload, ExternalLink, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useSequencerStore } from '../store/useSequencerStore'
import type { Device, DeviceType, RemoteVideoWallDevice, WiZDevice, VideoWallAgentDevice, WLEDDevice, LocalMonitorDevice } from '../types/devices'
import { StartMediaPlayer, StopMediaPlayer, SetVolumeMediaPlayer } from '../services/media-player-service'
import { videoWallAgentService } from '../services/videowall-agent-service'
import { TurnOnWiz, SetWizColor, TurnOffWiz } from '../services/wiz-service'

const LAYOUTS_4 = ['2x2', '1x1', '1x2', '1x3', '1x4', '4x1', '3x1', '2x1'];
const LAYOUTS_9 = ['1x1', '1x2', '1x3', '1x4', '2x1', '2x2', '2x3', '2x4', '3x1', '3x2', '3x3', '4x1', '4x2'];

interface DevicesSettingsProps {
    devices: Device[]
    onChange: (devices: Device[]) => void
}

const DevicesSettings: React.FC<DevicesSettingsProps> = ({ devices, onChange }) => {
    const { openModal, addToast, deviceAvailability, activeTransfers } = useSequencerStore()

    const updateDevice = (id: string, partial: Partial<Device>) => {
        onChange(devices.map(d => d.id === id ? { ...d, ...partial } : d) as Device[])
    }

    const deleteDevice = (id: string) => {
        onChange(devices.filter(d => d.id !== id))
    }

    const [expandedDevice, setExpandedDevice] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResults, setScanResults] = useState<any[]>([])
    const [scanProgress, setScanProgress] = useState<{ status: string, progress: number, found: number } | null>(null)
    const [displays, setDisplays] = useState<any[]>([])
    const [unreachableDevices, setUnreachableDevices] = useState<Set<string>>(new Set())
    const [processedScanResults, setProcessedScanResults] = useState<Set<string>>(new Set())
    const [testVolumes, setTestVolumes] = useState<Record<string, number>>({})
    const [latestAgentVersion, setLatestAgentVersion] = useState<string>('1.0.0')
    const [updateStatuses, setUpdateStatuses] = useState<Record<string, string>>({})
    const [isReadingConfig, setIsReadingConfig] = useState<string | null>(null)
    const [activeTests, setActiveTests] = useState<Record<string, any>>({})


    // Cleanup active tests on unmount
    React.useEffect(() => {
        return () => {
            Object.values(activeTests).forEach(timer => clearInterval(timer))
        }
    }, [activeTests])

    const handleReadWledConfig = async (device: any) => {
        if (!(window as any).require) return;
        const { ipcRenderer } = (window as any).require('electron');

        setIsReadingConfig(device.id);
        try {
            const result = await ipcRenderer.invoke('wled:read-config', { ip: device.ip, deviceId: device.id });
            if (result.success) {
                addToast(`Segmenten van ${device.name} succesvol opgeslagen`, "info");
                // Update segments in state
                const segments = result.segments.map((s: any) => ({
                    id: s.id,
                    name: s.n || `Segment ${s.id} `,
                    start: s.start,
                    stop: s.stop,
                    offset: s.of || 0,
                    group: s.grp || 1,
                    spc: s.spc || 0,
                    rev: s.rev || false,
                    mi: s.mi || false,
                    bri: s.bri
                }));
                updateDevice(device.id, { segments });
            } else {
                addToast(result.error || "Fout bij het lezen van segmenten", "error");
            }
        } catch (e: any) {
            addToast(`Fout: ${e.message} `, "error");
        } finally {
            setIsReadingConfig(null);
        }
    };

    const handleApplyWledConfig = async (device: any) => {
        if (!(window as any).require) return;
        const { ipcRenderer } = (window as any).require('electron');

        setIsReadingConfig(device.id);
        try {
            const payload = {
                seg: device.segments.map((s: any) => ({
                    id: s.id,
                    start: s.start,
                    stop: s.stop,
                    of: s.offset,
                    grp: s.group,
                    spc: s.spc,
                    rev: s.rev,
                    mi: s.mi
                }))
            };
            await ipcRenderer.invoke('wled:send-command', { ip: device.ip, payload });
            addToast(`Configuratie toegepast op ${device.name} `, "info");
        } catch (e: any) {
            addToast(`Fout bij toepassen: ${e.message} `, "error");
        } finally {
            setIsReadingConfig(null);
        }
    };

    const updateWledSegment = (deviceId: string, segmentId: number, partial: any) => {
        const device = devices.find(d => d.id === deviceId) as any;
        if (!device || !device.segments) return;

        const newSegments = device.segments.map((s: any) =>
            s.id === segmentId ? { ...s, ...partial } : s
        );
        updateDevice(deviceId, { segments: newSegments });
    };

    React.useEffect(() => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            ipcRenderer.invoke('get-displays').then(setDisplays)

            // Get latest agent version from local files
            videoWallAgentService.getLatestAgentVersion().then(setLatestAgentVersion)
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
                const currentDevices = useSequencerStore.getState().appSettings.devices || []
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
                const agentResults = results.filter(r => r.type === 'VideoWall_agent');
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
        const currentDevices = useSequencerStore.getState().appSettings.devices || [];
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

            if (device.type === 'VideoWall_agent') {
                if (!isAuto || existingDevice.name.startsWith('VideoWall') || existingDevice.name.startsWith('TestWall')) {
                    updates.name = device.name || existingDevice.name;
                }
                (updates as any).model = device.details?.model || (existingDevice as any).model;
                (updates as any).layout = device.details?.layout || (existingDevice as any).layout;
                (updates as any).orientation = device.details?.orientation || (existingDevice as any).orientation;
                (updates as any).port = device.details?.port || (existingDevice as any).port || 3003;
            }

            if (device.type === 'wled') {
                const segmentCount = device.details?.leds?.segs?.length || 1;
                const segments = Array.from({ length: segmentCount }, (_, i) => ({
                    id: i,
                    name: device.details?.leds?.segs?.[i]?.n || `Segment ${i} `
                }));
                (updates as any).segments = segments;
            }

            const hasChanges = (existingDevice as any).ip !== device.ip ||
                ((updates as any).name && (existingDevice as any).name !== (updates as any).name) ||
                (device.type === 'VideoWall_agent' && (
                    (existingDevice as any).model !== (updates as any).model ||
                    (existingDevice as any).layout !== (updates as any).layout ||
                    (existingDevice as any).orientation !== (updates as any).orientation
                ));

            if (hasChanges || !isAuto) {
                updateDevice(existingDevice.id, updates)
                if (isAuto && hasChanges) {
                    addToast(`VideoWall "${existingDevice.name}" automatisch bijgewerkt naar ${device.ip} `, "info");
                } else if (!isAuto) {
                    addToast(`${existingDevice.name} bijgewerkt`, "info");
                }
            }
        } else {
            // Add new
            const id = `device_${Date.now()} `
            let newDevice: Device | null = null;

            if (device.type === 'wled') {
                const segmentCount = device.details?.leds?.segs?.length || 1;
                const segments = Array.from({ length: segmentCount }, (_, i) => ({
                    id: i,
                    name: device.details?.leds?.segs?.[i]?.n || `Segment ${i} `,
                    start: device.details?.leds?.segs?.[i]?.start || 0,
                    stop: device.details?.leds?.segs?.[i]?.stop || 0,
                    offset: device.details?.leds?.segs?.[i]?.of || 0,
                    group: device.details?.leds?.segs?.[i]?.grp || 1,
                    spc: device.details?.leds?.segs?.[i]?.spc || 0,
                    rev: device.details?.leds?.segs?.[i]?.rev || false,
                    mi: device.details?.leds?.segs?.[i]?.mi || false
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
            } else if (device.type === 'VideoWall_agent') {
                newDevice = {
                    id,
                    name: device.name || 'VideoWall Agent',
                    type: 'videowall_agent',
                    enabled: true,
                    ip: device.ip,
                    port: device.details?.port || 3003,
                    mac: device.mac,
                    model: device.details?.model || '4-screen',
                    layout: device.details?.layout || '2x2',
                    orientation: device.details?.orientation || 'landscape'
                }
            }

            if (newDevice) {
                onChange([...devices, newDevice])
                if (isAuto) {
                    addToast(`Nieuwe VideoWall "${newDevice.name}" automatisch toegevoegd`, "info");
                } else {
                    addToast(`${newDevice.name} toegevoegd`, "info");
                }
                setProcessedScanResults(prev => new Set([...prev, device.ip]))
            }
        }
    }

    const handleIgnoreScanResult = (ip: string) => {
        setProcessedScanResults(prev => new Set([...prev, ip]))
    }

    const handleAddDevice = (type: DeviceType) => {
        const id = `device_${Date.now()} `
        let newDevice: Device

        switch (type) {
            case 'wled':
                newDevice = { id, name: 'Nieuwe WLED', type, enabled: true, ip: '', segments: [] }
                break
            case 'wiz':
                newDevice = { id, name: 'Nieuwe WiZ', type, enabled: true, ip: '' }
                break
            case 'local_monitor':
                newDevice = { id, name: 'Lokale Monitor', type, enabled: true, monitorId: 1, fadeInTime: 0.5, fadeOutTime: 0.5, crossoverTime: 0 }
                break
            case 'remote_VideoWall':
                newDevice = { id, name: 'Remote VideoWall', type, enabled: true, ip: '', width: 1920, height: 1080, orientation: 'landscape' }
                break
            case 'videowall_agent':
                newDevice = { id, name: 'Nieuwe VideoWall Agent', type, enabled: true, ip: '', port: 3003, model: '4-screen', layout: '2x2', orientation: 'landscape' }
                break
        }

        onChange([...devices, newDevice])
        setExpandedDevice(id)
    }

    const handleTestDevice = async (device: Device) => {
        if (activeTests[device.id]) {
            handleStopTest(device);
            return;
        }

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')

            if (device.type === 'local_monitor') {
                const monitor = device as LocalMonitorDevice;
                const testVideoPath = await ipcRenderer.invoke('get-test-video-path');
                if (testVideoPath) {
                    const fadeInTime = ((monitor.fadeInTime ?? monitor.transitionTime) || 0.5) * 1000;
                    const transitionTime = ((monitor.fadeInTime ?? monitor.transitionTime) || 0.5) * 1000;

                    await StartMediaPlayer(device, testVideoPath, true, 100, fadeInTime, undefined, transitionTime);
                    setTestVolumes(prev => ({ ...prev, [device.id]: 100 }))
                    addToast(`Test gestart op monitor: ${device.name} `, "info");
                } else {
                    addToast("Test video bestand niet gevonden!", "error");
                }
            } else if (device.type === 'wiz') {
                const wiz = device as WiZDevice;
                addToast(`Continue WiZ test gestart: ${device.name} `, "info");

                const runWizTest = async () => {
                    const r = Math.floor(Math.random() * 256);
                    const g = Math.floor(Math.random() * 256);
                    const b = Math.floor(Math.random() * 256);
                    try {
                        await TurnOnWiz(wiz, 100);
                        await SetWizColor(wiz, r, g, b);
                    } catch (e) {
                        console.error('WiZ test step failed', e);
                    }
                }

                runWizTest();
                const timer = setInterval(runWizTest, 5000);
                setActiveTests(prev => ({ ...prev, [device.id]: timer }));

            } else if (device.type === 'wled') {
                const wled = device as WLEDDevice;
                addToast(`Continue WLED test gestart: ${device.name} `, "info");

                // Get effects and palettes count/list if possible, or just use reasonable random ranges
                let fxCount = 100; // Fallback
                let palCount = 50;  // Fallback

                try {
                    const info = await ipcRenderer.invoke('wled:get-info', wled.ip);
                    if (info && info.effects) fxCount = info.effects.length;
                    if (info && info.palettes) palCount = info.palettes.length;
                } catch (e) {
                    console.log('Could not fetch WLED info for counts, using defaults');
                }

                const runWledTest = async () => {
                    // Create random command for segments
                    const segs = wled.segments?.length > 0 ? wled.segments : [{ id: 0 }];
                    const payload = {
                        on: true,
                        bri: 255,
                        seg: segs.map((s: any) => ({
                            id: s.id,
                            fx: Math.floor(Math.random() * fxCount),
                            pal: Math.floor(Math.random() * palCount),
                            sx: 128,
                            ix: 128
                        }))
                    };
                    try {
                        await ipcRenderer.invoke('wled:send-command', { ip: wled.ip, payload });
                    } catch (e) {
                        console.error('WLED test step failed', e);
                    }
                }

                runWledTest();
                const timer = setInterval(runWledTest, 5000);
                setActiveTests(prev => ({ ...prev, [device.id]: timer }));

            } else if (device.type === 'videowall_agent') {
                const testVideoPath = await ipcRenderer.invoke('get-test-video-path');
                if (testVideoPath) {
                    await StartMediaPlayer(device, testVideoPath, true, 100, 500, undefined, 500);
                    setTestVolumes(prev => ({ ...prev, [device.id]: 100 }))
                    addToast(`Test video gestuurd naar agent: ${device.name} `, "info");
                } else {
                    addToast("Test video bestand niet gevonden!", "error");
                }
            } else {
                await ipcRenderer.invoke('test-device', device)
            }
        }
    }

    const handleStopTest = (device: Device) => {
        if (activeTests[device.id]) {
            clearInterval(activeTests[device.id]);
            setActiveTests(prev => {
                const next = { ...prev };
                delete next[device.id];
                return next;
            });

            if (device.type === 'wiz') {
                TurnOffWiz(device as WiZDevice).catch(() => { });
            } else if (device.type === 'wled') {
                if ((window as any).require) {
                    const { ipcRenderer } = (window as any).require('electron');
                    ipcRenderer.invoke('wled:send-command', { ip: (device as any).ip, payload: { on: false } }).catch(() => { });
                }
            }

            addToast(`Test gestopt voor ${device.name} `, "info");
        }

        if (device.type === 'videowall_agent' || device.type === 'local_monitor') {
            StopMediaPlayer(device, 500);
        }
    }

    const handleVolumeTest = (device: Device, delta: number) => {
        const currentVol = testVolumes[device.id] ?? 100
        const newVol = Math.max(0, Math.min(100, currentVol + delta))
        setTestVolumes(prev => ({ ...prev, [device.id]: newVol }))
        SetVolumeMediaPlayer(device, newVol);
    }

    const handleUpdateAgent = async (device: VideoWallAgentDevice) => {
        const success = await videoWallAgentService.updateAgent(device, (status) => {
            setUpdateStatuses(prev => ({ ...prev, [device.id]: status }));
        });

        if (success) {
            addToast(`Update succesvol verzonden naar ${device.name}. Wacht tot deze herstart.`, "info");
            setTimeout(() => {
                setUpdateStatuses(prev => {
                    const next = { ...prev };
                    delete next[device.id];
                    return next;
                });
            }, 5000);
        } else {
            addToast(`Update van ${device.name} mislukt!`, "error");
        }
    }

    const handleRestartAgent = (device: VideoWallAgentDevice) => {
        openModal({
            title: 'Agent Herstarten',
            message: `Agent "${device.name}" herstarten? De start.sh loop herstart de agent automatisch.`,
            type: 'confirm',
            onConfirm: async () => {
                const ok = await videoWallAgentService.restartAgent(device);
                addToast(ok ? `Agent ${device.name} wordt herstart...` : `Herstart van ${device.name} mislukt!`, ok ? "info" : "error");
            }
        });
    }

    const handleShutdownHost = (device: VideoWallAgentDevice) => {
        openModal({
            title: '⚠️ Host Afsluiten',
            message: `De Linux host van "${device.name}" afsluiten? Dit kan niet ongedaan worden gemaakt. De machine wordt uitgeschakeld.`,
            type: 'confirm',
            onConfirm: async () => {
                const ok = await videoWallAgentService.shutdownHost(device);
                addToast(ok ? `Host van ${device.name} wordt afgesloten...` : `Afsluiten van ${device.name} mislukt!`, ok ? "info" : "error");
            }
        });
    }


    const renderDeviceIcon = (type: DeviceType) => {
        switch (type) {
            case 'wled': return <Wifi className="w-4 h-4" />
            case 'wiz': return <Wifi className="w-4 h-4 text-info" />
            case 'local_monitor': return <Monitor className="w-4 h-4" />
            case 'remote_VideoWall': return <Tv className="w-4 h-4" />
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
                    <button onClick={() => handleAddDevice('wled')} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> WLED
                    </button>
                    <button onClick={() => handleAddDevice('wiz')} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> WiZ
                    </button>
                    <button onClick={() => handleAddDevice('local_monitor')} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> Monitor
                    </button>
                    <button onClick={() => handleAddDevice('videowall_agent')} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> Agent
                    </button>
                    <button onClick={() => handleAddDevice('remote_VideoWall')} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Plus className="w-3 h-3" /> VideoWall
                    </button>
                </div>
            </div>

            {scanResults.length > 0 && (
                <div className="space-y-2 mb-4">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest px-1">Gevonden Apparaten</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {scanResults.filter(r => !processedScanResults.has(r.ip)).map((result, idx) => {
                            const existing = (devices || []).find(d => (d.mac && result.mac && d.mac === result.mac) || ((d as any).ip === result.ip));
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
                                        <button onClick={() => handleIgnoreScanResult(result.ip)} className="p-2 text-muted-foreground hover:text-white rounded-lg transition-colors" title="Negeren"><X className="w-4 h-4" /></button>
                                        <button onClick={() => handleAddFromScan(result)} className={`p - 2 rounded - lg transition - colors ${existing ? 'bg-warning/20 text-warning hover:bg-warning hover:text-white' : 'bg-primary text-primary-foreground hover:bg-white shadow-lg shadow-primary/20'} `} title={existing ? "Bijwerken" : "Toevoegen"}>
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
                        const isUnreachable = unreachableDevices.has(device.id);
                        const isExpanded = expandedDevice === device.id;

                        return (
                            <div key={device.id} className={cn(
                                "rounded-2xl border overflow-hidden transition-colors relative transition-all",
                                !device.enabled ? "bg-black/40 border-white/5 opacity-70" : "glass bg-white/5",
                                isUnreachable ? "border-destructive/50" : "border-white/10"
                            )}>
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {!device.enabled && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-white/5 text-white/40 rounded">Disabled</span>}
                                    <span className="text-[9px] font-black opacity-20 uppercase px-1.5 py-0.5 bg-white/10 rounded pointer-events-none">{device.type}</span>
                                </div>

                                <div className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpandedDevice(isExpanded ? null : device.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w - 8 h - 8 rounded - lg flex items - center justify - center ${device.enabled ? 'bg-primary/20 text-primary' : 'bg-white/5 opacity-40'} `}>{renderDeviceIcon(device.type)}</div>
                                        <div className="flex-1 pr-4">
                                            <div className="text-sm font-bold flex items-center gap-2">
                                                {device.name}
                                                {device.type === 'videowall_agent' && (device as any).version && (
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider transition-all",
                                                        (device as any).version < latestAgentVersion ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse" : "bg-white/5 text-white/30 border border-white/10"
                                                    )}>v{(device as any).version}{(device as any).version < latestAgentVersion && " • Update Beschikbaar"}</span>
                                                )}
                                                {device.enabled && (
                                                    <div className={cn("w-1.5 h-1.5 rounded-full transition-all", (() => {
                                                        const availability = deviceAvailability[device.id]?.status || 'offline';
                                                        let isOnline = availability === 'online';
                                                        if (device.type === 'local_monitor') {
                                                            const monitorId = (device as LocalMonitorDevice).monitorId;
                                                            if (!displays.some(d => d.index === monitorId)) isOnline = false;
                                                        }
                                                        return isOnline ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500 animate-pulse";
                                                    })())} />
                                                )}
                                            </div>
                                            <div className="text-[10px] opacity-40 flex items-center gap-2 mt-0.5">
                                                {device.type === 'local_monitor' ? (() => {
                                                    const monitorId = (device as LocalMonitorDevice).monitorId;
                                                    const disp = displays.find(d => d.index === monitorId);
                                                    return disp ? `Scherm ${monitorId + 1}: ${disp.isPrimary ? '(Hoofdscherm) ' : ''}${disp.bounds.width}x${disp.bounds.height} ` : `Scherm ${monitorId + 1}: (Niet verbonden)`;
                                                })() : (device as any).ip || 'Geen IP opgegeven'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const transfers = Object.values(activeTransfers).filter(t => t.deviceId === device.id);
                                    if (transfers.length === 0) return null;
                                    const t = transfers[0];
                                    const barColor = t.status === 'error' ? 'bg-red-500' : t.status === 'complete' || t.status === 'skipped' ? 'bg-green-500' : 'bg-amber-400';
                                    const label = t.status === 'checking' ? 'Controleren...' : t.status === 'uploading' ? `Uploaden: ${t.filename} ` : t.status === 'complete' ? `Voltooid: ${t.filename} ` : t.status === 'skipped' ? `Al aanwezig: ${t.filename} ` : `Fout: ${t.error || t.filename} `;
                                    return (
                                        <div className="px-4 pb-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-amber-300/80 uppercase tracking-wider">⬆ {label}</span>
                                                <span className="text-[10px] font-mono text-white/40">{t.percent}%</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className={cn("progress-bar-fill", barColor)} ref={el => el?.style.setProperty('--percent', `${t.percent}% `)} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {!isExpanded && (
                                    <div className="h-6 w-full flex items-center justify-center bg-black/20 hover:bg-black/40 cursor-pointer border-t border-white/5 group" onClick={() => setExpandedDevice(device.id)}>
                                        <ChevronDown className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}

                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                                        <div className={cn("grid gap-4", device.type === 'videowall_agent' ? "grid-cols-3" : "grid-cols-2")}>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Naam</label>
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                    value={device.name}
                                                    title="Apparaat Naam"
                                                    placeholder="Naam"
                                                    onChange={e => updateDevice(device.id, { name: e.target.value })}
                                                />
                                            </div>
                                            {device.type !== 'local_monitor' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">IP Adres</label>
                                                    <input
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as any).ip || ''}
                                                        title="IP Adres"
                                                        placeholder="192.168.1.10"
                                                        onChange={e => updateDevice(device.id, { ip: e.target.value } as any)}
                                                    />
                                                </div>
                                            )}
                                            {device.type === 'videowall_agent' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Poort</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as VideoWallAgentDevice).port || 3003}
                                                        title="Configuratie Poort"
                                                        placeholder="3003"
                                                        onChange={e => updateDevice(device.id, { port: parseInt(e.target.value) || 3003 } as any)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {device.type === 'wled' && (
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                            <RefreshCw className={cn("w-5 h-5", isReadingConfig === device.id && "animate-spin")} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-primary uppercase tracking-widest">WLED Segmenten</div>
                                                            <div className="text-[10px] text-white/40 mt-0.5">Lees de huidige configuratie van het apparaat en sla deze op voor auto-herstel na herstart.</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const ip = ((device as any).ip || '').trim()
                                                                if (!ip) {
                                                                    addToast('Vul eerst een IP adres in.', 'warning')
                                                                    return
                                                                }
                                                                window.open(`http://${ip}:80`, '_blank', 'noopener,noreferrer')
                                                            }}
                                                            className="px-4 py-2 bg-black/30 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] rounded-lg tracking-widest transition-all flex items-center gap-2"
                                                            title="Open WLED URL in browser"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5 text-green-400" />
                                                            Open URL
                                                        </button>
                                                        <button
                                                            onClick={() => handleReadWledConfig(device)}
                                                            disabled={isReadingConfig === device.id}
                                                            className="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-black font-black uppercase text-[10px] rounded-lg tracking-widest transition-all disabled:opacity-50"
                                                        >
                                                            {isReadingConfig === device.id ? 'Lezen...' : 'Lees van Apparaat'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleApplyWledConfig(device)}
                                                            disabled={isReadingConfig === device.id}
                                                            className="px-4 py-2 bg-primary hover:bg-white text-black font-black uppercase text-[10px] rounded-lg tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            <Save className="w-3 h-3" /> Toepassen
                                                        </button>
                                                    </div>
                                                </div>

                                                {(device as any).segments && (device as any).segments.length > 0 && (
                                                    <div className="border border-white/10 rounded-xl overflow-hidden">
                                                        <table className="w-full text-[10px] text-left">
                                                            <thead>
                                                                <tr className="bg-white/5 uppercase tracking-wider font-bold text-white/40 border-b border-white/10">
                                                                    <th className="px-3 py-2">#</th>
                                                                    <th className="px-3 py-2">Start</th>
                                                                    <th className="px-3 py-2">Stop</th>
                                                                    <th className="px-3 py-2">Offset</th>
                                                                    <th className="px-3 py-2">Group</th>
                                                                    <th className="px-3 py-2">Space</th>
                                                                    <th className="px-3 py-2">Rev</th>
                                                                    <th className="px-3 py-2">Mir</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {(device as any).segments.map((seg: any) => (
                                                                    <tr key={seg.id} className="hover:bg-white/[0.02] transition-colors">
                                                                        <td className="px-3 py-2 font-mono text-white/60">{seg.id}</td>
                                                                        <td className="px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-1 outline-none focus:border-primary/40"
                                                                                value={seg.start}
                                                                                title="Start LED"
                                                                                placeholder="0"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { start: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-1 outline-none focus:border-primary/40"
                                                                                value={seg.stop}
                                                                                title="Stop LED"
                                                                                placeholder="0"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { stop: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-1 outline-none focus:border-primary/40"
                                                                                value={seg.offset}
                                                                                title="Offset"
                                                                                placeholder="0"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { offset: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-1 outline-none focus:border-primary/40"
                                                                                value={seg.group}
                                                                                title="Groepering"
                                                                                placeholder="1"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { group: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1">
                                                                            <input
                                                                                type="number"
                                                                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-1 outline-none focus:border-primary/40"
                                                                                value={seg.spc}
                                                                                title="Spatiëring"
                                                                                placeholder="0"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { spc: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-3 h-3 accent-primary"
                                                                                checked={seg.rev}
                                                                                title="Omkeren"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { rev: e.target.checked })}
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-3 h-3 accent-primary"
                                                                                checked={seg.mi}
                                                                                title="Spiegelen"
                                                                                onChange={(e) => updateWledSegment(device.id, seg.id, { mi: e.target.checked })}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {device.type === 'videowall_agent' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        onClick={() => {
                                                            const ip = ((device as VideoWallAgentDevice).ip || '').trim()
                                                            const port = (device as VideoWallAgentDevice).port || 3003
                                                            if (!ip) {
                                                                addToast('Vul eerst een IP adres in.', 'warning')
                                                                return
                                                            }
                                                            window.open(`http://${ip}:${port}`, '_blank', 'noopener,noreferrer')
                                                        }}
                                                        className="h-8 px-3 rounded-xl bg-black/40 border border-white/15 flex items-center gap-2 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white"
                                                        title="Open agent URL in browser"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-green-400" />
                                                        Open URL
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
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
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Layout</label>
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                        {((device as VideoWallAgentDevice).model === '4-screen' ? LAYOUTS_4 : LAYOUTS_9).map(layout => (
                                                            <button key={layout} onClick={() => updateDevice(device.id, { layout } as any)} className={cn("px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all", (device as VideoWallAgentDevice).layout === layout ? "bg-primary text-black border-primary" : "bg-white/5 text-white/40 border-white/10")}>{layout}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 mt-2">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-In</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                            value={(device as VideoWallAgentDevice).fadeInTime ?? 0.5}
                                                            title="Fade-In Tijd (sec)"
                                                            placeholder="0.5"
                                                            onChange={e => updateDevice(device.id, { fadeInTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-Out</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                            value={(device as VideoWallAgentDevice).fadeOutTime ?? 0.5}
                                                            title="Fade-Out Tijd (sec)"
                                                            placeholder="0.5"
                                                            onChange={e => updateDevice(device.id, { fadeOutTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Crossover</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                            value={(device as VideoWallAgentDevice).crossoverTime ?? 1.0}
                                                            title="Crossover Tijd (sec)"
                                                            placeholder="1.0"
                                                            onChange={e => updateDevice(device.id, { crossoverTime: parseFloat(e.target.value) || 0 } as any)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Agent Update Action — always visible for videowall_agent */}
                                                {(() => {
                                                    const agentVersion = (device as any).version;
                                                    const hasUpdate = agentVersion && agentVersion < latestAgentVersion;
                                                    return (
                                                        <div className={`mt-4 p-4 rounded-xl flex items-center justify-between group ${hasUpdate ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUpdate ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/40'}`}>
                                                                    <RefreshCw className={cn("w-5 h-5", updateStatuses[device.id] && "animate-spin")} />
                                                                </div>
                                                                <div>
                                                                    <div className={`text-xs font-bold uppercase tracking-widest ${hasUpdate ? 'text-amber-500' : 'text-white/40'}`}>
                                                                        {hasUpdate ? 'Update Beschikbaar' : 'Agent Software'}
                                                                    </div>
                                                                    <div className="text-[10px] text-white/40 mt-0.5">
                                                                        {updateStatuses[device.id] || (hasUpdate
                                                                            ? `Nieuwe versie v${latestAgentVersion} is klaar.`
                                                                            : agentVersion
                                                                                ? `Versie v${agentVersion} (actueel) — v${latestAgentVersion} opnieuw installeren`
                                                                                : `v${latestAgentVersion} pushen naar agent`
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateAgent(device as VideoWallAgentDevice)}
                                                                disabled={!!updateStatuses[device.id]}
                                                                className={`px-4 py-2 font-black uppercase text-[10px] rounded-lg tracking-widest transition-all disabled:opacity-50 ${hasUpdate ? 'bg-amber-500 hover:bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'}`}
                                                            >
                                                                {updateStatuses[device.id] ? 'Updating...' : hasUpdate ? 'Nu Bijwerken' : 'Herinstalleren'}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}

                                                <div className="space-y-2 mt-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Bezel (px)</label>
                                                        <span className="text-[10px] font-mono opacity-60">{(device as VideoWallAgentDevice).bezelSize ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="20"
                                                        step="1"
                                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                        value={(device as VideoWallAgentDevice).bezelSize ?? 0}
                                                        title="Bezel Grootte"
                                                        onChange={e => updateDevice(device.id, { bezelSize: parseInt(e.target.value) } as any)}
                                                    />
                                                </div>

                                                {/* Media Upload Section */}
                                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <Upload className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-primary uppercase tracking-widest">Media Uploaden</div>
                                                            <div className="text-[10px] text-white/40 mt-0.5">Upload videobestanden rechtstreeks naar deze agent.</div>
                                                        </div>
                                                    </div>
                                                    <label className="flex items-center justify-center gap-3 px-4 py-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-black font-black uppercase text-[10px] rounded-lg tracking-widest transition-all cursor-pointer">
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Bestanden Kiezen &amp; Uploaden
                                                        <input
                                                            type="file"
                                                            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                                            multiple
                                                            className="hidden"
                                                            title="Selecteer videobestanden om te uploaden"
                                                            onChange={async (e) => {
                                                                if (!e.target.files || e.target.files.length === 0) return;
                                                                const files = Array.from(e.target.files);
                                                                for (const file of files) {
                                                                    const filename = file.name;
                                                                    if ((window as any).require) {
                                                                        try {
                                                                            const { ipcRenderer } = (window as any).require('electron');
                                                                            const localPath = await ipcRenderer.invoke('get-media-path', filename);
                                                                            await videoWallAgentService.syncFileWithProgress(device as VideoWallAgentDevice, localPath, filename);
                                                                            addToast(`'${filename}' geüpload naar ${device.name}`, 'info');
                                                                        } catch (err: any) {
                                                                            addToast(`Upload fout: ${err.message}`, 'error');
                                                                        }
                                                                    }
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {device.type === 'remote_VideoWall' && (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Breedte</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                        value={(device as RemoteVideoWallDevice).width}
                                                        title="Breedte"
                                                        placeholder="1920"
                                                        onChange={e => updateDevice(device.id, { width: parseInt(e.target.value) } as any)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Hoogte</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                                                        value={(device as RemoteVideoWallDevice).height}
                                                        title="Hoogte"
                                                        placeholder="1080"
                                                        onChange={e => updateDevice(device.id, { height: parseInt(e.target.value) } as any)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Orientatie</label>
                                                    <select
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                        value={(device as RemoteVideoWallDevice).orientation}
                                                        title="Scherm Oriëntatie"
                                                        onChange={e => updateDevice(device.id, { orientation: e.target.value as any } as any)}
                                                    >
                                                        <option value="landscape" className="bg-[#1a1a1a]">Landscape</option>
                                                        <option value="portrait" className="bg-[#1a1a1a]">Portrait</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {device.type === 'local_monitor' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Monitor</label>
                                                    <select
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all appearance-none"
                                                        value={(device as LocalMonitorDevice).monitorId ?? 1}
                                                        onChange={e => updateDevice(device.id, { monitorId: parseInt(e.target.value) || 0 } as any)}
                                                        title="Welke monitor/projectie window"
                                                    >
                                                        {displays.map((d: any) => (
                                                            <option key={d.index} className="bg-[#1a1a1a]" value={d.index}>
                                                                Scherm {d.index + 1}{d.isPrimary ? ' (Hoofdscherm)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-in (s)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as LocalMonitorDevice).fadeInTime ?? (device as LocalMonitorDevice).transitionTime ?? 0.5}
                                                        onChange={e => updateDevice(device.id, { fadeInTime: parseFloat(e.target.value) || 0 } as any)}
                                                        title="Default fade-in tijd (gebruikt als event transition 0 is)"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Fade-out (s)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as LocalMonitorDevice).fadeOutTime ?? 0.5}
                                                        onChange={e => updateDevice(device.id, { fadeOutTime: parseFloat(e.target.value) || 0 } as any)}
                                                        title="Fade-out tijd bij stop"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Cross-over (s)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all font-mono"
                                                        value={(device as LocalMonitorDevice).crossoverTime ?? 0}
                                                        onChange={e => updateDevice(device.id, { crossoverTime: parseFloat(e.target.value) || 0 } as any)}
                                                        title="Extra overlap tijd vóór cleanup van de vorige player"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateDevice(device.id, { enabled: !device.enabled })}
                                                    className={cn(
                                                        "h-8 px-3 rounded-xl border flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest",
                                                        device.enabled
                                                            ? "border-green-500/40 text-green-300 bg-green-500/10 hover:bg-green-500/15"
                                                            : "border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/15"
                                                    )}
                                                    title={device.enabled ? 'Deactiveer' : 'Activeer'}
                                                >
                                                    <CheckCircle2 className={cn("w-3.5 h-3.5", device.enabled ? "text-green-400" : "text-red-400")} />
                                                    {device.enabled ? 'Actief' : 'Uit'}
                                                </button>
                                                <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => handleTestDevice(device)}
                                                        className={cn(
                                                            "px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                                            activeTests[device.id] ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "hover:bg-white/10 text-white"
                                                        )}
                                                        title={activeTests[device.id] ? "Stop Test" : "Start Test"}
                                                    >
                                                        {activeTests[device.id] ? <StopCircle className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
                                                        {activeTests[device.id] ? 'Bezig...' : 'Test'}
                                                    </button>
                                                    {(device.type === 'local_monitor' || device.type === 'videowall_agent' || activeTests[device.id]) && (
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
                                                        </>
                                                    )}
                                                    {device.type === 'local_monitor' && (
                                                        <div className="flex items-center gap-0.5 bg-black/40 px-1 border-l border-white/10">
                                                            <button onClick={() => handleVolumeTest(device, -10)} className="w-6 h-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all text-sm font-bold">-</button>
                                                            <span className="text-[9px] font-mono tabular-nums opacity-60 w-6 text-center">{testVolumes[device.id] ?? 100}%</span>
                                                            <button onClick={() => handleVolumeTest(device, 10)} className="w-6 h-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all text-sm font-bold">+</button>
                                                        </div>
                                                    )}
                                                    {device.type === 'videowall_agent' && (
                                                        <>
                                                            <div className="w-px bg-white/10" />
                                                            <button
                                                                onClick={() => handleRestartAgent(device as VideoWallAgentDevice)}
                                                                className="px-3 py-1.5 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                                                                title="Agent Herstarten"
                                                            >
                                                                <RefreshCw className="w-3 h-3" /> Herstart
                                                            </button>
                                                            <div className="w-px bg-white/10" />
                                                            <button
                                                                onClick={() => handleShutdownHost(device as VideoWallAgentDevice)}
                                                                className="px-3 py-1.5 hover:bg-red-900/40 text-red-500/70 hover:text-red-400 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                                                                title="Linux Host Afsluiten"
                                                            >
                                                                🖥️ Shutdown
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
                                                        message: `Weet je zeker dat je apparaat "${device.name}" wilt verwijderen ? `,
                                                        type: 'confirm',
                                                        onConfirm: () => deleteDevice(device.id)
                                                    })
                                                }}
                                                className="px-3 py-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3 h-3" /> Verwijderen
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="h-4 flex items-center justify-center bg-black/20 hover:bg-black/40 cursor-pointer -mb-4 opacity-50 hover:opacity-100" onClick={() => setExpandedDevice(null)}>
                                    <ChevronDown className="w-3 h-3 rotate-180" />
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default DevicesSettings
