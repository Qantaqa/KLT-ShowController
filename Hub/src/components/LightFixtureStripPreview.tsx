import React from 'react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { ShowEvent } from '../types/show'
import WledStripPreview from './WledStripPreview'
import WizStripPreview from './WizStripPreview'

/**
 * Preview-balk voor lichtregels: WLED (peek) of WiZ (statische kleur), afhankelijk van fixture-type.
 */
const LightFixtureStripPreview: React.FC<{
  event: ShowEvent
  compact?: boolean
  className?: string
  variant?: 'default' | 'micro'
  /** Show-modus één regel: titel + balk (WLED en WiZ). */
  showModeStrip?: boolean
  /** WLED: geen live peek, zwarte balk (tweede+ regel of niet-actief event). */
  wledPeekPlaceholder?: boolean
  /** Show-modus actieve cue: Stop + Herzend na de peek-balk (WLED/WiZ). */
  showActiveLightControls?: boolean
  eventRowIndex?: number
}> = ({
  event,
  compact = false,
  className,
  variant = 'default',
  showModeStrip = false,
  wledPeekPlaceholder = false,
  showActiveLightControls = false,
  eventRowIndex,
}) => {
  const devices = useSequencerStore(s => s.appSettings.devices || [])
  const device = event.fixture ? devices.find(d => d.name === event.fixture) : undefined
  if (device?.type === 'wled') {
    return (
      <WledStripPreview
        event={event}
        compact={compact}
        className={className}
        variant={variant}
        layout={showModeStrip ? 'showRow' : 'default'}
        peekPlaceholder={wledPeekPlaceholder}
        showActiveLightControls={showActiveLightControls}
        eventRowIndex={eventRowIndex}
      />
    )
  }
  if (device?.type === 'wiz') {
    return (
      <WizStripPreview
        event={event}
        compact={compact}
        className={className}
        variant={variant}
        layout={showModeStrip ? 'showRow' : 'default'}
        showActiveLightControls={showActiveLightControls}
        eventRowIndex={eventRowIndex}
      />
    )
  }
  return null
}

export default LightFixtureStripPreview
