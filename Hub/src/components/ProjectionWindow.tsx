import React, { useEffect, useRef, useState } from 'react'
import { Activity, WifiOff } from 'lucide-react'
import { cn } from '../lib/utils'

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

    const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
    const [debugInfo, setDebugInfo] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isDeveloperMode, setIsDeveloperMode] = useState(false)

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

            const handlePlay = (_: any, { url, loop, volume, mute, transitionTime }: { url: string, loop: boolean, volume: number, mute: boolean, transitionTime?: number }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))
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

            ipcRenderer.on('media-play', handlePlay)
            ipcRenderer.on('media-stop', handleStop)
            ipcRenderer.on('media-pause', handlePause)
            ipcRenderer.on('media-volume', handleVolume)
            ipcRenderer.on('media-update', handleUpdate)

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
                className="projection-video absolute inset-0"
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
                onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.volume = state.volume;
                    video.muted = state.muted;
                    video.loop = state.loop;
                }}
                onError={(e) => {
                    const video = e.target as HTMLVideoElement;
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
            />
        );
    }

    return (
        <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center relative">
            {renderVideo('A', videoRefA, playerA)}
            {renderVideo('B', videoRefB, playerB)}

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

            {!isConnected && (
                <div className="disconnected-status">
                    <WifiOff className="w-3 h-3 inline mr-1" /> Disconnected
                </div>
            )}
        </div>
    )
}

export default ProjectionWindow
