---
name: WLED API

description: >
  Theatre-grade control skill for WLED devices providing deterministic cue execution
  via JSON API, asynchronous state synchronisation via MQTT, and low-latency realtime
  pixel streaming via DDP. Enables multi-node synchronisation, preset abstraction,
  and realtime FX rendering within AntiGravity.

---

# WLED Skill for AntiGravity

Skill ID: skill.wled
Version: 2.0.0

---

## Doel

De WLED Skill abstraheert één of meerdere WLED-nodes naar een theatraal aanstuurbare fixture-laag binnen AntiGravity.

Ondersteunde transportlagen:

- JSON HTTP → Cue-based control
- MQTT → State sync & monitoring
- DDP → Realtime pixel output

---

## Architectuur

Flow Engine → WLED Skill → Transport Layer → WLED Node(s)

De skill verzorgt:

- State caching
- Deterministische updates
- Multi-node sync
- Transport fallback
- Realtime control

---

## JSON API – Protocol Gedrag

Beschikbare endpoints:

/json  
/json/state  
/json/info  
/json/eff  
/json/pal  

Gebruik:

- /json/state → runtime control
- /json/info → health checks
- /json/eff → effect mapping

### Partial Updates

POST naar:

/json/state

Voorbeeld:

{"on":true,"bri":255}

Alleen opgegeven velden worden aangepast.

### Segment Control

Toggle:

{"seg":[{"id":0,"on":"t"}]}

Kleur:

{"seg":[{"id":0,"col":[[0,255,200]]}]}

Skill gebruikt expliciete states (geen toggle).

### Effect Compatibiliteit

Onbeschikbare effecten kunnen verschijnen als:

RSVD

Skill filtert deze automatisch.

### State Echo

{"v":true}

Wordt gebruikt voor cache synchronisatie.

---

## MQTT API

Gebruik voor:

- State monitoring
- Failure detectie
- Sync

Topics:

wled/{node}/state  
wled/{node}/api

Voorbeeld:

Topic: wled/arch_left/api  
Payload: {"bri":150}

---

## DDP Realtime

UDP poort: 4048

Gebruik voor:

- Pixel mapping
- Video effects
- Realtime FX

DDP vervangt tijdelijk:

- Presets
- FX engine
- Palettes

Skill verwerkt brightness lokaal vóór streaming.

---

## Realtime Gedrag

StartRealtime:

- JSON updates worden gepauzeerd
- Preset engine bevriest
- UDP streaming start

StopRealtime:

- Laatste preset wordt hersteld
- JSON control hervat

---

## Acties

ApplyLook  
FadeTo  
Blackout  
Flash  
PrepareLook  
StartRealtime  
StopRealtime

---

## Transport Selectie

| Actie | Transport |
|-------|-----------|
| ApplyLook | JSON |
| FadeTo | JSON |
| Monitoring | MQTT |
| Pixel FX | DDP |

---

## Fallback

DDP failure → terug naar JSON preset  
MQTT failure → geen show impact  
JSON failure → node degraded

---

## Latency

| Transport | Latency |
|-----------|---------|
| JSON | 30–120 ms |
| MQTT | 50–200 ms |
| DDP | 5–20 ms |

---

## Filosofie

WLED fungeert als render engine.  
AntiGravity behoudt creatieve controle.
