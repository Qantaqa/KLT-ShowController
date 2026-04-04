/** Options coming from `wled_effects` / `wled_palettes` queries */

export type WledCatalogOption = { id: number; name: string }

const LOCALE = 'nl'

/** Palette IDs pinned directly under “Geen”, in display order (matches WLED “special” palettes). */
export const WLED_PALETTE_PINNED_IDS: readonly number[] = [0, 2, 3, 4, 5, 1]

/**
 * Effects: Solid (id 0) first after the empty “Geen” row; all other effects A–Z.
 */
export function sortWledEffectsForUi(options: WledCatalogOption[]): WledCatalogOption[] {
  const solid = options.find(o => o.id === 0)
  const rest = options
    .filter(o => o.id !== 0)
    .sort((a, b) => a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' }))
  return solid ? [solid, ...rest] : rest
}

/**
 * Palettes: pinned built-ins first, then remaining by name.
 */
export function sortWledPalettesForUi(options: WledCatalogOption[]): WledCatalogOption[] {
  const byId = new Map(options.map(o => [o.id, o]))
  const pinned: WledCatalogOption[] = []
  for (const id of WLED_PALETTE_PINNED_IDS) {
    const o = byId.get(id)
    if (o) pinned.push(o)
  }
  const pinSet = new Set(WLED_PALETTE_PINNED_IDS)
  const rest = options
    .filter(o => !pinSet.has(o.id))
    .sort((a, b) => a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' }))
  return [...pinned, ...rest]
}
