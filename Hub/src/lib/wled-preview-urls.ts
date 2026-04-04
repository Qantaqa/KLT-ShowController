/** Hub file-server URLs for bundled GIF previews (`database/Effects`, `database/Palettes`). */

export function wledEffectPreviewUrl(effectId: number | undefined, serverHost: string, filePort: number): string | null {
  if (effectId === undefined || effectId < 0) return null
  return `http://${serverHost}:${filePort}/wled/effects/${effectId}.gif`
}

export function wledPalettePreviewUrl(paletteId: number | undefined, serverHost: string, filePort: number): string | null {
  if (paletteId === undefined || paletteId < 0) return null
  return `http://${serverHost}:${filePort}/wled/palettes/${paletteId}.gif`
}

export const WLED_PREVIEW_IMG_FALLBACK =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
