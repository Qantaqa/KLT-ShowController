import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Loader2, AlertCircle, Info, Pipette } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import { cn, modalBtnIconClass, modalBtnSecondary } from '../lib/utils'
import { sortWledEffectsForUi, sortWledPalettesForUi, type WledCatalogOption } from '../lib/wled-catalog-sort'
import { wledEffectPreviewUrl, wledPalettePreviewUrl, WLED_PREVIEW_IMG_FALLBACK } from '../lib/wled-preview-urls'

/** -1 = alle segmenten; 0…n = dat segment (0 is geldig — niet via `||` wegwerken). */
function wledSegmentSelectValue(event: ShowEvent): number {
  const s = event.segmentId as unknown
  if (s === undefined || s === null || s === '') return -1
  const n = typeof s === 'number' ? s : parseInt(String(s), 10)
  if (!Number.isFinite(n) || n < 0) return -1
  return n
}

const LightConfigurator: React.FC<{
  event: ShowEvent
  updateEvent: (partial: Partial<ShowEvent>) => void
  devices: any[]
  /** Brede modal-layout met panelen (SequenceRowEditModal) */
  wideLayout?: boolean
}> = ({ event, updateEvent, devices, wideLayout = false }) => {
  const deviceAvailability = useSequencerStore(s => s.deviceAvailability)
  const selectedDevice = devices.find(d => d.name === event.fixture)
  const isDeviceOnline =
    !!selectedDevice?.id && deviceAvailability[selectedDevice.id]?.status === 'online'

  const eventRef = useRef(event)
  eventRef.current = event
  const livePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushLiveToDevice = useCallback(() => {
    if (!(typeof window !== 'undefined' && (window as any).require)) return
    const ev = eventRef.current
    const dev = devices.find(d => d.name === ev.fixture)
    if (!dev || (dev.type !== 'wled' && dev.type !== 'wiz')) return
    if (!dev.id || deviceAvailability[dev.id]?.status !== 'online') return
    const { ipcRenderer } = (window as any).require('electron')
    if (dev.type === 'wled') {
      void ipcRenderer.invoke('wled:live-preview', { ip: dev.ip, event: ev, deviceId: dev.id })
    } else {
      void ipcRenderer.invoke('wiz:live-preview', { ip: dev.ip, event: ev })
    }
  }, [devices, deviceAvailability])

  const scheduleLivePush = useCallback(() => {
    if (livePushTimerRef.current) clearTimeout(livePushTimerRef.current)
    livePushTimerRef.current = setTimeout(() => {
      livePushTimerRef.current = null
      pushLiveToDevice()
    }, 100)
  }, [pushLiveToDevice])

  useEffect(
    () => () => {
      if (livePushTimerRef.current) clearTimeout(livePushTimerRef.current)
    },
    []
  )
  const [wledEffectOptions, setWledEffectOptions] = useState<WledCatalogOption[]>([])
  const [wledPaletteOptions, setWledPaletteOptions] = useState<WledCatalogOption[]>([])
  const [wledSegments, setWledSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const effectSelectValue = useMemo(() => {
    const id = event.effectId
    if (typeof id === 'number' && id >= 0) return String(id)
    if (event.effect) {
      const found = wledEffectOptions.find(o => o.name === event.effect)
      if (found) return String(found.id)
    }
    return ''
  }, [event.effect, event.effectId, wledEffectOptions])

  const paletteSelectValue = useMemo(() => {
    const id = event.paletteId
    if (typeof id === 'number' && id >= 0) return String(id)
    if (event.palette) {
      const found = wledPaletteOptions.find(o => o.name === event.palette)
      if (found) return String(found.id)
    }
    return ''
  }, [event.palette, event.paletteId, wledPaletteOptions])

  const sortedEffectOptions = useMemo(() => sortWledEffectsForUi(wledEffectOptions), [wledEffectOptions])
  const sortedPaletteOptions = useMemo(() => sortWledPalettesForUi(wledPaletteOptions), [wledPaletteOptions])

  const panelCls = 'rounded-xl border border-white/12 bg-[#18181f] p-4'
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5'
  const inputClsWide =
    'w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white outline-none focus:border-primary/45'

  useEffect(() => {
    if (selectedDevice?.type === 'wled' && (window as any).require) {
      setLoading(true)
      const { ipcRenderer } = (window as any).require('electron')
      const rowsToOptions = (rows: any[]): WledCatalogOption[] =>
        (Array.isArray(rows) ? rows : [])
          .map(r => ({ id: Number(r.id), name: String(r.name ?? '') }))
          .filter(r => Number.isFinite(r.id) && r.name)

      Promise.all([
        ipcRenderer.invoke('db:get-table-data', 'wled_effects'),
        ipcRenderer.invoke('db:get-table-data', 'wled_palettes'),
        ipcRenderer.invoke('wled:get-info', selectedDevice.ip)
      ])
        .then(([fxRows, palRows, info]) => {
          setWledEffectOptions(rowsToOptions(fxRows))
          setWledPaletteOptions(rowsToOptions(palRows))
          if (info?.state?.seg) setWledSegments(info.state.seg)
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to load WLED data', err)
          setLoading(false)
        })
    } else {
      setWledEffectOptions([])
      setWledPaletteOptions([])
      setWledSegments([])
    }
  }, [selectedDevice?.id, selectedDevice?.type])

  const fetchDeviceState = async () => {
    if (!selectedDevice || !(window as any).require) return
    setLoading(true)
    const { ipcRenderer } = (window as any).require('electron')

    try {
      if (selectedDevice.type === 'wled') {
        const [data, fxRows, palRows] = await Promise.all([
          ipcRenderer.invoke('wled:get-info', selectedDevice.ip),
          ipcRenderer.invoke('db:get-table-data', 'wled_effects'),
          ipcRenderer.invoke('db:get-table-data', 'wled_palettes')
        ])
        const fxById = new Map<number, string>(
          (Array.isArray(fxRows) ? fxRows : []).map((r: any) => [Number(r.id), String(r.name ?? '')])
        )
        const palById = new Map<number, string>(
          (Array.isArray(palRows) ? palRows : []).map((r: any) => [Number(r.id), String(r.name ?? '')])
        )
        if (data && data.state) {
          const state = data.state
          const segList = Array.isArray(state.seg)
            ? state.seg
            : state.seg && typeof state.seg === 'object'
              ? Object.values(state.seg as object)
              : []
          const active = wledSegmentSelectValue(event)
          const seg =
            active >= 0
              ? segList.find((s: any) => s.id === active) || segList[0]
              : segList[0]

          if (seg) {
            const rgbToHex = (rgb: number[]) => {
              if (!rgb) return '#ffffff'
              return '#' + rgb.map(x => (x || 0).toString(16).padStart(2, '0')).join('')
            }

            updateEvent({
              brightness: state.bri,
              color1: rgbToHex(seg.col[0]),
              color2: rgbToHex(seg.col[1]),
              color3: rgbToHex(seg.col[2]),
              effect: fxById.get(seg.fx) || event.effect,
              effectId: seg.fx,
              palette: palById.get(seg.pal) || event.palette,
              paletteId: seg.pal,
              speed: seg.sx,
              intensity: seg.ix
            } as any)
          }
        }
      } else if (selectedDevice.type === 'wiz') {
        const result = await ipcRenderer.invoke('wiz:get-pilot', selectedDevice.ip)
        if (result && result.result) {
          const pilot = result.result
          const rgbToHex = (r: number, g: number, b: number) => {
            return '#' + [r, g, b].map(x => (x || 0).toString(16).padStart(2, '0')).join('')
          }

          updateEvent({
            brightness: Math.round((pilot.dimming || 100) * 2.55),
            color1: rgbToHex(pilot.r, pilot.g, pilot.b)
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch device state', err)
    } finally {
      setLoading(false)
    }
  }

  const appSettings = useSequencerStore(s => s.appSettings)
  const serverIp = appSettings.serverIp || window.location.hostname
  const FILE_PORT = (appSettings.serverPort || 3001) + 1

  const getEffectPreviewUrl = (id: number | undefined) => wledEffectPreviewUrl(id, serverIp, FILE_PORT)
  const getPalettePreviewUrl = (id: number | undefined) => wledPalettePreviewUrl(id, serverIp, FILE_PORT)

  const deviceSelect = (event as any).usedFixtures
    ? (() => {
        const filtered = devices.filter(
          d =>
            (d.type === 'wled' || d.type === 'wiz') &&
            (!(event as any).usedFixtures.includes(d.name) || d.name === event.fixture)
        )
        return filtered.length === 0 ? (
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Geen verlichting beschikbaar
          </div>
        ) : (
          <select
            title="Doel lamp"
            className={wideLayout ? cn(inputClsWide, 'flex-1 min-w-[200px]') : 'flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none'}
            value={event.fixture || ''}
            onChange={e => updateEvent({ fixture: e.target.value })}
          >
            <option className="bg-zinc-900" value="">
              Selecteer lamp…
            </option>
            {filtered.map(d => (
              <option className="bg-zinc-900" key={d.id} value={d.name}>
                {d.name} ({d.type})
              </option>
            ))}
          </select>
        )
      })()
    : (
        <select
          title="Selecteer lamp"
          className={wideLayout ? cn(inputClsWide, 'flex-1 min-w-[200px]') : 'flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none'}
          value={event.fixture || ''}
          onChange={e => updateEvent({ fixture: e.target.value })}
        >
          <option className="bg-zinc-900" value="">
            Selecteer lamp…
          </option>
          {devices
            .filter(d => d.type === 'wled' || d.type === 'wiz')
            .map(d => (
              <option className="bg-zinc-900" key={d.id} value={d.name}>
                {d.name} ({d.type})
              </option>
            ))}
        </select>
      )

  const uitlezenButton = selectedDevice ? (
    <button
      type="button"
      onClick={fetchDeviceState}
      className={cn(modalBtnSecondary(), 'shrink-0 px-3 py-2')}
      title="Huidige status van het apparaat uitlezen"
    >
      {loading ? <Loader2 className={cn(modalBtnIconClass, 'animate-spin')} /> : <Pipette className={modalBtnIconClass} />}
      Uitlezen
    </button>
  ) : null

  if (wideLayout) {
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <div className={cn(panelCls, 'relative')}>
          {loading && (
            <div className="absolute top-3 right-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary/80" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <h3 className={cn(labelCls, 'mb-0')}>Apparaat</h3>
            {selectedDevice ? (
              <span
                className={cn(
                  'shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  isDeviceOnline
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/15 bg-black/25 text-white/40'
                )}
                title={isDeviceOnline ? 'Apparaat is online' : 'Apparaat is offline of nog niet gezien'}
              >
                {isDeviceOnline ? 'Online' : 'Offline'}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-white/45 mb-3 leading-snug">
            Kies eerst een WLED- of WiZ-lamp. Daarna verschijnen de passende instellingen.
          </p>
          <div className="flex flex-wrap items-stretch gap-2">{deviceSelect}</div>
        </div>

        {selectedDevice?.type === 'wiz' && (
          <div className={panelCls}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h3 className={labelCls}>WiZ-instellingen</h3>
              </div>
              {uitlezenButton}
            </div>
            <p className="text-[11px] text-white/45 mb-4">Kleur en helderheid voor dit WiZ-apparaat.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelCls}>Kleur</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
                    value={event.color1 || '#ffffff'}
                    onChange={e => {
                      updateEvent({ color1: e.target.value })
                      scheduleLivePush()
                    }}
                    title="Kleur"
                  />
                  <span className="text-[11px] font-mono text-white/55">{event.color1 || '#ffffff'}</span>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={cn(labelCls, 'flex justify-between mb-0')}>
                  <span>Helderheid</span>
                  <span className="font-mono text-white/60">{event.brightness ?? 0}</span>
                </label>
                <input
                  title="Helderheid"
                  type="range"
                  min={0}
                  max={255}
                  value={event.brightness || 0}
                  onChange={e => {
                    updateEvent({ brightness: parseInt(e.target.value, 10) })
                    scheduleLivePush()
                  }}
                  className="w-full h-1.5 bg-white/10 rounded appearance-none accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            </div>
          </div>
        )}

        {selectedDevice?.type === 'wled' && (
          <div className={panelCls}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h3 className={labelCls}>WLED-instellingen</h3>
              </div>
              {uitlezenButton}
            </div>
            <p className="text-[11px] text-white/45 mb-4">Segment, kleuren, effecten en paletten voor dit WLED-apparaat.</p>
            <div className="grid grid-cols-12 gap-3 text-[10px]">
              <div className="col-span-12 flex flex-wrap gap-2">
                <select
                  title="WLED-segment"
                  className={cn(inputClsWide, 'min-w-[180px] flex-1')}
                  value={wledSegmentSelectValue(event)}
                  onChange={e => {
                    updateEvent({ segmentId: parseInt(e.target.value, 10) } as any)
                    scheduleLivePush()
                  }}
                >
                  <option value={-1}>Alle segmenten</option>
                  {wledSegments.map((seg: any) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.n ? seg.n : `Segment ${seg.id}`}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded border border-white/15 bg-transparent"
                    value={event.color1 || '#ffffff'}
                    onChange={e => {
                      updateEvent({ color1: e.target.value })
                      scheduleLivePush()
                    }}
                    title="Primaire kleur"
                  />
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded border border-white/15 bg-transparent"
                    value={event.color2 || '#000000'}
                    onChange={e => {
                      updateEvent({ color2: e.target.value })
                      scheduleLivePush()
                    }}
                    title="Secundaire kleur"
                  />
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex gap-2 min-w-0 items-end">
                  <div className="flex flex-col gap-0.5 shrink-0 w-[4.5rem]">
                    <span className="opacity-50 font-bold uppercase tracking-tighter text-[8px]">Prev</span>
                    <div className="w-full aspect-[4/3] max-h-[3.25rem] bg-black rounded-lg border border-white/10 overflow-hidden relative group/prev-eff">
                      {getEffectPreviewUrl(event.effectId) ? (
                        <img
                          src={getEffectPreviewUrl(event.effectId)!}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-[9px] text-white/25">
                          —
                        </div>
                      )}
                      {getEffectPreviewUrl(event.effectId) ? (
                        <>
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/prev-eff:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Info className="w-3 h-3 text-white" />
                          </div>
                          <div className="fixed hidden group-hover/prev-eff:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200 effect-preview-box">
                            <img
                              src={getEffectPreviewUrl(event.effectId)!}
                              alt=""
                              className="w-48 aspect-video object-cover rounded"
                              onError={e => {
                                ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                              }}
                            />
                            <div className="mt-1 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-center text-primary">
                              {event.effect || '—'}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Effect</label>
                    <select
                      title="Effect"
                      className={cn(inputClsWide, 'text-xs')}
                      value={effectSelectValue}
                      onChange={e => {
                        const v = e.target.value
                        if (!v) {
                          updateEvent({ effect: '', effectId: undefined } as Partial<ShowEvent>)
                          scheduleLivePush()
                          return
                        }
                        const id = parseInt(v, 10)
                        const row = wledEffectOptions.find(o => o.id === id)
                        updateEvent({ effect: row?.name ?? '', effectId: id } as Partial<ShowEvent>)
                        scheduleLivePush()
                      }}
                    >
                      <option value="">Geen</option>
                      {sortedEffectOptions.map(row => (
                        <option key={row.id} value={String(row.id)}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 min-w-0 items-end">
                  <div className="flex flex-col gap-0.5 shrink-0 w-[4.5rem]">
                    <span className="opacity-50 font-bold uppercase tracking-tighter text-[8px]">Prev</span>
                    <div className="w-full aspect-[4/3] max-h-[3.25rem] bg-black rounded-lg border border-white/10 overflow-hidden relative group/prev-pal">
                      {getPalettePreviewUrl(event.paletteId) ? (
                        <img
                          src={getPalettePreviewUrl(event.paletteId)!}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(90deg, ${event.color1 || '#fff'}, ${event.color2 || '#000'}, ${event.color3 || '#888'})`
                          }}
                        />
                      )}
                      {getPalettePreviewUrl(event.paletteId) ? (
                        <div className="fixed hidden group-hover/prev-pal:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200 palette-preview-box">
                          <img
                            src={getPalettePreviewUrl(event.paletteId)!}
                            alt=""
                            className="w-48 aspect-video object-cover rounded"
                            onError={e => {
                              ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                            }}
                          />
                          <div className="mt-1 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-center text-primary">
                            {event.palette || '—'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Palet</label>
                    <select
                      title="Palet"
                      className={cn(inputClsWide, 'text-xs')}
                      value={paletteSelectValue}
                      onChange={e => {
                        const v = e.target.value
                        if (!v) {
                          updateEvent({ palette: '', paletteId: undefined } as Partial<ShowEvent>)
                          scheduleLivePush()
                          return
                        }
                        const id = parseInt(v, 10)
                        const row = wledPaletteOptions.find(o => o.id === id)
                        updateEvent({ palette: row?.name ?? '', paletteId: id } as Partial<ShowEvent>)
                        scheduleLivePush()
                      }}
                    >
                      <option value="">Geen</option>
                      {sortedPaletteOptions.map(row => (
                        <option key={row.id} value={String(row.id)}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="opacity-50 flex justify-between text-[10px]">
                    <span>Speed</span> <span className="font-mono">{event.speed}</span>
                  </label>
                  <input
                    title="Snelheid"
                    type="range"
                    min={0}
                    max={255}
                    value={event.speed !== undefined ? event.speed : 128}
                    onChange={e => {
                      updateEvent({ speed: parseInt(e.target.value, 10) })
                      scheduleLivePush()
                    }}
                    className="w-full h-1.5 bg-white/10 rounded accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="opacity-50 flex justify-between text-[10px]">
                    <span>Intensity</span> <span className="font-mono">{event.intensity}</span>
                  </label>
                  <input
                    title="Intensiteit"
                    type="range"
                    min={0}
                    max={255}
                    value={event.intensity !== undefined ? event.intensity : 128}
                    onChange={e => {
                      updateEvent({ intensity: parseInt(e.target.value, 10) })
                      scheduleLivePush()
                    }}
                    className="w-full h-1.5 bg-white/10 rounded accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedDevice && (
          <div className={cn(panelCls, 'border-dashed border-white/15 bg-[#14141a]/50')}>
            <p className="text-[11px] text-white/40 text-center py-2">Selecteer een apparaat om instellingen te tonen.</p>
          </div>
        )}
      </div>
    )
  }

  /* Compacte layout (legacy) */
  return (
    <div className="flex flex-col gap-2 p-2 bg-black/40 rounded border border-white/10 mt-2 relative">
      {loading && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-3 h-3 animate-spin text-white/50" />
        </div>
      )}
      <div className="flex gap-2 items-center flex-wrap">
        {deviceSelect}
        {selectedDevice ? (
          <span
            className={cn(
              'shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
              isDeviceOnline
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                : 'border-white/15 bg-black/25 text-white/40'
            )}
          >
            {isDeviceOnline ? 'Online' : 'Offline'}
          </span>
        ) : null}
        {selectedDevice?.type === 'wiz' && (
          <div className="flex gap-2 items-center flex-1 min-w-[12rem]">
            <input
              type="color"
              className="bg-transparent w-6 h-6 border-none cursor-pointer"
              value={event.color1 || '#ffffff'}
              onChange={e => {
                updateEvent({ color1: e.target.value })
                scheduleLivePush()
              }}
              title="Kleur"
            />
            <div className="flex flex-col flex-1">
              <label className="text-[8px] opacity-50 uppercase">Helderheid</label>
              <input
                title="Helderheid"
                type="range"
                min={0}
                max={255}
                value={event.brightness || 0}
                onChange={e => {
                  updateEvent({ brightness: parseInt(e.target.value, 10) })
                  scheduleLivePush()
                }}
                className="h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
            </div>
            {uitlezenButton}
          </div>
        )}
      </div>

      {selectedDevice?.type === 'wled' && (
        <div className="grid grid-cols-12 gap-2 text-[10px]">
          <div className="col-span-12 flex flex-wrap gap-2 items-center">
            <select
              title="WLED Segment Selectie"
              className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 outline-none min-w-[8rem]"
              value={wledSegmentSelectValue(event)}
              onChange={e => {
                updateEvent({ segmentId: parseInt(e.target.value, 10) } as any)
                scheduleLivePush()
              }}
            >
              <option value={-1}>Alle Segmenten</option>
              {wledSegments.map((seg: any) => (
                <option key={seg.id} value={seg.id}>
                  {seg.n ? seg.n : `Segment ${seg.id}`}
                </option>
              ))}
            </select>
            <input
              type="color"
              className="bg-transparent w-6 h-6 border-none cursor-pointer"
              value={event.color1 || '#ffffff'}
              onChange={e => {
                updateEvent({ color1: e.target.value })
                scheduleLivePush()
              }}
              title="Primaire Kleur"
            />
            <input
              type="color"
              className="bg-transparent w-6 h-6 border-none cursor-pointer"
              value={event.color2 || '#000000'}
              onChange={e => {
                updateEvent({ color2: e.target.value })
                scheduleLivePush()
              }}
              title="Secundaire Kleur"
            />
            {uitlezenButton}
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-2">
            <div className="flex gap-1.5 min-w-0 items-end">
              <div className="w-11 h-9 shrink-0 rounded border border-white/10 overflow-hidden bg-black">
                {getEffectPreviewUrl(event.effectId) ? (
                  <img
                    src={getEffectPreviewUrl(event.effectId)!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => {
                      ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Effect</label>
                <select
                  title="Effect Selectie"
                  className="w-full bg-zinc-900 border border-white/10 rounded px-1 py-1 outline-none truncate"
                  value={effectSelectValue}
                  onChange={e => {
                    const v = e.target.value
                    if (!v) {
                      updateEvent({ effect: '', effectId: undefined } as Partial<ShowEvent>)
                      scheduleLivePush()
                      return
                    }
                    const id = parseInt(v, 10)
                    const row = wledEffectOptions.find(o => o.id === id)
                    updateEvent({ effect: row?.name ?? '', effectId: id } as Partial<ShowEvent>)
                    scheduleLivePush()
                  }}
                >
                  <option value="">Geen</option>
                  {sortedEffectOptions.map(row => (
                    <option key={row.id} value={String(row.id)}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-1.5 min-w-0 items-end">
              <div className="w-11 h-9 shrink-0 rounded border border-white/10 overflow-hidden bg-black">
                {getPalettePreviewUrl(event.paletteId) ? (
                  <img
                    src={getPalettePreviewUrl(event.paletteId)!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => {
                      ;(e.target as HTMLImageElement).src = WLED_PREVIEW_IMG_FALLBACK
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(90deg, ${event.color1 || '#fff'}, ${event.color2 || '#000'})`
                    }}
                  />
                )}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Palette</label>
                <select
                  title="Palette Selectie"
                  className="w-full bg-zinc-900 border border-white/10 rounded px-1 py-1 outline-none truncate"
                  value={paletteSelectValue}
                  onChange={e => {
                    const v = e.target.value
                    if (!v) {
                      updateEvent({ palette: '', paletteId: undefined } as Partial<ShowEvent>)
                      scheduleLivePush()
                      return
                    }
                    const id = parseInt(v, 10)
                    const row = wledPaletteOptions.find(o => o.id === id)
                    updateEvent({ palette: row?.name ?? '', paletteId: id } as Partial<ShowEvent>)
                    scheduleLivePush()
                  }}
                >
                  <option value="">Geen</option>
                  {sortedPaletteOptions.map(row => (
                    <option key={row.id} value={String(row.id)}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="col-span-6 space-y-1">
            <label className="opacity-50 flex justify-between">
              <span>Speed</span> <span>{event.speed}</span>
            </label>
            <input
              title="Effect Snelheid"
              type="range"
              min={0}
              max={255}
              value={event.speed !== undefined ? event.speed : 128}
              onChange={e => {
                updateEvent({ speed: parseInt(e.target.value, 10) })
                scheduleLivePush()
              }}
              className="w-full h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
          </div>
          <div className="col-span-6 space-y-1">
            <label className="opacity-50 flex justify-between">
              <span>Intensity</span> <span>{event.intensity}</span>
            </label>
            <input
              title="Effect Intensiteit"
              type="range"
              min={0}
              max={255}
              value={event.intensity !== undefined ? event.intensity : 128}
              onChange={e => {
                updateEvent({ intensity: parseInt(e.target.value, 10) })
                scheduleLivePush()
              }}
              className="w-full h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default LightConfigurator
