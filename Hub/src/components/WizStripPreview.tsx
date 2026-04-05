import React from 'react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import { cn } from '../lib/utils'
import { isLightStripPreviewEnabled, LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS } from '../lib/light-strip-preview'
import ShowModeLightControls from './ShowModeLightControls'

/**
 * Statische voorvertoning voor WiZ: cue-kleur × helderheid (geen live device-feedback).
 */
const WizStripPreview: React.FC<{
  event: ShowEvent
  compact?: boolean
  className?: string
  variant?: 'default' | 'micro'
  layout?: 'default' | 'showRow'
  showActiveLightControls?: boolean
  eventRowIndex?: number
}> = ({
  event,
  compact = false,
  className,
  variant = 'default',
  layout = 'default',
  showActiveLightControls = false,
  eventRowIndex
}) => {
  const appSettings = useSequencerStore(s => s.appSettings)
  const stripOn = useSequencerStore(s => isLightStripPreviewEnabled(s.appSettings.lightStripPreviewEnabled))
  const device = (appSettings.devices || []).find(d => d.name === event.fixture)
  if (!device || device.type !== 'wiz') return null

  const isMicro = variant === 'micro'
  const effectiveCompact = isMicro ? true : compact
  const deviceTitle = `${(event.fixture || device.name || 'WiZ').trim()} · ${device.id}`
  const showRowName = (event.fixture || device.name || 'WiZ').trim()

  const c1 = event.color1 || '#ffffff'
  const briRaw = event.brightness !== undefined ? event.brightness : 255
  const bri = Math.max(0, Math.min(255, briRaw)) / 255
  const label = [event.effect, event.cue].filter(Boolean).join(' · ') || '—'

  if (layout === 'showRow' && !stripOn) {
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
          className={cn(
            'relative min-w-0 flex-1 overflow-hidden rounded border border-white/10',
            isMicro ? 'h-1' : 'h-1.5'
          )}
          title={`${Math.round(bri * 100)}% · ${c1}`}
        >
          <div
            className="absolute inset-0 ring-1 ring-inset ring-white/10"
            style={{
              backgroundColor: c1,
              opacity: Math.max(0.12, bri),
              filter: `brightness(${0.55 + 0.45 * bri})`
            }}
          />
        </div>
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
        !isMicro && (effectiveCompact ? 'mb-2' : 'mb-3'),
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-1.5 border-b border-white/10 bg-[#18181f]/90 leading-none',
          isMicro ? 'px-1 py-px gap-1' : effectiveCompact ? 'px-1.5 py-px' : 'px-2 py-0.5'
        )}
      >
        <span
          className={cn(
            'font-semibold tracking-wide text-sky-400/80 min-w-0 flex-1 truncate',
            isMicro ? 'text-[6px]' : effectiveCompact ? 'text-[7px]' : 'text-[8px]',
            !isMicro && 'uppercase font-bold tracking-wider'
          )}
          title={deviceTitle}
        >
          {deviceTitle}
        </span>
        <span
          className={cn(
            'text-white/35 truncate shrink-0 text-right',
            isMicro ? 'text-[6px] max-w-[42%]' : effectiveCompact ? 'text-[7px] max-w-[48%]' : 'text-[8px] max-w-[50%]'
          )}
          title={label}
        >
          {label}
        </span>
      </div>
      {stripOn ? (
        <div
          className={cn(
            'relative w-full rounded-b-lg overflow-hidden',
            isMicro ? 'h-1' : effectiveCompact ? 'h-[7px]' : 'h-3'
          )}
          title={`${Math.round(bri * 100)}% · ${c1}`}
        >
          <div
            className="absolute inset-0 ring-1 ring-inset ring-white/10"
            style={{
              backgroundColor: c1,
              opacity: Math.max(0.12, bri),
              filter: `brightness(${0.55 + 0.45 * bri})`
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export default WizStripPreview
