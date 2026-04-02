import type { ShowEvent } from '../types/show'

export function transitionKeyFromGroupEvent(e: Pick<ShowEvent, 'act' | 'sceneId' | 'eventId'>): string {
    return `${e.act}|${e.sceneId ?? 0}|${e.eventId ?? 0}`
}

/**
 * Prefer durations aggregated from the `show_timing` table; fallback to `timingSamples` on the sequence row
 * (e.g. unsaved session, or web build without DB reads).
 */
export function getTransitionTimingSamples(
    trigger: ShowEvent,
    dbMap: Record<string, number[]>
): number[] {
    const key = transitionKeyFromGroupEvent(trigger)
    const fromDb = dbMap[key]
    if (fromDb && fromDb.length > 0) return fromDb
    return trigger.timingSamples || []
}
