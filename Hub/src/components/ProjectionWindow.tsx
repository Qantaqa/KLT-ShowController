import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Activity, WifiOff, Move, Save, Play, Pause } from 'lucide-react'
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
    const [testImage, setTestImage] = useState<{ enabled: boolean, url?: string }>({ enabled: false })
    const [testVideo, setTestVideo] = useState<{ enabled: boolean, url?: string, playing: boolean }>({ enabled: false, playing: false })
    const [activeMaskIds, setActiveMaskIds] = useState<string[] | null>(null)
    const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null)

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

    const testVideoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (testVideo.enabled && testVideoRef.current) {
            if (testVideo.playing) testVideoRef.current.play().catch(() => { });
            else testVideoRef.current.pause();
        }
    }, [testVideo.enabled, testVideo.playing]);

    const activePlayerRef = useRef<'A' | 'B'>(activePlayer)
    useEffect(() => { activePlayerRef.current = activePlayer }, [activePlayer])

    useEffect(() => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            setIsConnected(true)

            const handlePlay = (_: any, { url, loop, volume, mute, transitionTime, projectionMaskIds }: { url: string, loop: boolean, volume: number, mute: boolean, transitionTime?: number, projectionMaskIds?: string[] }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))

                // Disable test media when show starting show media
                setTestImage(prev => ({ ...prev, enabled: false }))
                setTestVideo(prev => ({ ...prev, enabled: false }))
                setActiveMaskIds(projectionMaskIds || null)
                const nextPlayer = activePlayerRef.current === 'A' ? 'B' : 'A';
                const fadeMs = transitionTime || 0;

                console.log(`[Proj] Play Request: ${url} (Next: ${nextPlayer}, Fade: ${fadeMs}ms)`);

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
                if (config.projectionMasks) {
                    setProjectionMasks(config.projectionMasks);
                }
            };

            const handleCalibrationMode = (_: any, { enabled }: { enabled: boolean }) => {
                console.log('[Proj] Calibration mode:', enabled);
                setIsCalibrating(enabled);
            };

            ipcRenderer.on('media-play', handlePlay)
            ipcRenderer.on('media-stop', handleStop)
            ipcRenderer.on('media-pause', handlePause)
            ipcRenderer.on('media-volume', handleVolume)
            ipcRenderer.on('media-update', handleUpdate)
            ipcRenderer.on('projection-config', handleConfig)
            ipcRenderer.on('projection-calibration-mode', handleCalibrationMode)

            ipcRenderer.on('projection-test-image', (_: any, data: { enabled: boolean, url?: string }) => {
                console.log('[Proj] Test image update:', data);
                setTestImage(data);
            });

            ipcRenderer.on('projection-test-video', (_: any, data: { enabled: boolean, url?: string, playing?: boolean }) => {
                console.log('[Proj] Test video update:', data);
                setTestVideo(prev => ({
                    enabled: data.enabled,
                    url: data.url || prev.url,
                    playing: data.playing !== undefined ? data.playing : prev.playing
                }));
            });

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
                ipcRenderer.removeAllListeners('projection-test-image')
                ipcRenderer.removeAllListeners('projection-test-video')
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
            }, fadeMs + 100);

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

        projectionMasks.forEach(mask => {
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

                if (distPx < minDistance && distPx < 20) {
                    minDistance = distPx;
                    bestPreview = { maskId: mask.id, index: i + 1, x: projX, y: projY };
                }
            }
        });

        setPreviewPoint(bestPreview);
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (!isCalibrating || draggingPoint || hasDragged.current) {
            hasDragged.current = false;
            return;
        }

        if (previewPoint) {
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
        }
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
            onMouseUp={handleDragEnd}
            onClick={handleBackgroundClick}
            onTouchMove={handlePointDrag}
            onTouchEnd={handleDragEnd}
        >
            {/* Masked Video Container */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: projectionMasks.length > 0 ? 'url(#projection-mask)' : 'none' }}
            >
                {testImage.enabled && testImage.url && (
                    <img
                        src={testImage.url.startsWith('http') || testImage.url.startsWith('ledshow-file') || testImage.url.startsWith('file') ? testImage.url : `file:///${testImage.url.replace(/\\/g, '/')}`}
                        className="absolute inset-0 w-full h-full object-cover z-20"
                        alt="Test Grid"
                        onError={(_e) => {
                            console.error("Test image failed to load:", testImage.url);
                            setDebugInfo(`Test image load failed: ${testImage.url}`);
                        }}
                    />
                )}
                {testVideo.enabled && testVideo.url && (
                    <video
                        ref={testVideoRef}
                        src={testVideo.url.startsWith('http') || testVideo.url.startsWith('ledshow-file') || testVideo.url.startsWith('file') ? testVideo.url : `file:///${testVideo.url.replace(/\\/g, '/')}`}
                        className="absolute inset-0 w-full h-full object-cover z-20"
                        loop
                        muted
                        autoPlay
                    />
                )}
                {renderVideo('A', videoRefA, playerA)}
                {renderVideo('B', videoRefB, playerB)}
            </div>

            {/* SVG Definitions for Masking */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <clipPath id="projection-mask" clipPathUnits="objectBoundingBox">
                        {projectionMasks
                            .filter(mask => !activeMaskIds || activeMaskIds.length === 0 || activeMaskIds.includes(mask.id))
                            .map((mask, maskIdx) => (
                                <polygon
                                    key={maskIdx}
                                    points={mask.points.map(p => `${p.x / 100},${p.y / 100}`).join(' ')}
                                />
                            ))}
                    </clipPath>
                </defs>
            </svg>

            {/* Calibration Overlay */}
            {isCalibrating && (
                <svg className="absolute inset-0 w-full h-full z-[100] pointer-events-none overflow-visible">
                    {projectionMasks.map((mask) => (
                        <g key={mask.id}>
                            {/* Mask Shape Outline */}
                            <polygon
                                points={mask.points.map(p => `${(p.x / 100) * (containerRef.current?.clientWidth || window.innerWidth)},${(p.y / 100) * (containerRef.current?.clientHeight || window.innerHeight)}`).join(' ')}
                                fill="rgba(249, 115, 22, 0.1)"
                                stroke="#f97316"
                                strokeWidth={selectedMaskId === mask.id ? "4" : "2"}
                                strokeDasharray={selectedMaskId === mask.id ? "0" : "5,5"}
                                className="pointer-events-auto cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMaskId(mask.id);
                                }}
                            />
                            {/* Points / Handles */}
                            {mask.points.map((p, idx) => (
                                <circle
                                    key={idx}
                                    cx={`${p.x}%`}
                                    cy={`${p.y}%`}
                                    r="8"
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
                            {/* Preview Point for Adding */}
                            {previewPoint && previewPoint.maskId === mask.id && (
                                <circle
                                    cx={`${previewPoint.x}%`}
                                    cy={`${previewPoint.y}%`}
                                    r="5"
                                    fill="white"
                                    fillOpacity="0.5"
                                    stroke="#f97316"
                                    strokeWidth="1"
                                    className="animate-pulse pointer-events-none"
                                />
                            )}
                        </g>
                    ))}
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

            {isCalibrating && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[200]">
                    <div className="px-6 py-3 bg-orange-500 text-black font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
                        <Move className="w-5 h-5" />
                        Calibratie Modus: Sleep punten of klik rand voor extra punt
                    </div>
                    <button
                        onClick={() => {
                            if ((window as any).require) {
                                const { ipcRenderer } = (window as any).require('electron');
                                const deviceId = (window as any).projectionDeviceId;
                                ipcRenderer.send('projection-finish-calibration', { deviceId });
                            }
                        }}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105"
                    >
                        <Save className="w-5 h-5" /> Sla op & Sluit
                    </button>
                    {testVideo.enabled && (
                        <button
                            onClick={() => {
                                const newPlaying = !testVideo.playing;
                                setTestVideo(prev => ({ ...prev, playing: newPlaying }));
                                if ((window as any).require) {
                                    const { ipcRenderer } = (window as any).require('electron');
                                    ipcRenderer.send('projection-test-video', { enabled: true, url: testVideo.url, playing: newPlaying });
                                }
                            }}
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all shadow-2xl"
                        >
                            {testVideo.playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>
                    )}

                    {selectedMaskId && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl ml-4">
                            <span className="text-[10px] text-white/40 uppercase font-bold">Masker Naam:</span>
                            <input
                                type="text"
                                className="bg-transparent border-b border-white/20 text-white text-sm outline-none px-2 py-1 focus:border-primary transition-colors min-w-[150px]"
                                value={projectionMasks.find(m => m.id === selectedMaskId)?.name || ''}
                                placeholder="Geef naam..."
                                autoFocus
                                onChange={(e) => {
                                    const nextName = e.target.value;
                                    const nextMasks = projectionMasks.map(m =>
                                        m.id === selectedMaskId ? { ...m, name: nextName } : m
                                    );
                                    setProjectionMasks(nextMasks);

                                    // Send update to Hub via IPC
                                    if ((window as any).require) {
                                        const { ipcRenderer } = (window as any).require('electron');
                                        const deviceId = (window as any).projectionDeviceId;
                                        ipcRenderer.send('projection-update-masks', { deviceId, masks: nextMasks });
                                    }
                                }}
                            />
                            <button
                                onClick={() => setSelectedMaskId(null)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <Play className="w-4 h-4 rotate-45" /> {/* Use as X for now or find better icon */}
                            </button>
                        </div>
                    )}
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
