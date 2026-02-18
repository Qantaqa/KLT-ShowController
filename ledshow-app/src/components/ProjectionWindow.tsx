import React, { useEffect, useRef, useState } from 'react'
import { Activity, WifiOff } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const ProjectionWindow: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [debugInfo, setDebugInfo] = useState<string | null>(null)
    const [videoSource, setVideoSource] = useState<string | null>(null)
    const [videoProps, setVideoProps] = useState({ loop: false, volume: 1, muted: false, playing: false, opacity: 1, fadeDuration: 0 })
    const [isConnected, setIsConnected] = useState(false)
    const [isDeveloperMode, setIsDeveloperMode] = useState(false)

    // Sync state to video element
    useEffect(() => {
        if (!videoRef.current) return

        if (videoSource) {
            videoRef.current.loop = videoProps.loop
            videoRef.current.volume = videoProps.volume
            videoRef.current.muted = videoProps.muted

            if (videoProps.playing) {
                videoRef.current.play().catch(e => {
                    // Ignore abort errors which are common when switching srcs rapidly
                    if (e.name !== 'AbortError') console.warn("Playback failed", e)
                })
            } else {
                videoRef.current.pause()
            }
        } else {
            // STOP state: Pause and clear buffer
            videoRef.current.pause()
            videoRef.current.currentTime = 0
            // Since src is becoming undefined in JSX, load() unloads the current video
            videoRef.current.load()
        }
    }, [videoSource, videoProps.loop, videoProps.volume, videoProps.muted, videoProps.playing])

    useEffect(() => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            setIsConnected(true)

            const handlePlay = (_: any, { url, loop, volume, mute, transitionTime }: { url: string, loop: boolean, volume: number, mute: boolean, transitionTime?: number }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))

                if (transitionTime && transitionTime > 0 && videoSource) {
                    // Fade out current
                    setVideoProps(prev => ({ ...prev, opacity: 0, fadeDuration: transitionTime / 2 }));

                    setTimeout(() => {
                        // Swap source
                        setVideoSource(url)
                        // Fade in
                        setTimeout(() => {
                            setVideoProps(prev => ({
                                ...prev,
                                loop,
                                volume: vol,
                                muted: mute,
                                playing: true,
                                opacity: 1,
                                fadeDuration: transitionTime / 2
                            }));
                        }, 50);
                    }, transitionTime / 2);
                } else if (transitionTime && transitionTime > 0) {
                    // No previous source, just fade in
                    setVideoProps(prev => ({ ...prev, opacity: 0, fadeDuration: 0 }));
                    setVideoSource(url)
                    setTimeout(() => {
                        setVideoProps(prev => ({
                            ...prev,
                            loop,
                            volume: vol,
                            muted: mute,
                            playing: true,
                            opacity: 1,
                            fadeDuration: transitionTime
                        }));
                    }, 50);
                } else {
                    // Instant play
                    setVideoSource(url)
                    setVideoProps(prev => ({
                        ...prev,
                        loop,
                        volume: vol,
                        muted: mute,
                        playing: true,
                        opacity: 1,
                        fadeDuration: 0
                    }))
                }

                setDebugInfo(`Playing: ${url.split(/[\\/]/).pop()} (Vol: ${volume}%)`)
            }

            const handleStop = (_: any, { fadeOutTime }: { fadeOutTime?: number } = {}) => {
                if (fadeOutTime && fadeOutTime > 0) {
                    // Fade out first
                    setVideoProps(prev => ({ ...prev, opacity: 0, fadeDuration: fadeOutTime }));
                    setTimeout(() => {
                        setVideoSource(null)
                        setVideoProps(prev => ({ ...prev, playing: false }))
                        setDebugInfo('Stopped (Faded)')
                    }, fadeOutTime);
                } else {
                    setVideoSource(null)
                    setVideoProps(prev => ({ ...prev, playing: false, opacity: 1, fadeDuration: 0 }))
                    setDebugInfo('Stopped')
                }
            }

            const handlePause = () => {
                setVideoProps(prev => ({ ...prev, playing: false }))
                setDebugInfo('Paused')
            }

            const handleVolume = (_: any, { volume, mute }: { volume: number, mute: boolean }) => {
                const vol = Math.max(0, Math.min(1, volume / 100))
                setVideoProps(prev => ({ ...prev, volume: vol, muted: mute }))
                if (videoRef.current) {
                    videoRef.current.volume = vol
                    videoRef.current.muted = mute
                }
                setDebugInfo(`Volume: ${volume}% ${mute ? '(Muted)' : ''}`)
            }

            ipcRenderer.on('media-play', handlePlay)
            ipcRenderer.on('media-stop', handleStop)
            ipcRenderer.on('media-pause', handlePause)
            ipcRenderer.on('media-volume', handleVolume)

            const handleUpdate = (_: any, { loop }: { loop?: boolean }) => {
                if (typeof loop === 'boolean') {
                    setVideoProps(prev => ({ ...prev, loop }))
                    if (videoRef.current) {
                        videoRef.current.loop = loop
                    }
                    setDebugInfo(prev => `${prev ? prev.split(' (')[0] : 'Playing'} (Loop: ${loop})`)
                    sendStatusUpdate(); // Trigger immediate update
                }
            }
            ipcRenderer.on('media-update', handleUpdate)

            const sendStatusUpdate = () => {
                if (videoRef.current) {
                    ipcRenderer.send('media-status-update', {
                        deviceId: (window as any).projectionDeviceId,
                        status: {
                            playing: !videoRef.current.paused,
                            currentTime: videoRef.current.currentTime,
                            duration: videoRef.current.duration,
                            volume: videoRef.current.volume,
                            muted: videoRef.current.muted,
                            loop: videoRef.current.loop,
                            playbackRate: videoRef.current.playbackRate,
                            lastUpdated: Date.now()
                        }
                    });
                }
            };

            // Periodically send status updates (every 5 seconds)
            const statusInterval = setInterval(sendStatusUpdate, 5000);

            ipcRenderer.on('set-mode', (_: any, { developer }: { developer: boolean }) => {
                setIsDeveloperMode(developer)
            })

            // Notify main process we are ready
            ipcRenderer.send('projection-ready')

            return () => {
                clearInterval(statusInterval);
                ipcRenderer.removeListener('media-play', handlePlay)
                ipcRenderer.removeListener('media-stop', handleStop)
                ipcRenderer.removeListener('media-pause', handlePause)
                ipcRenderer.removeListener('media-volume', handleVolume)
                ipcRenderer.removeListener('media-update', handleUpdate)
            }
        }
    }, [])

    return (
        <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center relative">
            <video
                ref={videoRef}
                src={videoSource ? (
                    videoSource.startsWith('file://') || videoSource.startsWith('http') || videoSource.startsWith('ledshow-file://')
                        ? videoSource
                        : `file:///${videoSource.replace(/\\/g, '/')}`
                ) : undefined}
                className="w-full h-full object-contain bg-black transition-opacity duration-500"
                style={{
                    opacity: videoProps.opacity,
                    transitionDuration: `${videoProps.fadeDuration}ms`
                }}
                playsInline
                autoPlay
                onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.volume = videoProps.volume;
                    video.muted = videoProps.muted;
                    video.loop = videoProps.loop;
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
                    const errMsg = `Video Error: ${msg}`;
                    setDebugInfo(`${errMsg} (${video.src.split('/').pop()})`);
                    console.error("Video playback error:", error, video.src);

                    if ((window as any).require) {
                        const { ipcRenderer } = (window as any).require('electron');
                        ipcRenderer.send('projection-error', errMsg);
                    }
                }}
            />

            {/* Fallback / Idle State */}
            {!videoRef.current?.src && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                    <Activity className="w-24 h-24 text-white/20 mb-4" />
                </div>
            )}

            {/* Debug Overlay (Hidden by default unless specifically toggled or errors in DEV mode) */}
            {debugInfo && (isDeveloperMode || debugInfo.startsWith('Video Error')) && (
                <div className={cn(
                    "absolute top-4 left-4 font-mono text-xs px-2 py-1 rounded backdrop-blur border opacity-80 z-50",
                    debugInfo.startsWith('Video Error') ? "bg-red-900/80 text-white border-red-500" : "bg-black/50 text-green-500 border-white/10"
                )}>
                    [PROJECTION] {debugInfo}
                </div>
            )}

            {!isConnected && (
                <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 font-mono text-xs px-2 py-1 rounded backdrop-blur border border-red-500/10">
                    <WifiOff className="w-3 h-3 inline mr-1" /> Disconnected
                </div>
            )}
        </div>
    )
}

export default ProjectionWindow
