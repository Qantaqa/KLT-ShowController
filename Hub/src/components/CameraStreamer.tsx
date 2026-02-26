import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import { networkService } from '../services/network-service'

import { cn } from '../lib/utils'

const CameraStreamer: React.FC = () => {
    const { isCameraActive, setCameraActive, updateCameraFrame, isSelfPreviewVisible } = useSequencerStore()
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
                        const { clientUUID } = useSequencerStore.getState()
                        networkService.sendCommand({ type: 'CAMERA_FRAME', clientId, clientUUID, frame })
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
            "relative group/camera flex items-center",
            !isSelfPreviewVisible && "hidden"
        )}>
            <div className="relative">
                <div className={cn(
                    "w-20 h-14 rounded-lg overflow-hidden glass border border-white/20 bg-black"
                )}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />

                    <button
                        onClick={() => useSequencerStore.getState().setSelfPreviewVisible(false)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/20 text-red-500 rounded-full border border-white/10 opacity-0 group-hover/camera:opacity-100 transition-all"
                        title="Preview verbergen"
                    >
                        <X className="w-2.5 h-2.5" />
                    </button>
                    <div className="absolute inset-0 border border-primary/20 rounded-lg pointer-events-none" />
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
