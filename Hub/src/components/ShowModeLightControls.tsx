import React, { useState } from 'react'
import { Square, Send } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import { networkService } from '../services/network-service'

/**
 * Show-modus, actieve lichtcue: stop (strip zwart) + herzend naar apparaat.
 */
const ShowModeLightControls: React.FC<{ fixture: string; rowIndex: number }> = ({ fixture, rowIndex }) => {
  const resendEvent = useSequencerStore(s => s.resendEvent)
  const addToast = useSequencerStore(s => s.addToast)
  const [stopBusy, setStopBusy] = useState(false)

  const fix = fixture.trim()
  if (!fix) return null

  /** Zelfde basis als mediaregel (pause/stop): grijs vlak, wit icoon, rounded-full */
  const iconBtnCls =
    'shrink-0 p-1.5 bg-white/10 text-white rounded-full transition-colors hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none'

  const onStop = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (stopBusy) return
    setStopBusy(true)
    try {
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron')
        const r = await ipcRenderer.invoke('light:fixture-black', { fixture: fix })
        if (r && !r.ok) addToast(r.error || 'Lamp stop mislukt', 'error')
      } else {
        networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'lightFixtureBlack', fixture: fix })
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Lamp stop mislukt', 'error')
    } finally {
      setStopBusy(false)
    }
  }

  const onResend = (e: React.MouseEvent) => {
    e.stopPropagation()
    resendEvent(rowIndex)
  }

  return (
    <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        disabled={stopBusy}
        onClick={onStop}
        className={iconBtnCls}
        title="LED(s) volledig zwart (alle WLED-segmenten / WiZ RGB uit)"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
      <button
        type="button"
        onClick={onResend}
        className={iconBtnCls}
        title="Cue opnieuw naar apparaat sturen (kleur, palette, helderheid, effect)"
      >
        <Send className="h-3 w-3 stroke-[2.25]" />
      </button>
    </div>
  )
}

export default ShowModeLightControls
