import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Upload, AlertCircle, Loader2, X, WifiOff, RefreshCw } from 'lucide-react'
import { videoWallAgentService } from '../services/videowall-agent-service'
import type { VideoWallAgentDevice } from '../types/devices'
import type { ShowEvent } from '../types/show'
import { modalBtnIconClass, modalBtnPrimary, modalBtnSecondary } from '../lib/utils'

interface PreflightItem {
    agentId: string
    agentName: string
    filename: string
    localPath: string
    status: 'pending' | 'checking' | 'present' | 'uploading' | 'done' | 'error'
    percent?: number
    error?: string
}

interface OfflineAgent {
    agentId: string
    agentName: string
}

interface MediaPreflightModalProps {
    /** All enabled videowall agents from app settings */
    agents: VideoWallAgentDevice[]
    /** All show events to determine which media belongs to which agent */
    events: ShowEvent[]
    onComplete: () => void
    onCancel: () => void
}

/**
 * Pre-flight media check modal.
 *
 * For each online agent:
 *  1. Determine which media files are used by that specific agent (via event.fixture matching)
 *  2. Check each file's presence on the agent
 *  3. Upload any missing files with live progress bars
 *
 * Agents that are offline are listed but skipped.
 */
const MediaPreflightModal: React.FC<MediaPreflightModalProps> = ({ agents, events, onComplete, onCancel }) => {
    const [items, setItems] = useState<PreflightItem[]>([])
    const [offlineAgents, setOfflineAgents] = useState<OfflineAgent[]>([])
    const [phase, setPhase] = useState<'init' | 'running' | 'done' | 'error'>('init')
    const [overallMessage, setOverallMessage] = useState('Online agents controleren...')

    const updateItem = useCallback((agentId: string, filename: string, update: Partial<PreflightItem>) => {
        setItems(prev => prev.map(item =>
            item.agentId === agentId && item.filename === filename
                ? { ...item, ...update }
                : item
        ))
    }, [])

    const run = useCallback(async () => {
        setPhase('running')

        // ── Step 1: Check which agents are online ─────────────────────────────
        setOverallMessage('Online status controleren...')
        const onlineAgents: VideoWallAgentDevice[] = []
        const offline: OfflineAgent[] = []

        await Promise.all(agents.map(async agent => {
            try {
                await videoWallAgentService.checkFile(agent, '__ping__')
                // checkFile returns { exists: false } on a working agent (file not found is fine)
                // It throws/returns false only on network failure
                onlineAgents.push(agent)
            } catch {
                offline.push({ agentId: agent.id, agentName: agent.name })
            }
        }))

        setOfflineAgents(offline)

        if (onlineAgents.length === 0) {
            setPhase('error')
            setOverallMessage('Geen online agents gevonden. Toch doorgaan?')
            return
        }

        // ── Step 2: Build per-agent → file map ────────────────────────────────
        // event.fixture contains the device id or device name that this event targets
        const agentFileMap = new Map<string, Map<string, string>>()
        // key: agentId  →  Map<filename, localPath>

        for (const agent of onlineAgents) {
            // Collect all media events that target this agent
            // Match by agent.id, agent.name, or case-insensitive fixture contains agent name
            const agentEvents = events.filter(e => {
                if (!e.filename || e.type?.toLowerCase() !== 'media') return false
                const fixture = (e.fixture || '').toLowerCase()
                return (
                    fixture === agent.id.toLowerCase() ||
                    fixture === agent.name.toLowerCase() ||
                    fixture.includes(agent.name.toLowerCase()) ||
                    agent.name.toLowerCase().includes(fixture)
                )
            })

            if (agentEvents.length === 0) continue

            const fileMap = new Map<string, string>()
            for (const e of agentEvents) {
                const rawPath = e.filename!
                let filename = rawPath.split(/[/\\]/).pop() || rawPath
                try { filename = decodeURIComponent(filename) } catch (_) { }
                if (!fileMap.has(filename)) fileMap.set(filename, rawPath)
            }

            if (fileMap.size > 0) agentFileMap.set(agent.id, fileMap)
        }

        if (agentFileMap.size === 0) {
            setOverallMessage('Geen media gevonden voor online agents. Starten...')
            setPhase('done')
            setTimeout(onComplete, 1000)
            return
        }

        // ── Step 3: Build flattened item list for the UI ──────────────────────
        const initialItems: PreflightItem[] = []
        for (const agent of onlineAgents) {
            const fileMap = agentFileMap.get(agent.id)
            if (!fileMap) continue
            for (const [filename, localPath] of fileMap.entries()) {
                initialItems.push({ agentId: agent.id, agentName: agent.name, filename, localPath, status: 'pending' })
            }
        }
        setItems(initialItems)

        // ── Step 4: Check & upload ────────────────────────────────────────────
        let hasError = false

        for (const agent of onlineAgents) {
            const fileMap = agentFileMap.get(agent.id)
            if (!fileMap) continue

            for (const [filename, localPath] of fileMap.entries()) {
                updateItem(agent.id, filename, { status: 'checking' })
                setOverallMessage(`${agent.name}: controleren... ${filename}`)

                const check = await videoWallAgentService.checkFile(agent, filename)

                if (check.exists) {
                    updateItem(agent.id, filename, { status: 'present', percent: 100 })
                } else {
                    updateItem(agent.id, filename, { status: 'uploading', percent: 0 })
                    setOverallMessage(`${agent.name}: uploaden... ${filename}`)

                    try {
                        // Register progress callback for live UI updates
                        videoWallAgentService.onProgress(state => {
                            if (state.deviceId === agent.id && state.filename === filename) {
                                if (state.status === 'uploading') {
                                    updateItem(agent.id, filename, { percent: state.percent })
                                } else if (state.status === 'complete' || state.status === 'skipped') {
                                    updateItem(agent.id, filename, { status: 'done', percent: 100 })
                                } else if (state.status === 'error') {
                                    updateItem(agent.id, filename, { status: 'error', error: state.error })
                                    hasError = true
                                }
                            }
                        })

                        await videoWallAgentService.syncFileWithProgress(agent, localPath, filename)
                        updateItem(agent.id, filename, { status: 'done', percent: 100 })

                        // Clear progress callback after each file
                        videoWallAgentService.onProgress(() => { })
                    } catch (err: any) {
                        updateItem(agent.id, filename, { status: 'error', error: err?.message || 'Upload mislukt' })
                        hasError = true
                    }
                }
            }
        }

        if (hasError) {
            setPhase('error')
            setOverallMessage('Sommige bestanden konden niet worden geüpload. Toch doorgaan?')
        } else {
            setPhase('done')
            setOverallMessage('Alle media aanwezig. Show starten...')
            setTimeout(onComplete, 1200)
        }
    }, [agents, events, onComplete, updateItem])

    useEffect(() => {
        run()
    }, [run])

    const allDone = items.every(i => i.status === 'present' || i.status === 'done' || i.status === 'error')

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        {phase === 'running' && !allDone && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                        {phase === 'done' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {phase === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {phase === 'running' && allDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                        <span className="font-black text-sm uppercase tracking-widest">Pre-flight Media Check</span>
                    </div>
                    <button onClick={onComplete} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Overslaan en toch starten">
                        <X className="w-4 h-4 opacity-40" />
                    </button>
                </div>

                {/* Status message */}
                <div className="px-6 py-3 border-b border-white/5">
                    <p className="text-xs text-white/60 font-mono">{overallMessage}</p>
                </div>

                {/* Offline agents warning */}
                {offlineAgents.length > 0 && (
                    <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/10">
                        <div className="flex items-center gap-2 mb-1">
                            <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Offline – Media niet controleerbaar</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {offlineAgents.map(a => (
                                <span key={a.agentId} className="text-[10px] font-mono bg-red-500/10 text-red-300 px-2 py-0.5 rounded-md">{a.agentName}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Item list */}
                {items.length > 0 && (
                    <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 px-6 py-3">
                                <div className="shrink-0">
                                    {item.status === 'pending' && <div className="w-4 h-4 rounded-full border border-white/20 bg-white/5" />}
                                    {item.status === 'checking' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                                    {item.status === 'present' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {item.status === 'uploading' && <Upload className="w-4 h-4 text-amber-400 animate-pulse" />}
                                    {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-white/40 shrink-0">{item.agentName}</span>
                                        <span className="text-xs font-mono text-white/80 truncate">{item.filename}</span>
                                    </div>
                                    {item.status === 'uploading' && (
                                        <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 transition-all duration-300 rounded-full w-0"
                                                ref={(el) => { if (el) el.style.setProperty('width', `${item.percent ?? 0}%`) }}
                                            />
                                        </div>
                                    )}
                                    {item.status === 'error' && (
                                        <div className="text-[10px] text-red-400 mt-0.5">{item.error}</div>
                                    )}
                                </div>
                                <div className="text-[10px] font-mono text-white/30 shrink-0">
                                    {item.status === 'present' ? 'Aanwezig' :
                                        item.status === 'done' ? 'Geüpload' :
                                            item.status === 'uploading' ? `${item.percent ?? 0}%` :
                                                item.status === 'error' ? 'Fout' :
                                                    item.status === 'checking' ? 'Controleren' : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No media found state */}
                {items.length === 0 && phase === 'running' && (
                    <div className="px-6 py-6 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-white/40">Online status controleren...</p>
                    </div>
                )}

                {/* Footer: always show skip + cancel; error state shows extra retry option */}
                {phase !== 'done' && (
                    <div className="flex flex-wrap gap-2 sm:gap-3 px-6 py-4 border-t border-white/5">
                        <button type="button" onClick={onCancel} className={modalBtnSecondary('py-2.5')}>
                            <X className={modalBtnIconClass} />
                            Annuleren
                        </button>
                        <button
                            type="button"
                            onClick={onComplete}
                            className={modalBtnPrimary('flex-1 min-w-[12rem] justify-center py-2.5')}
                        >
                            <CheckCircle className="h-4 w-4 shrink-0 text-white" />
                            Overslaan – Toch Starten
                        </button>
                        {phase === 'error' && (
                            <button type="button" onClick={run} className={modalBtnSecondary('py-2.5 border-amber-500/40 hover:border-amber-500/55')}>
                                <RefreshCw className={modalBtnIconClass} />
                                Opnieuw
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MediaPreflightModal
