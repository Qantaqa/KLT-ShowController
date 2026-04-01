import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Activity, WifiOff, Save, Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ProjectionMask } from '../types/devices'

interface PlayerState {
    src: string | null;
    playing: boolean;
    opacity: number;
    fadeDuration: number;
    loop: boolean;
    volume: number;
    muted: boolean;
}

/** Afstand (px) tot een rand om een nieuw punt toe te voegen */
const EDGE_INSERT_DISTANCE_PX = 38
/** Straal (px) voor zichtbare hoek-handles; groter = makkelijker te pakken */
const VERTEX_HANDLE_RADIUS_PX = 14

/** Ray-casting; x,y en punten in hetzelfde coördinatenstelsel (bijv. 0–100 %). */
function pointInPolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
    if (pts.length < 3) return false
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x
        const yi = pts[i].y
        const xj = pts[j].x
        const yj = pts[j].y
        if (Math.abs(yj - yi) < 1e-9) continue
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside
        }
    }
    return inside
}

const ProjectionWindow: React.FC = () => {
    const videoRefA = useRef<HTMLVideoElement>(null)
    const videoRefB = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
    const [debugInfo, setDebugInfo] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isDeveloperMode, setIsDeveloperMode] = useState(false)
    const [projectionMasks, setProjectionMasks] = useState<ProjectionMask[]>([])
    const [isCalibrating, setIsCalibrating] = useState(false)
    const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null)
    const [hoveredMaskId, setHoveredMaskId] = useState<string | null>(null)

    const [playerA, setPlayerA] = useState<PlayerState>({
        src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false
    })
    const [playerB, setPlayerB] = useState<PlayerState>({
        src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false
    })

    // Sync individual players
    const syncPlayer = (ref: React.RefObject<HTMLVideoElement | null>, state: PlayerState) => {
        const video = ref.current;
        if (!video) return;

        if (state.src) {
            video.loop = state.loop;
            video.volume = state.volume;
            video.muted = state.muted;

            if (state.playing) {
                video.play().catch(e => {
                    if (e.name !== 'AbortError') console.warn("Playback failed", e);
                });
            } else {
                video.pause();
            }
        } else {
            video.pause();
            video.currentTime = 0;
            if (video.src) video.load();
        }
    }

    useEffect(() => syncPlayer(videoRefA, playerA), [playerA]);
    useEffect(() => syncPlayer(videoRefB, playerB), [playerB]);

    const activePlayerRef = useRef<'A' | 'B'>(activePlayer)
    useEffect(() => { activePlayerRef.current = activePlayer }, [activePlayer])

    useEffect(() => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            setIsConnected(true)

            const handlePlay = (_: any, { url, loop, volume, mute, transitionTime, crossoverTime, projectionMasks: playMasks }: { url: string, loop: boolean, volume: number, mute: boolean, transitionTime?: number, crossoverTime?: number, projectionMasks?: ProjectionMask[] }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))

                const normalized = Array.isArray(playMasks)
                    ? playMasks.map((m, i) => ({
                        ...m,
                        name: (m.name && String(m.name).trim()) ? m.name : `Vlak ${i + 1}`
                    }))
                    : []
                setProjectionMasks(normalized)
                const nextPlayer = activePlayerRef.current === 'A' ? 'B' : 'A';
                const fadeMs = transitionTime || 0;
                const crossoverMs = crossoverTime || 0;

                console.log(`[Proj] Play Request: ${url} (Next: ${nextPlayer}, Fade: ${fadeMs}ms)`);
                ;(window as any).__projCrossoverMs = crossoverMs;

                const nextState: PlayerState = {
                    src: url,
                    playing: true,
                    opacity: 0,
                    fadeDuration: fadeMs,
                    loop,
                    volume: vol,
                    muted: mute
                };

                if (nextPlayer === 'A') setPlayerA(nextState); else setPlayerB(nextState);

                if (fadeMs > 0) {
                    pendingFadeMs.current = fadeMs;
                    setDebugInfo(`Buffering: ${url}`)

                    // Safety Timeout: If video never fires onCanPlay, swap anyway after 2s
                    setTimeout(() => {
                        if (pendingFadeMs.current === fadeMs) {
                            console.warn("[Proj] onCanPlay timeout, forcing swap");
                            handleCanPlay(nextPlayer);
                        }
                    }, 2000);
                } else {
                    setActivePlayer(nextPlayer);
                    setPlayerA(prev => ({ ...prev, opacity: nextPlayer === 'A' ? 1 : 0, fadeDuration: 0 }));
                    setPlayerB(prev => ({ ...prev, opacity: nextPlayer === 'B' ? 1 : 0, fadeDuration: 0 }));

                    setTimeout(() => {
                        const cleanup = { src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false };
                        if (nextPlayer === 'A') setPlayerB(cleanup); else setPlayerA(cleanup);
                    }, 50);
                    setDebugInfo(`Immediate Play: ${url}`)
                }
            }

            const handleStop = (_: any, { fadeOutTime }: { fadeOutTime?: number } = {}) => {
                const fadeMs = fadeOutTime || 0;
                console.log(`[Proj] Stop Request (Fade: ${fadeMs}ms)`);
                if (fadeMs > 0) {
                    setPlayerA(prev => ({ ...prev, opacity: 0, fadeDuration: fadeMs }));
                    setPlayerB(prev => ({ ...prev, opacity: 0, fadeDuration: fadeMs }));
                    setTimeout(() => {
                        const stop = { src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false };
                        setPlayerA(stop);
                        setPlayerB(stop);
                        setDebugInfo('Stopped')
                    }, fadeMs + 50);
                } else {
                    const stop = { src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false };
                    setPlayerA(stop);
                    setPlayerB(stop);
                    setDebugInfo('Stopped')
                }
            }

            const handlePause = () => {
                setPlayerA(prev => ({ ...prev, playing: false }));
                setPlayerB(prev => ({ ...prev, playing: false }));
                setDebugInfo('Paused')
            }

            const handleVolume = (_: any, { volume, mute }: { volume: number, mute: boolean }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))
                setPlayerA(prev => ({ ...prev, volume: vol, muted: mute }));
                setPlayerB(prev => ({ ...prev, volume: vol, muted: mute }));
                setDebugInfo(`Volume: ${volume}% ${mute ? '(Muted)' : ''}`)
            }

            const hash = window.location.hash;
            const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
            const deviceId = urlParams.get('deviceId') || (window as any).projectionDeviceId;

            const handleUpdate = (_: any, { loop }: { loop?: boolean }) => {
                if (typeof loop === 'boolean') {
                    setPlayerA(prev => ({ ...prev, loop }));
                    setPlayerB(prev => ({ ...prev, loop }));
                    setDebugInfo(prev => `${prev ? prev.split(' (')[0] : 'Playing'} (Loop: ${loop})`)
                    sendStatusUpdate();
                }
            }

            const handleConfig = (_: any, config: any) => {
                console.log('[Proj] Received config update', config);
                if (config.projectionMasks !== undefined) {
                    const arr = Array.isArray(config.projectionMasks) ? config.projectionMasks : []
                    setProjectionMasks(arr.map((m: ProjectionMask, i: number) => ({
                        ...m,
                        name: (m.name && String(m.name).trim()) ? m.name : `Vlak ${i + 1}`
                    })))
                }
            };

            const handleCalibrationMode = (_: any, { enabled }: { enabled: boolean }) => {
                console.log('[Proj] Calibration mode:', enabled);
                setIsCalibrating(enabled);
                if (!enabled) {
                    setSelectedMaskId(null);
                    setHoveredMaskId(null);
                }
            };

            ipcRenderer.on('media-play', handlePlay)
            ipcRenderer.on('media-stop', handleStop)
            ipcRenderer.on('media-pause', handlePause)
            ipcRenderer.on('media-volume', handleVolume)
            ipcRenderer.on('media-update', handleUpdate)
            ipcRenderer.on('projection-config', handleConfig)
            ipcRenderer.on('projection-calibration-mode', handleCalibrationMode)

            const sendStatusUpdate = () => {
                const targetId = deviceId || (window as any).projectionDeviceId;
                const activeRef = activePlayerRef.current === 'A' ? videoRefA : videoRefB;
                if (activeRef.current && targetId) {
                    ipcRenderer.send('media-status-update', {
                        deviceId: targetId,
                        status: {
                            playing: !activeRef.current.paused,
                            currentTime: activeRef.current.currentTime,
                            duration: activeRef.current.duration,
                            volume: activeRef.current.volume,
                            muted: activeRef.current.muted,
                            loop: activeRef.current.loop,
                            playbackRate: activeRef.current.playbackRate,
                            lastUpdated: Date.now()
                        }
                    });
                } else if (targetId) {
                    ipcRenderer.send('media-status-update', {
                        deviceId: targetId,
                        status: { playing: false, lastUpdated: Date.now() }
                    });
                }
            };

            const statusInterval = setInterval(sendStatusUpdate, 5000);

            ipcRenderer.on('set-mode', (_: any, { developer }: { developer: boolean }) => {
                setIsDeveloperMode(developer)
            })

            ipcRenderer.send('projection-ready', deviceId)

            return () => {
                clearInterval(statusInterval);
                ipcRenderer.removeListener('media-play', handlePlay)
                ipcRenderer.removeListener('media-stop', handleStop)
                ipcRenderer.removeListener('media-pause', handlePause)
                ipcRenderer.removeListener('media-volume', handleVolume)
                ipcRenderer.removeListener('media-update', handleUpdate)
                ipcRenderer.removeListener('projection-config', handleConfig)
                ipcRenderer.removeListener('projection-calibration-mode', handleCalibrationMode)
                ipcRenderer.removeAllListeners('set-mode')
            }
        }
    }, [])

    const pendingFadeMs = useRef<number>(0);

    const handleCanPlay = (id: 'A' | 'B') => {
        // Only trigger swap if this is the player we are waiting for
        const isNextPlayer = activePlayer !== id;
        if (isNextPlayer && pendingFadeMs.current > 0) {
            const fadeMs = pendingFadeMs.current;
            pendingFadeMs.current = 0; // Reset

            // Start crossfade: New player fades IN, old player fades OUT
            setPlayerA(prev => ({ ...prev, opacity: id === 'A' ? 1 : 0, fadeDuration: fadeMs }));
            setPlayerB(prev => ({ ...prev, opacity: id === 'B' ? 1 : 0, fadeDuration: fadeMs }));

            // Delay z-index swap to middle of transition
            setTimeout(() => {
                setActivePlayer(id);
            }, fadeMs / 2);

            // Cleanup old player after fade
            setTimeout(() => {
                const cleanup = { src: null, playing: false, opacity: 0, fadeDuration: 0, loop: false, volume: 1, muted: false };
                if (id === 'A') setPlayerB(cleanup); else setPlayerA(cleanup);
            }, fadeMs + 100 + ((window as any).__projCrossoverMs || 0));

            setDebugInfo(`Transitioning (${fadeMs}ms)`)
        } else if (isNextPlayer && pendingFadeMs.current === 0) {
            // Already handled by immediate swap or not meant to swap yet
        } else if (!isNextPlayer && !playerA.src && !playerB.src) {
            // Initial load?
        }
    }

    const [draggingPoint, setDraggingPoint] = useState<{ maskId: string, pointIndex: number, offsetX: number, offsetY: number } | null>(null);
    const [previewPoint, setPreviewPoint] = useState<{ maskId: string, index: number, x: number, y: number } | null>(null);
    const hasDragged = useRef(false);

    const handlePointDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggingPoint || !isCalibrating || !containerRef.current) return;
        hasDragged.current = true;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const newXPct = Math.max(0, Math.min(100, ((mouseX + draggingPoint.offsetX) / rect.width) * 100));
        const newYPct = Math.max(0, Math.min(100, ((mouseY + draggingPoint.offsetY) / rect.height) * 100));

        setProjectionMasks(prev => prev.map(mask => {
            if (mask.id === draggingPoint.maskId) {
                const newPoints = [...mask.points];
                newPoints[draggingPoint.pointIndex] = { x: newXPct, y: newYPct };
                return { ...mask, points: newPoints };
            }
            return mask;
        }));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingPoint) {
            handlePointDrag(e);
            return;
        }

        if (!isCalibrating || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const xPx = e.clientX - rect.left;
        const yPx = e.clientY - rect.top;
        const xPct = (xPx / rect.width) * 100;
        const yPct = (yPx / rect.height) * 100;

        let minDistance = Infinity;
        let bestPreview: { maskId: string, index: number, x: number, y: number } | null = null;

        const masksForEdge = selectedMaskId
            ? projectionMasks.filter(m => m.id === selectedMaskId)
            : [];

        for (const mask of masksForEdge) {
            for (let i = 0; i < mask.points.length; i++) {
                const p1 = mask.points[i];
                const p2 = mask.points[(i + 1) % mask.points.length];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const l2 = dx * dx + dy * dy;
                if (l2 === 0) continue;

                let t = ((xPct - p1.x) * dx + (yPct - p1.y) * dy) / l2;
                t = Math.max(0, Math.min(1, t));

                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;

                const distPx = Math.sqrt(((xPct - projX) * rect.width / 100) ** 2 + ((yPct - projY) * rect.height / 100) ** 2);

                if (distPx < minDistance && distPx < EDGE_INSERT_DISTANCE_PX) {
                    minDistance = distPx;
                    bestPreview = { maskId: mask.id, index: i + 1, x: projX, y: projY };
                }
            }
        }

        setPreviewPoint(bestPreview);

        if (bestPreview) {
            setHoveredMaskId(bestPreview.maskId);
            return;
        }

        for (let mi = projectionMasks.length - 1; mi >= 0; mi--) {
            const mask = projectionMasks[mi];
            if (pointInPolygon(xPct, yPct, mask.points)) {
                setHoveredMaskId(mask.id);
                return;
            }
        }
        setHoveredMaskId(null);
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (!isCalibrating || draggingPoint || hasDragged.current) {
            hasDragged.current = false;
            return;
        }

        if (previewPoint && selectedMaskId && previewPoint.maskId === selectedMaskId) {
            const newMasks = projectionMasks.map(mask => {
                if (mask.id === previewPoint!.maskId) {
                    const newPoints = [...mask.points];
                    newPoints.splice(previewPoint!.index, 0, { x: previewPoint!.x, y: previewPoint!.y });
                    return { ...mask, points: newPoints };
                }
                return mask;
            });
            setProjectionMasks(newMasks);

            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron');
                const deviceId = (window as any).projectionDeviceId;
                ipcRenderer.send('projection-update-masks', { deviceId, masks: newMasks });
            }
            return;
        }

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        for (let mi = projectionMasks.length - 1; mi >= 0; mi--) {
            const mask = projectionMasks[mi];
            if (pointInPolygon(xPct, yPct, mask.points)) {
                setSelectedMaskId(mask.id);
                return;
            }
        }
        setSelectedMaskId(null);
    };

    const handleDragEnd = useCallback(() => {
        if (draggingPoint && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            const hash = window.location.hash;
            const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
            const deviceId = urlParams.get('deviceId') || (window as any).projectionDeviceId;

            ipcRenderer.send('projection-update-masks', { deviceId, masks: projectionMasks });
        }
        setDraggingPoint(null);
    }, [draggingPoint, projectionMasks]);

    const renderVideo = (id: 'A' | 'B', ref: React.RefObject<HTMLVideoElement | null>, state: PlayerState) => {
        if (!state.src && state.opacity === 0) return null;

        const videoUrl = state.src ? (
            state.src.startsWith('file://') || state.src.startsWith('http') || state.src.startsWith('ledshow-file://')
                ? state.src
                : `file:///${state.src.replace(/\\/g, '/')}`
        ) : undefined;

        return (
            <video
                key={id}
                ref={ref}
                src={videoUrl}
                className="projection-video absolute inset-0 w-full h-full object-cover"
                style={{
                    '--video-opacity': state.opacity,
                    '--video-fade-duration': `${state.fadeDuration}ms`,
                    zIndex: activePlayer === id ? 10 : 5
                } as React.CSSProperties}
                playsInline
                autoPlay
                onCanPlay={() => handleCanPlay(id)}
                onPlaying={() => {
                    if (activePlayer === id) setDebugInfo(null);
                }}
                onLoadedMetadata={(_e) => {
                    const video = _e.target as HTMLVideoElement;
                    video.volume = state.volume;
                    video.muted = state.muted;
                    video.loop = state.loop;
                }}
                onError={(_e) => {
                    const video = _e.target as HTMLVideoElement;
                    if (!video.src || video.src.endsWith('/') || video.src.includes('undefined')) return;
                    const error = video.error;
                    let msg = 'Unknown Error';
                    if (error) {
                        switch (error.code) {
                            case MediaError.MEDIA_ERR_ABORTED: msg = 'Aborted'; break;
                            case MediaError.MEDIA_ERR_NETWORK: msg = 'Network Error'; break;
                            case MediaError.MEDIA_ERR_DECODE: msg = 'Decode Error'; break;
                            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = 'Source Not Supported'; break;
                            default: msg = `Error Code: ${error?.code}`;
                        }
                    }
                    const errMsg = `Video Error (${id}): ${msg}`;
                    setDebugInfo(`${errMsg} (${video.src})`);
                    console.error("Video playback error:", error, video.src);

                    if ((window as any).require) {
                        const { ipcRenderer } = (window as any).require('electron');
                        ipcRenderer.send('projection-error', errMsg);
                    }
                }}
                onEnded={() => {
                    if ((window as any).require) {
                        const { ipcRenderer } = (window as any).require('electron');
                        ipcRenderer.send('media-ended', {
                            deviceId: (window as any).projectionDeviceId,
                            src: state.src
                        });
                    }
                }}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center relative select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredMaskId(null)}
            onMouseUp={handleDragEnd}
            onClick={handleBackgroundClick}
            onTouchMove={handlePointDrag}
            onTouchEnd={handleDragEnd}
        >
            {/* Video: altijd volledig scherm; zwarte vlakken liggen erboven (inverted mask) */}
            <div className="absolute inset-0 w-full h-full z-[10]">
                {renderVideo('A', videoRefA, playerA)}
                {renderVideo('B', videoRefB, playerB)}
            </div>

            {/* Zwarte maskers bovenop video (binnen het vlak = zwart / geen projectie) */}
            {projectionMasks.length > 0 && (
                <svg
                    className="absolute inset-0 z-[20] w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {projectionMasks.map(mask => (
                        <polygon
                            key={mask.id}
                            points={mask.points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="#000000"
                        />
                    ))}
                </svg>
            )}

            {/* Randen en hoeken tijdens bewerken */}
            {isCalibrating && (
                <svg className="absolute inset-0 w-full h-full z-[100] pointer-events-none overflow-visible">
                    {projectionMasks.map((mask) => {
                        const w = containerRef.current?.clientWidth || window.innerWidth;
                        const h = containerRef.current?.clientHeight || window.innerHeight;
                        const polyPx = mask.points.map(p => `${(p.x / 100) * w},${(p.y / 100) * h}`).join(' ');
                        const isSel = selectedMaskId === mask.id
                        const isHov = hoveredMaskId === mask.id
                        return (
                        <g key={mask.id}>
                            <polygon
                                points={polyPx}
                                fill="rgba(255,255,255,0.04)"
                                stroke={isSel ? '#fff7ed' : isHov ? '#fdba74' : '#9a3412'}
                                strokeWidth={isSel ? 4 : isHov ? 3.5 : 2}
                                strokeDasharray={isSel ? '0' : '6 6'}
                                className="pointer-events-none"
                            />
                            {selectedMaskId === mask.id && mask.points.map((p, idx) => (
                                <circle
                                    key={idx}
                                    cx={`${p.x}%`}
                                    cy={`${p.y}%`}
                                    r={VERTEX_HANDLE_RADIUS_PX}
                                    fill="#f97316"
                                    stroke="white"
                                    strokeWidth="2"
                                    className={cn(
                                        "pointer-events-auto cursor-move transition-none",
                                        !draggingPoint && "hover:fill-white"
                                    )}
                                    onMouseDown={(_e) => {
                                        _e.stopPropagation();
                                        hasDragged.current = false;
                                        if (!containerRef.current) return;
                                        const rect = containerRef.current.getBoundingClientRect();
                                        const mouseX = _e.clientX - rect.left;
                                        const mouseY = _e.clientY - rect.top;

                                        const currentX = (p.x / 100) * rect.width;
                                        const currentY = (p.y / 100) * rect.height;

                                        setDraggingPoint({
                                            maskId: mask.id,
                                            pointIndex: idx,
                                            offsetX: currentX - mouseX,
                                            offsetY: currentY - mouseY
                                        });
                                    }}
                                    onTouchStart={(_e) => {
                                        _e.stopPropagation();
                                        hasDragged.current = false;
                                        if (!containerRef.current) return;
                                        const rect = containerRef.current.getBoundingClientRect();
                                        const touchX = _e.touches[0].clientX - rect.left;
                                        const touchY = _e.touches[0].clientY - rect.top;

                                        const currentX = (p.x / 100) * rect.width;
                                        const currentY = (p.y / 100) * rect.height;

                                        setDraggingPoint({
                                            maskId: mask.id,
                                            pointIndex: idx,
                                            offsetX: currentX - touchX,
                                            offsetY: currentY - touchY
                                        });
                                    }}
                                />
                            ))}
                            {selectedMaskId === mask.id && previewPoint && previewPoint.maskId === mask.id && (
                                <circle
                                    cx={`${previewPoint.x}%`}
                                    cy={`${previewPoint.y}%`}
                                    r="7"
                                    fill="white"
                                    fillOpacity="0.5"
                                    stroke="#f97316"
                                    strokeWidth="1"
                                    className="animate-pulse pointer-events-none"
                                />
                            )}
                        </g>
                        );
                    })}
                </svg>
            )}

            {/* Fallback / Idle State */}
            {!playerA.src && !playerB.src && (
                <div className="idle-fallback">
                    <Activity className="w-24 h-24 text-white/20 mb-4" />
                </div>
            )}

            {/* Debug Overlay */}
            {debugInfo && (isDeveloperMode || debugInfo.startsWith('Video Error')) && (
                <div className={cn(
                    "debug-overlay",
                    debugInfo.startsWith('Video Error') ? "debug-error" : "debug-info"
                )}>
                    [PROJECTION] {debugInfo}
                </div>
            )}

            {isCalibrating && !selectedMaskId && (
                <div
                    className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-[300] px-4 w-full max-w-4xl justify-center pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            const newId = `mask_${Date.now()}`
                            setProjectionMasks(prev => {
                                const newMask: ProjectionMask = {
                                    id: newId,
                                    name: `Vlak ${prev.length + 1}`,
                                    points: [
                                        { x: 25, y: 25 },
                                        { x: 75, y: 25 },
                                        { x: 75, y: 75 },
                                        { x: 25, y: 75 }
                                    ]
                                };
                                const next = [...prev, newMask];
                                if ((window as any).require) {
                                    const { ipcRenderer } = (window as any).require('electron');
                                    const deviceId = (window as any).projectionDeviceId;
                                    ipcRenderer.send('projection-update-masks', { deviceId, masks: next });
                                }
                                return next;
                            });
                            setSelectedMaskId(newId);
                        }}
                        className="min-w-[min(100%,280px)] px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 shrink-0" /> Vlak toevoegen
                    </button>
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            if ((window as any).require) {
                                const { ipcRenderer } = (window as any).require('electron');
                                const deviceId = (window as any).projectionDeviceId;
                                ipcRenderer.send('projection-finish-calibration', { deviceId });
                            }
                        }}
                        className="min-w-[min(100%,280px)] px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center justify-center gap-3 transition-all whitespace-nowrap"
                    >
                        <Save className="w-5 h-5 shrink-0" /> Sla op &amp; Sluit
                    </button>
                </div>
            )}

            {!isConnected && (
                <div className="disconnected-status">
                    <WifiOff className="w-3 h-3 inline mr-1" /> Disconnected
                </div>
            )}
        </div>
    )
}

export default ProjectionWindow
