import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import type { WLEDDevice } from '../types/devices'
import { cn } from '../lib/utils'
import { isLightStripPreviewEnabled, LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS } from '../lib/light-strip-preview'
import { wledEffectPreviewUrl, wledPalettePreviewUrl, WLED_PREVIEW_IMG_FALLBACK } from '../lib/wled-preview-urls'
import { drawWledLiveFrame, parseWledLiveMessage, type WledLiveFrame } from '../lib/wled-live-peek'
import ShowModeLightControls from './ShowModeLightControls'

const LIVE_STALE_MS = 4000

function buildWledWsUrl(ipRaw: string): string | null {
  const ip = ipRaw.trim()
  if (!ip) return null
  if (ip.startsWith('[')) return `ws://${ip}/ws`
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(ip)) return `ws://${ip}/ws`
  if (ip.includes(':')) return `ws://[${ip}]/ws`
  return `ws://${ip}/ws`
}

type WledStripPreviewBodyProps = {
  event: ShowEvent
  compact: boolean
  wled: WLEDDevice
  serverHost: string
  filePort: number
  className?: string
  stripPreviewEnabled: boolean
  /** Ingeklapt in show: minimale balk onder stagehand-regels. */
  variant?: 'default' | 'micro'
  /** Show-modus: naam + balk op één regel, geen kaart. */
  layout?: 'default' | 'showRow'
  /** Geen WebSocket / GIF: alleen zwarte balk (tweede cue per WLED of niet-actief event). */
  peekPlaceholder?: boolean
  showActiveLightControls?: boolean
  eventRowIndex?: number
}

/**
 * Must stay mounted only for WLED fixtures — contains all hooks so hook order never changes
 * when switching fixture between WLED / WiZ in the same parent tree.
 */
