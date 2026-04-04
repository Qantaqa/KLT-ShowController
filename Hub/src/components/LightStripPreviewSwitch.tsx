import React from 'react'
import { useSequencerStore } from '../store/useSequencerStore'
import { cn } from '../lib/utils'
import { isLightStripPreviewEnabled } from '../lib/light-strip-preview'

type Props = {
  className?: string
  /** Klein formaat voor de smalle peek-header. */
  compact?: boolean
  /** Optionele tooltip (anders korte standaardtekst). */
  title?: string
}

/**
 * Globale schakelaar: preview-balk voor WLED (peek) en WiZ (statische kleur) aan/uit.
 * Zelfde store voor alle exemplaren in de app.
 */
const LightStripPreviewSwitch: React.FC<Props> = ({ className, compact = true, title: titleProp }) => {
  const enabled = useSequencerStore(s => isLightStripPreviewEnabled(s.appSettings.lightStripPreviewEnabled))
  const updateAppSettings = useSequencerStore(s => s.updateAppSettings)
  const broadcastState = useSequencerStore(s => s.broadcastState)

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const next = !enabled
    await updateAppSettings({ lightStripPreviewEnabled: next })
    broadcastState()
  }

  const tip =
    titleProp ||
    (enabled ? 'Preview-balk uit (klik om uit te zetten)' : 'Preview-balk aan (klik om aan te zetten)')

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      title={tip}
      onClick={toggle}
      className={cn(
        'shrink-0 rounded-full relative transition-all duration-300 border border-white/10 outline-none focus-visible:ring-1 focus-visible:ring-primary/60',
        compact ? 'w-8 h-4 p-[3px]' : 'w-10 h-5 p-1',
        enabled ? 'bg-primary/20 shadow-[inset_0_0_8px_rgba(249,115,22,0.12)]' : 'bg-white/5 shadow-inner',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full transition-all duration-300 shadow-md',
          compact ? 'w-2.5 h-2.5' : 'w-3 h-3',
          enabled ? 'ml-auto bg-primary shadow-[0_0_6px_#f97316]' : 'mr-auto bg-white/30'
        )}
      />
    </button>
  )
}

export default LightStripPreviewSwitch
