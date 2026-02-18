import React, { useEffect, useRef } from 'react'
import { useShowStore } from '../store/useShowStore'
import { networkService } from '../services/network-service'

const CameraStreamer: React.FC = () => {
    const { isCameraActive, updateCameraFrame } = useShowStore()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const frameCountRef = useRef(0)

    useEffect(() => {
        if (isCameraActive) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('[Camera] API not available. Ensure HTTPS or localhost.')
                useShowStore.getState().setCameraActive(false)
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
                useShowStore.getState().setCameraActive(false)
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
    }, [isCameraActive])

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
                    console.log('[Camera] Video not ready yet, readyState:', video.readyState, 'size:', video.videoWidth, 'x', video.videoHeight)
                    return
                }

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(video, 0, 0, 320, 240)
                    const frame = canvas.toDataURL('image/jpeg', 0.5)
                    const clientId = networkService.getSocketId()

                    frameCountRef.current++
                    if (frameCountRef.current % 25 === 1) { // Log every 5 seconds (25 frames at 5fps)
                        console.log(`[Camera] Sending frame #${frameCountRef.current}, clientId: ${clientId}, frame size: ${frame.length} bytes`)
                    }

                    if (clientId) {
                        networkService.sendCommand({ type: 'CAMERA_FRAME', clientId, frame })
                        updateCameraFrame(clientId, frame)
                    } else {
                        console.warn('[Camera] No socket ID yet, frame not sent')
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

    return (
        <div className="hidden">
            <video ref={videoRef} autoPlay playsInline muted width={320} height={240} />
            <canvas ref={canvasRef} width={320} height={240} />
        </div>
    )
}

export default CameraStreamer
