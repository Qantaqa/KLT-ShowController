/**
 * Decode WLED "Peek" / live LED streams.
 * - WebSocket (recommended): binary frames starting with 'L' (see WLED wled00/ws.cpp).
 * - Legacy JSON: HTTP /json/live or old WS text payloads with { leds: ["RRGGBB", ...] }.
 */

export type WledLiveFrame = {
  rgb: Uint8Array
  /** When set, draw as w×h matrix (row-major in rgb). */
  grid?: { w: number; h: number }
}

export function parseWledLiveMessage(data: string | ArrayBuffer): WledLiveFrame | null {
  if (typeof data === 'string') {
    return parseWledLiveJsonText(data)
  }
  return parseWledLiveBinary(data)
}

function parseWledLiveBinary(buf: ArrayBuffer): WledLiveFrame | null {
  const u = new Uint8Array(buf)
  if (u.length < 3 || u[0] !== 0x4c) return null
  const ver = u[1]
  let off = 2
  let grid: { w: number; h: number } | undefined
  if (ver === 2) {
    if (u.length < 4) return null
    grid = { w: u[2]!, h: u[3]! }
    off = 4
  } else if (ver !== 1) {
    return null
  }
  const rgb = u.subarray(off)
  if (rgb.length === 0 || rgb.length % 3 !== 0) return null
  if (grid) {
    const cells = rgb.length / 3
    if (grid.w <= 0 || grid.h <= 0 || grid.w * grid.h !== cells) {
      grid = undefined
    }
  }
  return { rgb, grid }
}

function parseWledLiveJsonText(text: string): WledLiveFrame | null {
  const t = text.trim()
  if (!t.startsWith('{') || !t.includes('"leds"')) return null
  try {
    const j = JSON.parse(t) as { leds?: unknown }
    const leds = j.leds
    if (!Array.isArray(leds) || leds.length === 0) return null
    const out = new Uint8Array(leds.length * 3)
    let ok = 0
    for (let i = 0; i < leds.length; i++) {
      const hex = String(leds[i] ?? '')
        .replace(/^#/, '')
        .toUpperCase()
      if (!/^[0-9A-F]{6}$/.test(hex)) continue
      out[i * 3] = parseInt(hex.slice(0, 2), 16)
      out[i * 3 + 1] = parseInt(hex.slice(2, 4), 16)
      out[i * 3 + 2] = parseInt(hex.slice(4, 6), 16)
      ok++
    }
    if (ok !== leds.length) return null
    return { rgb: out }
  } catch {
    return null
  }
}

export function drawWledLiveFrame(
  ctx: CanvasRenderingContext2D,
  frame: WledLiveFrame,
  width: number,
  height: number
): void {
  const { rgb, grid } = frame
  const n = rgb.length / 3
  if (n <= 0 || width <= 0 || height <= 0) return

  if (grid) {
    const { w, h } = grid
    const cellW = width / w
    const cellH = height / h
    let idx = 0
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const r = rgb[idx++]
        const g = rgb[idx++]
        const b = rgb[idx++]
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(
          Math.floor(col * cellW),
          Math.floor(row * cellH),
          Math.max(1, Math.ceil(cellW)),
          Math.max(1, Math.ceil(cellH))
        )
      }
    }
    return
  }

  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3]
    const g = rgb[i * 3 + 1]
    const b = rgb[i * 3 + 2]
    const x0 = Math.floor((i * width) / n)
    const x1 = Math.ceil(((i + 1) * width) / n)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x0, 0, Math.max(1, x1 - x0), height)
  }
}
