import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, RefreshCcw, X } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ShowCheckIssue, ShowCheckSeverity, ShowCheckType } from '../utils/showChecks'

const severityMeta: Record<ShowCheckSeverity, { label: string; icon: React.ReactNode; className: string }> = {
  error: { label: 'Fout', icon: <AlertCircle className="w-3.5 h-3.5" />, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
  warning: { label: 'Waarschuwing', icon: <AlertCircle className="w-3.5 h-3.5" />, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  info: { label: 'Info', icon: <Info className="w-3.5 h-3.5" />, className: 'text-white/60 bg-white/5 border-white/10' },
}

const typeLabels: Partial<Record<ShowCheckType, string>> = {
  missing_media_target: 'Media target',
  missing_media_file: 'Media bestand',
  stopat_invalid: 'Stop At',
  light_target_invalid: 'Licht fixture',
  empty_default_comments: 'Commentaar',
  missing_trigger: 'Trigger',
  timed_trigger_invalid: 'Timed trigger',
  script_page_invalid: 'ScriptPg',
  action_marker_inconsistent: 'Actie PDF-marker',
  duplicates_in_event: 'Dubbele fixture',
}

export const ShowCheckPanel: React.FC<{
  open: boolean
  issues: ShowCheckIssue[]
  onClose: () => void
  onRescan: () => void
  onSelectIssue: (issue: ShowCheckIssue) => void
  onFixIssue?: (issue: ShowCheckIssue) => void
}> = ({ open, issues, onClose, onRescan, onSelectIssue, onFixIssue }) => {
  const [query, setQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<ShowCheckSeverity | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return issues.filter(i => {
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false
      if (!q) return true
      const hay = `${i.title} ${i.description} ${i.act ?? ''} ${i.sceneId ?? ''} ${i.eventId ?? ''} ${typeLabels[i.type] ?? i.type}`.toLowerCase()
      return hay.includes(q)
    })
  }, [issues, query, severityFilter])

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 }
    for (const i of issues) c[i.severity]++
    return c
  }, [issues])

  if (!open) return null

  return createPortal(
    <div className="fixed right-4 bottom-4 z-[9997] w-[520px] max-w-[calc(100vw-32px)]">
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Show Check</span>
              <span className="text-xs text-white/80 truncate">
                {issues.length === 0 ? 'Geen problemen gevonden' : `${issues.length} issue(s) gevonden`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRescan}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              title="Opnieuw scannen"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Rescan
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
              title="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Errors</span>
            <span className="text-[9px] font-mono text-red-400">{counts.error}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Warn</span>
            <span className="text-[9px] font-mono text-amber-300">{counts.warning}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Info</span>
            <span className="text-[9px] font-mono text-white/60">{counts.info}</span>
          </div>
          <div className="flex-1" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="h-8 px-3 rounded-xl bg-black/30 border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest outline-none"
            title="Filter severity"
          >
            <option value="all">Alle</option>
            <option value="error">Fouten</option>
            <option value="warning">Waarschuwingen</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className="px-4 py-3 border-b border-white/5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoeken in issues..."
            className="w-full h-9 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-black/40 transition-colors"
          />
        </div>

        <div className="max-h-[50vh] overflow-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-white/40 text-sm italic">
              Geen resultaten
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((issue) => {
                const meta = severityMeta[issue.severity]
                const context = issue.act ? `${issue.act} • ${issue.sceneId ?? 0}.${issue.eventId ?? 0}` : null
                const typeLabel = typeLabels[issue.type] ?? issue.type
                const canFix =
                  !!onFixIssue &&
                  issue.originalIndex !== undefined &&
                  (issue.type === 'missing_trigger' || issue.type === 'empty_default_comments')
                return (
                  <div key={issue.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn('shrink-0 w-28 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5', meta.className)}>
                        {meta.icon}
                        {meta.label}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/90 truncate">{issue.title}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">{typeLabel}</span>
                        </div>
                        {context && (
                          <div className="text-[10px] font-mono opacity-40 mt-0.5">{context}</div>
                        )}
                        <div className="text-[11px] text-white/60 mt-1 leading-relaxed">
                          {issue.description}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => onSelectIssue(issue)}
                            disabled={issue.originalIndex === undefined}
                            className="h-8 px-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-20 disabled:grayscale"
                            title="Selecteer en spring naar deze regel in de grid"
                          >
                            Markeer in grid
                          </button>
                          {canFix && (
                            <button
                              onClick={() => onFixIssue?.(issue)}
                              className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                              title={issue.type === 'missing_trigger' ? 'Voeg een handmatige trigger toe' : 'Verwijder deze lege commentaarregel'}
                            >
                              {issue.type === 'missing_trigger' ? 'Trigger toevoegen' : 'Verwijderen'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

