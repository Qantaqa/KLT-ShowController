import type { ShowEvent } from '../types/show'

/** Primaire opslagsleutel timing (DB / maps); bij voorkeur UID-based zodat hernoemen act geen sleutel breekt. */
export function transitionKeyFromGroupEvent(e: Pick<ShowEvent, 'act' | 'actUid' | 'sceneUid' | 'eventUid' | 'sceneId' | 'eventId'>): string {
    if (e.actUid && e.sceneUid && e.eventUid) {
        return `${e.actUid}\t${e.sceneUid}\t${e.eventUid}`
    }
    return `${e.act}|${e.sceneId ?? 0}|${e.eventId ?? 0}`
}

export function transitionLookupKeys(e: ShowEvent): string[] {
    const keys: string[] = []
    if (e.actUid && e.sceneUid && e.eventUid) {
        keys.push(`${e.actUid}\t${e.sceneUid}\t${e.eventUid}`)
    }
    keys.push(`${e.act}|${e.sceneId ?? 0}|${e.eventId ?? 0}`)
    return [...new Set(keys)]
}

/**
 * Prefer durations aggregated from the `show_timing` table; fallback to `timingSamples` on the sequence row
 * (e.g. unsaved session, or web build without DB reads).
 */
export function getTransitionTimingSamples(
    trigger: ShowEvent,
    dbMap: Record<string, number[]>
): number[] {
    for (const key of transitionLookupKeys(trigger)) {
        const fromDb = dbMap[key]
        if (fromDb && fromDb.length > 0) return fromDb
    }
    return trigger.timingSamples || []
}
