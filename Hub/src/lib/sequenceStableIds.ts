import type { ShowProfile } from '../types/show'
import type { ShowEvent } from '../types/show'

export function newSequenceRowUid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `row_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** Zet/migreert stabiele ID's voor act/scene/event-groep en elke rij. Idempotent. */
export function ensureStableSequenceIds(events: ShowEvent[]): ShowEvent[] {
    let curActUid: string | undefined
    let curSceneUid: string | undefined
    let curEventUid: string | undefined

    return events.map((e, i) => {
        const t = (e.type || '').toLowerCase()
        const next: ShowEvent = {
            ...e,
            uid: e.uid || newSequenceRowUid(),
            sortOrder: i,
        }

        if (t === 'act') {
            curActUid = e.actUid || newSequenceRowUid()
            curSceneUid = undefined
            curEventUid = undefined
            next.actUid = curActUid
            next.sceneUid = undefined
            next.eventUid = undefined
            return next
        }

        if (!curActUid) {
            curActUid = e.actUid || newSequenceRowUid()
        }
        next.actUid = e.actUid || curActUid

        if (t === 'scene') {
            curSceneUid = e.sceneUid || newSequenceRowUid()
            curEventUid = undefined
            next.sceneUid = curSceneUid
            next.eventUid = undefined
            return next
        }

        if (t === 'title') {
            curEventUid = e.eventUid || newSequenceRowUid()
            next.sceneUid = curSceneUid
            next.eventUid = curEventUid
            return next
        }

        next.sceneUid = curSceneUid
        if (t === 'comment') {
            const evId = e.eventId
            const sid = e.sceneId
            if (sid !== undefined && (evId === undefined || evId === 0)) {
                next.eventUid = undefined
                return next
            }
            if ((sid === undefined || sid === 0) && (evId === undefined || evId === 0)) {
                next.sceneUid = undefined
                next.eventUid = undefined
                return next
            }
        }
        next.eventUid = curEventUid
        return next
    })
}

export function splitEventsIntoActBlocks(events: ShowEvent[]): ShowEvent[][] {
    const ensured = ensureStableSequenceIds(events)
    const blocks: ShowEvent[][] = []
    let i = 0
    while (i < ensured.length) {
        const uid = ensured[i].actUid
        if (!uid) {
            blocks.push([ensured[i]])
            i++
            continue
        }
        const start = i
        i++
        while (i < ensured.length && ensured[i].actUid === uid) i++
        blocks.push(ensured.slice(start, i))
    }
    return blocks
}

function applyKeyRemapRecord<T>(obj: Record<string, T>, pairs: { from: string; to: string }[]): Record<string, T> {
    const out: Record<string, T> = { ...obj }
    const todo = pairs.filter(p => p.from !== p.to)
    todo.forEach((p, idx) => {
        const tmp = `__migt__${idx}`
        if (Object.prototype.hasOwnProperty.call(out, p.from)) {
            out[tmp] = out[p.from]!
            delete out[p.from]
        }
    })
    todo.forEach((p, idx) => {
        const tmp = `__migt__${idx}`
        if (Object.prototype.hasOwnProperty.call(out, tmp)) {
            out[p.to] = out[tmp]!
            delete out[tmp]
        }
    })
    return out
}

/** Hernoem viewState-sleutels naar actUid/sceneUid/eventUid waar mogelijk (best effort). */
export function migrateShowViewStateForStableIds(
    events: ShowEvent[],
    viewState: ShowProfile['viewState'] | undefined
): ShowProfile['viewState'] | undefined {
    if (!viewState) return viewState
    const ens = ensureStableSequenceIds(events)

    const scenePairs: { from: string; to: string }[] = []
    const seenSceneStable = new Set<string>()
    for (const e of ens) {
        if ((e.type || '').toLowerCase() !== 'scene') continue
        if (!e.actUid || !e.sceneUid) continue
        const sid = e.sceneId ?? 0
        const legacy = `${e.act}-${sid}`
        const stable = `${e.actUid}::${e.sceneUid}`
        if (legacy !== stable && !seenSceneStable.has(stable)) {
            seenSceneStable.add(stable)
            scenePairs.push({ from: legacy, to: stable })
        }
    }

    const actPairs: { from: string; to: string }[] = []
    const seenAct = new Set<string>()
    for (const e of ens) {
        if ((e.type || '').toLowerCase() !== 'act' || !e.actUid) continue
        const legacy = `act-${e.act}`
        const stable = `act-${e.actUid}`
        if (legacy !== stable && !seenAct.has(e.actUid)) {
            seenAct.add(e.actUid)
            actPairs.push({ from: legacy, to: stable })
        }
    }

    const sceneCollapsePairs: { from: string; to: string }[] = []
    for (const e of ens) {
        if ((e.type || '').toLowerCase() !== 'scene') continue
        if (!e.actUid || !e.sceneUid) continue
        const sid = e.sceneId ?? 0
        const from = `scene-${e.act}-${sid}`
        const to = `scene-${e.actUid}::${e.sceneUid}`
        if (from !== to) sceneCollapsePairs.push({ from, to })
    }

    const eventCollapsePairs: { from: string; to: string }[] = []
    for (const e of ens) {
        const tl = (e.type || '').toLowerCase()
        if (tl !== 'title' && tl !== 'trigger') continue
        if (!e.actUid || !e.sceneUid || !e.eventUid) continue
        const sid = e.sceneId ?? 0
        const eid = e.eventId ?? 0
        const from = `${e.act}-${sid}-${eid}`
        const to = e.eventUid
        if (from !== to) eventCollapsePairs.push({ from, to })
    }

    const sceneNames = applyKeyRemapRecord({ ...(viewState.sceneNames || {}) }, scenePairs)
    const sceneScriptPages = applyKeyRemapRecord({ ...(viewState.sceneScriptPages || {}) }, scenePairs)
    let collapsedGroups: Record<string, boolean> = { ...(viewState.collapsedGroups || {}) }
    collapsedGroups = applyKeyRemapRecord(collapsedGroups, actPairs)
    collapsedGroups = applyKeyRemapRecord(collapsedGroups, sceneCollapsePairs)
    collapsedGroups = applyKeyRemapRecord(collapsedGroups, eventCollapsePairs)

    return {
        ...viewState,
        sceneNames,
        sceneScriptPages,
        collapsedGroups,
    }
}

export function stableSceneMetaKey(e: Pick<ShowEvent, 'actUid' | 'sceneUid' | 'act' | 'sceneId'>): string {
    if (e.actUid && e.sceneUid) return `${e.actUid}::${e.sceneUid}`
    return `${e.act}-${e.sceneId ?? 0}`
}

/** Align met SequenceGrid `storageActKey` / runtime collapsed state. */
export function collapseStorageActKeyFromEvent(e: Pick<ShowEvent, 'act' | 'actUid'>): string {
    return e.actUid ? `act-${e.actUid}` : `act-${e.act}`
}

export function collapseStorageSceneKeyFromEvent(e: ShowEvent): string {
    if (e.actUid && e.sceneUid) return `scene-${e.actUid}::${e.sceneUid}`
    return `scene-${e.act}-${e.sceneId ?? 0}`
}

export function collapseStorageEventKeyFromEvent(e: ShowEvent): string {
    return e.eventUid || `${e.act}-${e.sceneId ?? 0}-${e.eventId ?? 0}`
}
