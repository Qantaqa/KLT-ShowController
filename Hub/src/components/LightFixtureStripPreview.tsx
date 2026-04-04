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
}> = ({
  event,
  compact = false,
  className,
  variant = 'default',
  showModeStrip = false,
  wledPeekPlaceholder = false,
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
      />
    )
  }
  return null
}

export default LightFixtureStripPreview
