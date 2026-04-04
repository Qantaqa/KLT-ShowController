/**
 * App-wide toggle for WLED live peek strip + WiZ static color strip (default: on).
 */
export function isLightStripPreviewEnabled(raw: unknown): boolean {
  if (raw === false || raw === 0) return false
  return true
}

/** Show-modus (één regel): vaste titelkolom — WLED en WiZ peeks beginnen op dezelfde x. */
export const LIGHT_STRIP_SHOW_ROW_TITLE_COL_CLASS =
  'block shrink-0 w-40 min-w-40 max-w-40 truncate text-left'
