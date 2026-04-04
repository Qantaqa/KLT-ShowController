import React, { useMemo } from 'react'

const VideoWallPreviewOverlay: React.FC<{ layout: string; bezelSize?: number }> = ({ layout, bezelSize = 0 }) => {
  const [cols, rows] = useMemo(() => {
    const parts = (layout || '1x1').split('x')
    return [parseInt(parts[0]) || 1, parseInt(parts[1]) || 1]
  }, [layout])

  return (
    <div
      className="absolute inset-0 pointer-events-none p-0.5 videowall-preview-overlay"
      ref={el => {
        if (el) {
          el.style.setProperty('--cols', cols.toString())
          el.style.setProperty('--rows', rows.toString())
          el.style.setProperty('--gap', `${bezelSize / 2}px`)
        }
      }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="border border-white/40 ring-1 ring-black/50" />
      ))}
    </div>
  )
}

export default VideoWallPreviewOverlay