const WledStripPreviewBody: React.FC<WledStripPreviewBodyProps> = ({
  event,
  compact,
  wled,
  serverHost,
  filePort,
  className,
  stripPreviewEnabled,
  variant = 'default',
  layout = 'default',
  peekPlaceholder = false,
  showActiveLightControls = false,
  eventRowIndex
}) => {
  const isMicro = variant === 'micro'
  const deviceTitle = useMemo(
    () => `${(event.fixture || wled.name || 'WLED').trim()} · ${wled.id}`,
    [event.fixture, wled.id, wled.name]
  )

  const effectId = event.effectId
  const paletteId = event.paletteId
  const c1 = event.color1 || '#ffffff'
  const c2 = event.color2 || '#000000'
  const c3 = event.color3 || '#888888'

  const effectUrl = wledEffectPreviewUrl(typeof effectId === 'number' ? effectId : undefined, serverHost, filePort)
  const paletteUrl = wledPalettePreviewUrl(typeof paletteId === 'number' ? paletteId : undefined, serverHost, filePort)

  const animSec = useMemo(() => {
    const sx = event.speed !== undefined ? event.speed : 128
    return 0.45 + ((255 - sx) / 255) * 10
  }, [event.speed])

  const bri = (event.brightness !== undefined ? event.brightness : 255) / 255

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lastPeekAtRef = useRef(0)
  const lastFrameRef = useRef<WledLiveFrame | null>(null)
  const [liveActive, setLiveActive] = useState(false)

  const wsUrl = useMemo(() => buildWledWsUrl(wled.ip || ''), [wled.ip])

  const paintFrame = useCallback((frame: WledLiveFrame) => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const cw = wrap.clientWidth
    const ch = wrap.clientHeight
    if (cw < 2 || ch < 2) return
    const pw = Math.max(1, Math.floor(cw * dpr))
    const ph = Math.max(1, Math.floor(ch * dpr))
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawWledLiveFrame(ctx, frame, cw, ch)
  }, [])

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el || !stripPreviewEnabled) return
    const ro = new ResizeObserver(() => {
      const fr = lastFrameRef.current
      if (fr) paintFrame(fr)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [paintFrame, stripPreviewEnabled])

  useEffect(() => {
    if (!stripPreviewEnabled || !wsUrl || peekPlaceholder) {
      setLiveActive(false)
      lastFrameRef.current = null
      return
    }

    let cancelled = false
    let ws: WebSocket | null = null
    let staleTimer: ReturnType<typeof setInterval> | null = null

    const dispatch = (data: string | ArrayBuffer) => {
      const frame = parseWledLiveMessage(data)
      if (!frame) return
      lastPeekAtRef.current = Date.now()
      lastFrameRef.current = frame
      setLiveActive(true)
      paintFrame(frame)
    }

    const onMsg = (ev: MessageEvent) => {
      let data = ev.data
      if (data instanceof Blob) {
        void data.arrayBuffer().then(buf => {
          if (!cancelled) dispatch(buf)
        })
        return
      }
      dispatch(data as string | ArrayBuffer)
    }

    lastPeekAtRef.current = Date.now()

    try {
      ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
    } catch {
      setLiveActive(false)
      return
    }

    ws.onopen = () => {
      if (cancelled || !ws) return
      try {
        ws.send(JSON.stringify({ lv: true }))
      } catch {
        /* ignore */
      }
    }

    ws.onmessage = onMsg

    staleTimer = setInterval(() => {
      if (cancelled) return
      if (Date.now() - lastPeekAtRef.current > LIVE_STALE_MS) {
        lastFrameRef.current = null
        setLiveActive(false)
      }
    }, 500)

    return () => {
      cancelled = true
      lastFrameRef.current = null
      if (staleTimer) clearInterval(staleTimer)
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ lv: false }))
        }
      } catch {
        /* ignore */
      }
      ws?.close()
    }
  }, [wsUrl, paintFrame, stripPreviewEnabled, peekPlaceholder])

  const showRowName = useMemo(
    () => (event.fixture || wled.name || 'WLED').trim(),
    [event.fixture, wled.name]
  )

  if (layout === 'showRow' && !stripPreviewEnabled) {
    return (
      <div className={cn('flex w-full min-w-0 items-center gap-2', className)}>
        <span
          className={cn(
            LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS,
            'font-medium tabular-nums text-white/90',
            isMicro ? 'text-[10px]' : 'text-xs'
          )}
          title={showRowName}
        >
          {showRowName}
        </span>
        <div
          className={cn(
            'relative min-w-0 flex-1 overflow-hidden rounded border border-white/10 bg-black',
            isMicro ? 'h-1' : 'h-1.5'
          )}
        />
        {showActiveLightControls && eventRowIndex !== undefined && event.fixture ? (
          <ShowModeLightControls fixture={event.fixture} rowIndex={eventRowIndex} />
        ) : null}
      </div>
    )
  }

  if (layout === 'showRow') {
    return (
      <div className={cn('flex w-full min-w-0 items-center gap-2', className)}>
        <span
          className={cn(
            LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS,
            'font-medium tabular-nums text-white/90',
            isMicro ? 'text-[10px]' : 'text-xs'
          )}
          title={showRowName}
        >
          {showRowName}
        </span>
        <div
          ref={wrapRef}
          className={cn(
            'relative min-w-0 flex-1 overflow-hidden rounded border border-white/10',
            isMicro ? 'h-1' : 'h-1.5'
          )}
          style={{
            filter:
              peekPlaceholder || liveActive
                ? undefined
                : `brightness(${Math.min(1.15, Math.max(0.25, bri))})`
          }}
        >
          {peekPlaceholder ? (
            <div className="absolute inset-0 bg-black" />
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 h-full w-full ${liveActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
                aria-hidden
              />
              <div
                className={`absolute inset-0 ${liveActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                {effectUrl ? (
                  <img
                    src={effectUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-88"
                    onError={e => {
                      ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#0a0a0e]" />
                )}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${c1}, ${c2}, ${c3}, ${c1})`,
                    backgroundSize: '220% 100%',
                    backgroundPosition: '0% 50%',
                    mixBlendMode: 'soft-light',
                    opacity: 0.38,
                    animation: `wledStripShift ${animSec}s linear infinite`
                  }}
                />
                {paletteUrl ? (
                  <img
                    src={paletteUrl}
                    alt=""
                    className="absolute right-0 top-0 h-full w-[min(28%,120px)] object-cover opacity-55 border-l border-white/25"
                    onError={e => {
                      ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                    }}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
        <style>{`
          @keyframes wledStripShift {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
        `}</style>
        {showActiveLightControls && eventRowIndex !== undefined && event.fixture ? (
          <ShowModeLightControls fixture={event.fixture} rowIndex={eventRowIndex} />
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'shrink-0 border border-white/12 bg-[#14141a] overflow-hidden w-full',
        isMicro ? 'rounded-md mb-0' : 'rounded-xl',
        !isMicro && (compact ? 'mb-2' : 'mb-3'),
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-1.5 border-b border-white/10 bg-[#18181f]/90 leading-none',
          isMicro ? 'px-1 py-px gap-1' : compact ? 'px-1.5 py-px' : 'px-2 py-0.5'
        )}
      >
        <span
          className={cn(
            'font-semibold tracking-wide text-sky-400/80 min-w-0 flex-1 truncate',
            isMicro ? 'text-[6px]' : compact ? 'text-[7px]' : 'text-[8px]',
            !isMicro && 'uppercase font-bold tracking-wider'
          )}
          title={deviceTitle}
        >
          {deviceTitle}
        </span>
        <span
          className={cn(
            'text-white/35 truncate shrink-0 text-right',
            isMicro ? 'text-[6px] max-w-[42%]' : compact ? 'text-[7px] max-w-[48%]' : 'text-[8px] max-w-[50%]'
          )}
          title={event.effect + ' · ' + event.palette}
        >
          {[event.effect, event.palette].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
      {stripPreviewEnabled ? (
      <div
        ref={wrapRef}
        className={cn('relative w-full', isMicro ? 'h-1' : compact ? 'h-[7px]' : 'h-3')}
        style={{ filter: liveActive ? undefined : `brightness(${Math.min(1.15, Math.max(0.25, bri))})` }}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full ${liveActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
          aria-hidden
        />
        <div className={`absolute inset-0 ${liveActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {effectUrl ? (
            <img
              src={effectUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-88"
              onError={e => {
                ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[#0a0a0e]" />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(90deg, ${c1}, ${c2}, ${c3}, ${c1})`,
              backgroundSize: '220% 100%',
              backgroundPosition: '0% 50%',
              mixBlendMode: 'soft-light',
              opacity: 0.38,
              animation: `wledStripShift ${animSec}s linear infinite`
            }}
          />
          {paletteUrl ? (
            <img
              src={paletteUrl}
              alt=""
              className="absolute right-0 top-0 h-full w-[min(28%,120px)] object-cover opacity-55 border-l border-white/25"
              onError={e => {
                ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
              }}
            />
          ) : null}
        </div>
      </div>
      ) : null}
      <style>{`
        @keyframes wledStripShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}

/**
 * Strip-preview: when the device is reachable, prefer WLED WebSocket live LED stream (same data as Peek).
 * Otherwise falls back to effect/palette GIFs plus cue colours (documentation thumbnails, not firmware output).
 */
const WledStripPreview: React.FC<{
  event: ShowEvent
  compact?: boolean
  className?: string
  variant?: 'default' | 'micro'
  layout?: 'default' | 'showRow'
  peekPlaceholder?: boolean
  showActiveLightControls?: boolean
  eventRowIndex?: number
}> = ({
  event,
  compact = false,
  className,
  variant = 'default',
  layout = 'default',
  peekPlaceholder = false,
  showActiveLightControls = false,
  eventRowIndex
}) => {
  const appSettings = useSequencerStore(s => s.appSettings)
  const stripPreviewEnabled = useSequencerStore(s => isLightStripPreviewEnabled(s.appSettings.lightStripPreviewEnabled))
  const device = (appSettings.devices || []).find(d => d.name === event.fixture)
  if (!device || device.type !== 'wled') return null

  const serverHost = appSettings.serverIp || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const filePort = (appSettings.serverPort || 3001) + 1
  const effectiveCompact = variant === 'micro' ? true : compact

  return (
    <WledStripPreviewBody
      event={event}
      compact={effectiveCompact}
      wled={device as WLEDDevice}
      serverHost={serverHost}
      filePort={filePort}
      className={className}
      stripPreviewEnabled={stripPreviewEnabled}
      variant={variant}
      layout={layout}
      peekPlaceholder={peekPlaceholder}
      showActiveLightControls={showActiveLightControls}
      eventRowIndex={eventRowIndex}
    />
  )
}

export default WledStripPreview
