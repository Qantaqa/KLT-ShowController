import React, { useEffect, useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { useShowStore } from '../store/useShowStore'
import { networkService } from '../services/network-service'

import { cn } from '../lib/utils'

const CameraStreamer: React.FC = () => {
    const { isCameraActive, setCameraActive, updateCameraFrame, isSelfPreviewVisible } = useShowStore()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const frameCountRef = useRef(0)

    useEffect(() => {
        if (isCameraActive) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('[Camera] API not available. Ensure HTTPS or localhost.')
                setCameraActive(false)
                return
            }
            console.log('[Camera] Requesting camera access...')
            navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, frameRate: 10 }
            }).then(stream => {
                console.log('[Camera] Access granted, stream active:', stream.active)
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play().catch(e => console.warn('[Camera] Video play error:', e))
                }
            }).catch(err => {
                console.error('[Camera] Access denied:', err)
                setCameraActive(false)
            })
        } else {
            // Stop the stream and notify all clients that camera is off
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
                streamRef.current = null
                console.log('[Camera] Stream stopped')
            }
            // Tell the server/host that this client's camera stopped
            const clientId = networkService.getSocketId()
            if (clientId) {
                networkService.sendCommand({ type: 'CAMERA_STOPPED', clientId })
                console.log('[Camera] Sent CAMERA_STOPPED for', clientId)
            }
        }
    }, [isCameraActive, setCameraActive])

    useEffect(() => {
        let interval: any
        if (isCameraActive) {
            console.log('[Camera] Starting frame capture interval...')
            interval = setInterval(() => {
                const video = videoRef.current
                const canvas = canvasRef.current
                if (!video || !canvas) return

                // Wait for video to have data (readyState 2 = HAVE_CURRENT_DATA, 3 = HAVE_FUTURE_DATA, 4 = HAVE_ENOUGH_DATA)
                if (video.readyState < 2 || video.videoWidth === 0) {
                    return
                }

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(video, 0, 0, 320, 240)
                    const frame = canvas.toDataURL('image/jpeg', 0.5)
                    const clientId = networkService.getSocketId()

                    if (clientId) {
                        networkService.sendCommand({ type: 'CAMERA_FRAME', clientId, frame })
                        updateCameraFrame(clientId, frame)
                    }
                }
            }, 200) // 5 FPS
        }
        return () => {
            if (interval) {
                clearInterval(interval)
                frameCountRef.current = 0
            }
        }
    }, [isCameraActive, updateCameraFrame])

    if (!isCameraActive) return (
        <canvas ref={canvasRef} width={320} height={240} className="hidden" />
    )

    return (
        <div className={cn(
            "fixed bottom-28 right-8 z-[500] animate-in slide-in-from-bottom-5 duration-300",
            !isSelfPreviewVisible && "opacity-0 pointer-events-none translate-y-10"
        )}>
            <div className="relative group/camera">
                <div className={cn(
                    "w-48 h-36 rounded-2xl overflow-hidden glass border border-white/20 shadow-2xl bg-black"
                )}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />

                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                        <Camera className="w-3 h-3 text-primary" />
                        Live Preview
                    </div>

                    <button
                        onClick={() => useShowStore.getState().setSelfPreviewVisible(false)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/20 text-red-500 rounded-full border border-white/10 opacity-0 group-hover/camera:opacity-100 transition-all hover:scale-110"
                        title="Preview verbergen (camera blijft actief)"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none group-hover/camera:border-primary/40 transition-colors" />
                </div>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />

            <style dangerouslySetInnerHTML={{
                __html: `
                .mirror { transform: scaleX(-1); }
            ` }} />
        </div>
    )
}

export default CameraStreamer
