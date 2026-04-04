import type { ShowEvent } from '../types/show'
import type { Device } from '../types/devices'

export type ShowCheckSeverity = 'error' | 'warning' | 'info'
export type ShowCheckType =
  | 'missing_media_target'
  | 'missing_media_file'
  | 'stopat_invalid'
  | 'light_target_invalid'
  | 'empty_default_comments'
  | 'missing_trigger'
  | 'timed_trigger_invalid'
  | 'script_page_invalid'
  | 'action_marker_inconsistent'
  | 'duplicates_in_event'

export type ShowCheckIssue = {
  id: string
  severity: ShowCheckSeverity
  type: ShowCheckType
  title: string
  description: string
  /** Index into sequencer `events` array (row to select), if applicable */
  originalIndex?: number
  act?: string
  sceneId?: number
  eventId?: number
}

type ActiveShowLike = {
  totalPages?: number
}

export function runShowChecks(args: {
  events: ShowEvent[]
  devices: Device[]
  activeShow?: ActiveShowLike | null
  isHost?: boolean
}): ShowCheckIssue[] {
  const { events, devices, activeShow, isHost } = args

  const issues: ShowCheckIssue[] = []

  const deviceNames = new Set(
    (devices || []).filter(d => (d as any).enabled !== false).map(d => (d.name || '').trim().toLowerCase()).filter(Boolean)
  )

  const fileExists = (path: string) => {
    if (!isHost) return undefined
    if (!path) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fs = (window as any).require?.('fs')
      if (!fs?.existsSync) return undefined
      return !!fs.existsSync(path)
    } catch {
      return undefined
    }
  }

  const normalizeType = (e: ShowEvent) => (e.type || '').toLowerCase()
  const groupKey = (act?: string, sceneId?: number, eventId?: number) => `${act || ''}|${sceneId ?? 0}|${eventId ?? 0}`

  const titleGroupKeys = new Set<string>()
  // A stop marker should target a real event (Title row group). Keep those keys for validation.
  // Pre-pass: collect Title rows (valid jump/stop targets).
  events.forEach((e) => {
    const act = e.act
    const sceneId = e.sceneId ?? 0
    const eventId = e.eventId ?? 0
    const key = groupKey(act, sceneId, eventId)
    const t = normalizeType(e)
    if (t === 'title') titleGroupKeys.add(key)
  })

  // Ordered event groups (by Title rows) to validate transitions.
  // In the grid, the transition strip is rendered *after* an event card, using that event's Trigger row.
  // Therefore: every Title-group except the very last Title-group should have a Trigger row.
  const orderedTitleKeys: string[] = []
  const seenTitleKeys = new Set<string>()
  events.forEach((e) => {
    if (normalizeType(e) !== 'title') return
    const act = e.act || ''
    const sceneId = e.sceneId ?? 0
    const eventId = e.eventId ?? 0
    if (eventId === 0) return
    const key = groupKey(act, sceneId, eventId)
    if (seenTitleKeys.has(key)) return
    seenTitleKeys.add(key)
    orderedTitleKeys.push(key)
  })
  const mustHaveTrigger = new Set<string>(orderedTitleKeys.slice(0, Math.max(0, orderedTitleKeys.length - 1)))

  // Group rows by (act, sceneId, eventId) for per-event checks.
  const rowsByGroup = new Map<string, { act: string; sceneId: number; eventId: number; rows: { e: ShowEvent; idx: number }[] }>()
  events.forEach((e, idx) => {
    const act = e.act || ''
    const sceneId = e.sceneId ?? 0
    const eventId = e.eventId ?? 0
    const key = groupKey(act, sceneId, eventId)
    const existing = rowsByGroup.get(key)
    if (existing) existing.rows.push({ e, idx })
    else rowsByGroup.set(key, { act, sceneId, eventId, rows: [{ e, idx }] })
  })

  const isPlaceholderComment = (cue?: string) => {
    const v = (cue || '').trim()
    return v === '' || v === 'Nieuw commentaar' || v === 'Opmerkingen' || v === 'Opmerking'
  }

  const toNumberOrUndef = (v: unknown) => {
    if (v === null || v === undefined) return undefined
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
    return Number.isFinite(n) ? n : undefined
  }

  const makeId = (type: ShowCheckType, idx?: number, key?: string) =>
    `${type}:${idx ?? ''}:${key ?? ''}`

  for (const [key, group] of rowsByGroup.entries()) {
    const { act, sceneId, eventId, rows } = group

    // Skip structural groups (eventId 0 often holds Act/Scene-level rows)
    if (eventId === 0) continue

    const titleRow = rows.find(r => normalizeType(r.e) === 'title')
    const triggerRow = rows.find(r => normalizeType(r.e) === 'trigger')

    // Missing trigger row: only required when this event has a following Title-event.
    if (!triggerRow && mustHaveTrigger.has(key)) {
      issues.push({
        id: makeId('missing_trigger', titleRow?.idx ?? rows[0]?.idx, key),
        severity: 'warning',
        type: 'missing_trigger',
        title: 'Trigger ontbreekt',
        description: `Dit event heeft geen overgang/trigger regel. Voeg een trigger toe om (handmatige/timed/media) overgang te definiëren.`,
        originalIndex: titleRow?.idx ?? rows[0]?.idx,
        act,
        sceneId,
        eventId
      })
    } else if (triggerRow && (triggerRow.e.effect || '').toLowerCase() === 'timed') {
      const dur = triggerRow.e.duration || 0
      if (dur <= 0) {
        issues.push({
          id: makeId('timed_trigger_invalid', triggerRow.idx, key),
          severity: 'warning',
          type: 'timed_trigger_invalid',
          title: 'Timed trigger zonder duur',
          description: `Deze timed trigger heeft duration=0. Stel een vertraging in (MM:SS).`,
          originalIndex: triggerRow.idx,
          act,
          sceneId,
          eventId
        })
      }
    }

    // Script page validity (Title row)
    if (titleRow) {
      const pg = titleRow.e.scriptPg
      const totalPages = activeShow?.totalPages || 0
      if (pg !== undefined) {
        if (pg <= 0) {
          issues.push({
            id: makeId('script_page_invalid', titleRow.idx, key),
            severity: 'warning',
            type: 'script_page_invalid',
            title: 'Script pagina ongeldig',
            description: `ScriptPg is ${pg}. Gebruik een pagina > 0.`,
            originalIndex: titleRow.idx,
            act,
            sceneId,
            eventId
          })
        } else if (totalPages > 0 && pg > totalPages) {
          issues.push({
            id: makeId('script_page_invalid', titleRow.idx, key),
            severity: 'warning',
            type: 'script_page_invalid',
            title: 'Script pagina buiten PDF bereik',
            description: `ScriptPg is ${pg} maar de PDF heeft ${totalPages} pagina's.`,
            originalIndex: titleRow.idx,
            act,
            sceneId,
            eventId
          })
        }
      }
    }

    // Per-row checks (media/light/comment + stopAt)
    const fixturesInGroup: { fixture: string; idx: number; type: string }[] = []

    for (const { e, idx } of rows) {
      const t = normalizeType(e)

      if (t === 'comment' && isPlaceholderComment(e.cue)) {
        issues.push({
          id: makeId('empty_default_comments', idx, key),
          severity: 'info',
          type: 'empty_default_comments',
          title: 'Lege commentaarregel',
          description: `Deze commentaarregel is leeg/placeholder en kan verwijderd worden.`,
          originalIndex: idx,
          act,
          sceneId,
          eventId
        })
      }

      if (t === 'media') {
        const fixture = (e.fixture || '').trim()
        if (!fixture) {
          issues.push({
            id: makeId('missing_media_target', idx, key),
            severity: 'error',
            type: 'missing_media_target',
            title: 'Media zonder target',
            description: `Deze media heeft geen output/fixture geselecteerd.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        } else if (!deviceNames.has(fixture.toLowerCase())) {
          issues.push({
            id: makeId('missing_media_target', idx, key),
            severity: 'error',
            type: 'missing_media_target',
            title: 'Media target bestaat niet',
            description: `Target \"${fixture}\" is niet gevonden in devices.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        }

        const filename = (e.filename || '').trim()
        if (!filename) {
          issues.push({
            id: makeId('missing_media_file', idx, key),
            severity: 'error',
            type: 'missing_media_file',
            title: 'Media zonder bestand',
            description: `Deze media heeft geen filename/bron ingesteld.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        } else {
          const exists = fileExists(filename)
          if (exists === false) {
            issues.push({
              id: makeId('missing_media_file', idx, key),
              severity: 'error',
              type: 'missing_media_file',
              title: 'Media bestand niet gevonden',
              description: `Bestand bestaat niet op host: ${filename}`,
              originalIndex: idx,
              act,
              sceneId,
              eventId
            })
          }
        }

        if (fixture) fixturesInGroup.push({ fixture, idx, type: 'media' })
      }

      if (t === 'light') {
        const fixture = (e.fixture || '').trim()
        if (!fixture) {
          issues.push({
            id: makeId('light_target_invalid', idx, key),
            severity: 'error',
            type: 'light_target_invalid',
            title: 'Licht zonder fixture',
            description: `Deze lichtactie heeft geen fixture/device geselecteerd.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        } else if (!deviceNames.has(fixture.toLowerCase())) {
          issues.push({
            id: makeId('light_target_invalid', idx, key),
            severity: 'error',
            type: 'light_target_invalid',
            title: 'Licht fixture bestaat niet',
            description: `Fixture \"${fixture}\" is niet gevonden in devices.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        } else {
          fixturesInGroup.push({ fixture, idx, type: 'light' })
        }
      }

      if (t === 'action') {
        const fixture = (e.fixture || '').trim()
        if (fixture) fixturesInGroup.push({ fixture, idx, type: 'action' })

        const mn = e.scriptMarkerNorm
        const hasMarker =
          !!mn &&
          typeof mn.x === 'number' &&
          typeof mn.y === 'number' &&
          Number.isFinite(mn.x) &&
          Number.isFinite(mn.y)
        const pg = toNumberOrUndef(e.scriptPg)
        if (hasMarker && (!pg || pg <= 0)) {
          issues.push({
            id: makeId('action_marker_inconsistent', idx, key),
            severity: 'warning',
            type: 'action_marker_inconsistent',
            title: 'Actie-marker zonder scriptpagina',
            description:
              'Deze actie heeft een positie-marker op de PDF maar geen geldige scriptpagina. Stel scriptpagina in of wis de marker.',
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        }
      }

      // StopAt validation:
      // Stop markers are intended for action rows (media/light, and potentially other action rows).
      // We validate only on actionable row types to avoid noise on structural rows.
      const hasStopMarker =
        ((e.stopAct || '') as any) !== null && ((e.stopAct || '') as any) !== undefined && String(e.stopAct || '').trim() !== '' ||
        (e.stopSceneId !== null && e.stopSceneId !== undefined) ||
        (e.stopEventId !== null && e.stopEventId !== undefined)

      if ((t === 'media' || t === 'light' || t === 'action') && hasStopMarker) {
        const stopSceneId = toNumberOrUndef(e.stopSceneId)
        const stopEventId = toNumberOrUndef(e.stopEventId)
        const explicitStopAct = String(e.stopAct || '').trim()
        // If only scene/event is set, default act to the current row's act (same behavior as runtime stop logic).
        const stopAct =
          explicitStopAct ||
          ((stopSceneId !== undefined || stopEventId !== undefined)
            ? String(e.act || '').trim()
            : '')

        // If Act is set but scene/event is missing, report as incomplete rather than "unknown 0.0".
        if (stopAct && (stopSceneId === undefined || stopEventId === undefined)) {
          issues.push({
            id: makeId('stopat_invalid', idx, `${key}->${stopAct}|${String(e.stopSceneId)}|${String(e.stopEventId)}`),
            severity: 'warning',
            type: 'stopat_invalid',
            title: 'Stop At is niet volledig ingesteld',
            description: `Stop At heeft act="${stopAct}" maar mist scene/event nummer. Kies opnieuw een geldig stop-moment.`,
            originalIndex: idx,
            act,
            sceneId,
            eventId
          })
        } else if (stopAct && stopSceneId !== undefined && stopEventId !== undefined) {
          const stopKey = groupKey(stopAct, stopSceneId, stopEventId)
          // Only Title groups count as valid stop targets.
          if (!titleGroupKeys.has(stopKey)) {
            issues.push({
              id: makeId('stopat_invalid', idx, `${key}->${stopKey}`),
              severity: 'warning',
              type: 'stopat_invalid',
              title: 'Stop At verwijst naar onbekend event',
              description: `Stop At wijst naar ${stopAct}.${stopSceneId}.${stopEventId}, maar dat event is niet gevonden.`,
              originalIndex: idx,
              act,
              sceneId,
              eventId
            })
          }
        }
      }
    }

    // Duplicate fixture within event group
    const byFixture = new Map<string, { first: { idx: number; type: string }; dups: { idx: number; type: string }[] }>()
    for (const f of fixturesInGroup) {
      const k = f.fixture.trim().toLowerCase()
      if (!k) continue
      const existing = byFixture.get(k)
      if (!existing) byFixture.set(k, { first: { idx: f.idx, type: f.type }, dups: [] })
      else existing.dups.push({ idx: f.idx, type: f.type })
    }
    for (const [fixtureKey, info] of byFixture.entries()) {
      if (info.dups.length === 0) continue
      const firstName = fixturesInGroup.find(x => x.idx === info.first.idx)?.fixture || fixtureKey
      issues.push({
        id: makeId('duplicates_in_event', info.first.idx, `${key}:${fixtureKey}`),
        severity: 'warning',
        type: 'duplicates_in_event',
        title: 'Dubbele fixture in event',
        description: `Fixture \"${firstName}\" komt meerdere keren voor binnen dit event.`,
        originalIndex: info.first.idx,
        act,
        sceneId,
        eventId
      })
    }
  }

  return issues
}

