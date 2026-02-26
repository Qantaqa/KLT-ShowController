import { createRequire as yi } from "node:module";
import M from "node:path";
import { fileURLToPath as wi } from "node:url";
import { app as ms, screen as fs } from "electron";
import Te from "util";
import ie, { Readable as xs } from "stream";
import Ei from "path";
import kn from "http";
import jn from "https";
import ra from "url";
import hs from "fs";
import Ri from "crypto";
import Ti from "http2";
import vs from "assert";
import Si from "tty";
import bs from "os";
import be from "zlib";
import { EventEmitter as gs } from "events";
import Ie from "node:dgram";
import ys from "node:os";
import ws from "node:fs";
const Es = yi(import.meta.url), Rs = Es("better-sqlite3");
class Ts {
  /**
   * Initializes the database connection and runs initial schema setup.
   */
  constructor() {
    const e = M.join(ms.getPath("userData"), "ledshow.db");
    console.log("--- Initializing Database at:", e), this.db = new Rs(e), this.init();
  }
  /**
   * Internal method to initialize database tables and apply schema migrations.
   * Checks for existing columns before adding them to maintain compatibility.
   */
  init() {
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                defaultLogo TEXT,
                accessPin TEXT,
                serverPort INTEGER,
                testVideoPath TEXT,
                geminiApiKey TEXT
            )
        `);
    try {
      this.db.exec("ALTER TABLE app_settings ADD COLUMN testVideoPath TEXT");
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE app_settings ADD COLUMN geminiApiKey TEXT");
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE shows ADD COLUMN archived INTEGER DEFAULT 0");
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE shows ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE shows ADD COLUMN viewState JSON");
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE shows ADD COLUMN totalPages INTEGER DEFAULT 0");
    } catch {
    }
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS shows (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pdfPath TEXT,
                totalPages INTEGER DEFAULT 0,
                sidebarWidth INTEGER DEFAULT 500,
                invertScriptColors INTEGER DEFAULT 0,
                schedule JSON,
                viewState JSON,
                archived INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `), this.db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                showId TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config JSON,
                mediaState JSON
            )
        `);
    try {
      this.db.prepare("INSERT OR IGNORE INTO shows (id, name) VALUES ('GLOBAL', 'System Devices')").run();
    } catch {
    }
    try {
      this.db.exec("ALTER TABLE devices ADD COLUMN mediaState JSON");
    } catch {
    }
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS sequences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                showId TEXT NOT NULL,
                act TEXT,
                sceneId INTEGER,
                eventId INTEGER,
                type TEXT,
                cue TEXT,
                fixture TEXT,
                effect TEXT,
                palette TEXT,
                color1 TEXT,
                color2 TEXT,
                color3 TEXT,
                brightness INTEGER,
                speed INTEGER,
                intensity INTEGER,
                transition INTEGER,
                sound INTEGER,
                scriptPg INTEGER,
                duration INTEGER,
                filename TEXT,
                FOREIGN KEY(showId) REFERENCES shows(id) ON DELETE CASCADE
            )
        `), this.db.exec(`
            CREATE TABLE IF NOT EXISTS remote_clients (
                id TEXT PRIMARY KEY,
                friendlyName TEXT,
                pinCode TEXT,
                type TEXT DEFAULT 'REMOTE',
                isCameraActive INTEGER DEFAULT 0,
                isSelfPreviewVisible INTEGER DEFAULT 1,
                selectedCameraClients JSON,
                isLocked INTEGER DEFAULT 0,
                lastConnected DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    const e = this.db.pragma("table_info(sequences)").map((o) => o.name);
    e.includes("duration") || this.db.exec("ALTER TABLE sequences ADD COLUMN duration INTEGER"), e.includes("filename") || this.db.exec("ALTER TABLE sequences ADD COLUMN filename TEXT"), e.includes("segmentId") || this.db.exec("ALTER TABLE sequences ADD COLUMN segmentId INTEGER"), e.includes("effectId") || this.db.exec("ALTER TABLE sequences ADD COLUMN effectId INTEGER"), e.includes("paletteId") || this.db.exec("ALTER TABLE sequences ADD COLUMN paletteId INTEGER"), this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                data JSON,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `), this.db.prepare("SELECT * FROM app_settings WHERE id = 1").get() || this.db.prepare("INSERT INTO app_settings (id, defaultLogo, accessPin, serverPort) VALUES (1, '', '', 3001)").run(), this.db.exec(`
            CREATE TABLE IF NOT EXISTS wled_segments (
                id TEXT PRIMARY KEY,
                segments JSON NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    const t = this.db.pragma("table_info(wled_segments)").map((o) => o.name);
    if (t.includes("deviceId") && !t.includes("id") && this.db.exec("ALTER TABLE wled_segments RENAME COLUMN deviceId TO id"), this.db.exec(`
            CREATE TABLE IF NOT EXISTS keyboard_bindings (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL,
                ctrl INTEGER DEFAULT 0,
                shift INTEGER DEFAULT 0,
                alt INTEGER DEFAULT 0,
                action TEXT NOT NULL,
                label TEXT
            )
        `), this.db.prepare("SELECT COUNT(*) as count FROM keyboard_bindings").get().count === 0) {
      const o = [
        { id: "btn_1", key: "F1", ctrl: 1, shift: 1, alt: 1, action: "nextAct", label: "Knop 1" },
        { id: "btn_2", key: "F2", ctrl: 1, shift: 1, alt: 1, action: "stopAll", label: "Knop 2" },
        { id: "btn_3", key: "F3", ctrl: 1, shift: 1, alt: 1, action: "nextScene", label: "Knop 3" },
        { id: "btn_4", key: "F4", ctrl: 1, shift: 1, alt: 1, action: "nextAct", label: "Knop 4" },
        { id: "btn_5", key: "F5", ctrl: 1, shift: 1, alt: 1, action: "pageUp", label: "Knop 5" },
        { id: "btn_6", key: "F6", ctrl: 1, shift: 1, alt: 1, action: "pageDown", label: "Knop 6" }
      ], s = this.db.prepare("INSERT INTO keyboard_bindings (id, key, ctrl, shift, alt, action, label) VALUES (?, ?, ?, ?, ?, ?, ?)");
      for (const r of o)
        s.run(r.id, r.key, r.ctrl, r.shift, r.alt, r.action, r.label);
    }
  }
  /**
   * Retrieves the global application settings from the database.
   * @returns The application settings object, or undefined if not found.
   */
  getAppSettings() {
    return this.db.prepare("SELECT * FROM app_settings WHERE id = 1").get();
  }
  /**
   * Updates the application settings. Merges the current settings with the provided updates.
   * @param settings Partial settings object containing the fields to update.
   */
  updateAppSettings(e) {
    const n = this.getAppSettings();
    console.log("--- DB: updateAppSettings (Incoming partial):", e);
    const t = { ...n, ...e };
    return console.log("--- DB: updateAppSettings (Final merged):", {
      defaultLogo: t.defaultLogo,
      accessPin: t.accessPin ? "SET (length:" + t.accessPin.length + ")" : "EMPTY",
      serverPort: t.serverPort
    }), this.db.prepare(`
            UPDATE app_settings 
            SET defaultLogo = ?, accessPin = ?, serverPort = ?, testVideoPath = ?, geminiApiKey = ?
            WHERE id = 1
        `).run(t.defaultLogo, t.accessPin, t.serverPort, t.testVideoPath || "", t.geminiApiKey || "");
  }
  /**
   * Retrieves all shows, excluding the system 'GLOBAL' entry.
   * @param includeArchived Whether to include archived shows in the result. Default is false.
   * @returns An array of show objects with parsed JSON fields.
   */
  getShows(e = !1) {
    console.log("--- DB: getShows (includeArchived:", e, ") ---");
    const n = this.db.prepare("SELECT COUNT(*) as count FROM shows").get(), t = this.db.prepare("SELECT COUNT(*) as count FROM shows WHERE archived = 1").get();
    console.log("--- DB: Total shows in DB:", n.count, ", Archived:", t.count, "---");
    let i;
    return e ? i = this.db.prepare("SELECT * FROM shows WHERE id != 'GLOBAL' ORDER BY updated_at DESC").all() : i = this.db.prepare("SELECT * FROM shows WHERE (archived = 0 OR archived IS NULL) AND id != 'GLOBAL' ORDER BY updated_at DESC").all(), console.log("--- DB: Raw shows from query:", i.length, "---", i.map((o) => ({ id: o.id, name: o.name, archived: o.archived }))), i = i.map((o) => {
      try {
        return {
          ...o,
          // Parse schedule if it exists, otherwise provide default empty object
          schedule: o.schedule ? JSON.parse(o.schedule) : {},
          // Parse viewState if it exists, otherwise provide default empty object
          viewState: o.viewState ? JSON.parse(o.viewState) : {}
        };
      } catch (s) {
        return console.error("Failed to parse show JSON for", o.id, s), { ...o, schedule: {}, viewState: {} };
      }
    }), console.log("--- DB: found", i.length, "shows after filtering ---"), i;
  }
  /**
   * Creates a new show in the database.
   * @param show The show object containing details like id, name, and settings.
   * @throws Error if the show name is empty.
   */
  createShow(e) {
    const n = (e.name || "").trim();
    if (!n)
      throw new Error("Show naam mag niet leeg zijn");
    return console.log("--- DB: createShow ---", n), this.db.prepare(`
            INSERT INTO shows (id, name, pdfPath, totalPages, sidebarWidth, invertScriptColors, schedule, viewState)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
      e.id,
      e.name,
      e.pdfPath || "",
      e.totalPages || 0,
      e.sidebarWidth || 500,
      e.invertScriptColors ? 1 : 0,
      JSON.stringify(e.schedule || {}),
      JSON.stringify(e.viewState || {})
    );
  }
  /**
   * Updates specific fields of an existing show.
   * @param id The unique identifier of the show.
   * @param partial A subset of show fields to update.
   */
  updateShow(e, n) {
    const t = Object.keys(n), i = Object.values(n).map((s) => typeof s == "object" ? JSON.stringify(s) : s), o = t.map((s) => `${s} = ?`).join(", ");
    return this.db.prepare(`
            UPDATE shows SET ${o}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...i, e);
  }
  /**
   * Deletes a show permanently from the database.
   * @param id The unique identifier of the show.
   */
  deleteShow(e) {
    return this.db.prepare("DELETE FROM shows WHERE id = ?").run(e);
  }
  /**
   * Toggles a show's archived status.
   * @param id The unique identifier of the show.
   * @param archived True to archive, false to restore.
   */
  archiveShow(e, n) {
    return this.db.prepare("UPDATE shows SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(n ? 1 : 0, e);
  }
  /**
   * Dumps key tables for debugging purposes.
   * @returns An object containing the contents of settings, shows, and devices, plus a sequence count.
   */
  debugDump() {
    return {
      app_settings: this.db.prepare("SELECT * FROM app_settings").all(),
      shows: this.db.prepare("SELECT * FROM shows").all(),
      devices: this.db.prepare("SELECT * FROM devices").all(),
      sequencesCount: this.db.prepare("SELECT COUNT(*) as count FROM sequences").get().count
    };
  }
  /**
   * Retrieves a list of all user-defined table names in the database.
   * @returns An array of table names.
   */
  getTables() {
    return this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((e) => e.name);
  }
  /**
   * Fetches all rows from a specified table.
   * @param tableName The name of the table to query.
   * @returns An array of row objects.
   * @throws Error if the table name contains invalid characters.
   */
  getTableData(e) {
    if (!/^[a-zA-Z0-9_]+$/.test(e))
      throw new Error("Invalid table name");
    return this.db.prepare(`SELECT * FROM ${e}`).all();
  }
  /**
   * Updates a specific row in a table.
   * @param tableName The table containing the row.
   * @param id The ID of the row to update.
   * @param data Object containing the fields and values to update.
   * @throws Error if the table name is invalid.
   */
  updateRow(e, n, t) {
    if (!/^[a-zA-Z0-9_]+$/.test(e)) throw new Error("Invalid table");
    const i = Object.keys(t).filter((r) => r !== "id"), o = i.map((r) => `${r} = ?`).join(", "), s = i.map((r) => {
      const c = t[r];
      return typeof c == "object" ? JSON.stringify(c) : c;
    });
    return this.db.prepare(`UPDATE ${e} SET ${o} WHERE id = ?`).run(...s, n);
  }
  /**
   * Deletes a specific row from a table.
   * @param tableName The table to delete from.
   * @param id The ID of the row to delete.
   * @throws Error if the table name is invalid.
   */
  deleteRow(e, n) {
    if (!/^[a-zA-Z0-9_]+$/.test(e)) throw new Error("Invalid table");
    return this.db.prepare(`DELETE FROM ${e} WHERE id = ?`).run(n);
  }
  /**
   * Retrieves all devices associated with a specific show.
   * @param showId The ID of the show.
   * @returns An array of device objects with nested config and mediaState parsed.
   */
  getDevices(e) {
    return this.db.prepare("SELECT * FROM devices WHERE showId = ?").all(e).map((n) => {
      const t = JSON.parse(n.config || "{}"), i = n.mediaState ? JSON.parse(n.mediaState) : null;
      return {
        ...n,
        ...t,
        mediaState: i
      };
    });
  }
  /**
   * Saves a list of devices for a show, replacing any existing devices.
   * Runs as a single atomic transaction.
   * @param showId The show to save devices for.
   * @param devices Array of device objects.
   */
  saveDevices(e, n) {
    const t = this.db.prepare("DELETE FROM devices WHERE showId = ?"), i = this.db.prepare("INSERT INTO devices (id, showId, name, type, config, mediaState) VALUES (?, ?, ?, ?, ?, ?)");
    return this.db.transaction((s, r) => {
      t.run(s);
      for (const c of r)
        i.run(
          c.id,
          s,
          c.name,
          c.type,
          JSON.stringify(c),
          c.mediaState ? JSON.stringify(c.mediaState) : null
        );
    })(e, n);
  }
  /**
   * Updates the persistent media state (e.g. current file, volume) of a device.
   * @param id The device identifier.
   * @param mediaState The new media state object.
   */
  updateDeviceMediaState(e, n) {
    return this.db.prepare("UPDATE devices SET mediaState = ? WHERE id = ?").run(
      JSON.stringify(n),
      e
    );
  }
  /**
   * Retrieves all non-null media states from all devices.
   * Useful for restoring state after a restart.
   * @returns An array of objects containing device ID and parsed mediaState.
   */
  getAllMediaStates() {
    return this.db.prepare("SELECT id, mediaState FROM devices WHERE mediaState IS NOT NULL").all().map((e) => ({
      id: e.id,
      mediaState: e.mediaState ? JSON.parse(e.mediaState) : null
    }));
  }
  /**
   * Retrieves all sequence events for a specific show, ordered by their creation/ID.
   * @param showId The ID of the show.
   * @returns Array of sequence event objects.
   */
  getSequences(e) {
    return this.db.prepare("SELECT * FROM sequences WHERE showId = ? ORDER BY id ASC").all(e).map((n) => ({
      ...n,
      // Convert integer (0/1) from SQLite to boolean for frontend consistency
      sound: !!n.sound
    }));
  }
  /**
   * Saves a list of sequence events (acts/scenes/events) for a show.
   * Deletes existing sequences for the show first within a transaction.
   * @param showId The show to save sequences for.
   * @param events Array of event objects.
   */
  saveSequences(e, n) {
    const t = this.db.prepare("DELETE FROM sequences WHERE showId = ?"), i = this.db.prepare(`
            INSERT INTO sequences 
            (showId, act, sceneId, eventId, type, cue, fixture, effect, palette, color1, color2, color3, brightness, speed, intensity, transition, sound, scriptPg, duration, filename, segmentId, effectId, paletteId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `), o = this.db.transaction((s, r) => {
      t.run(s);
      for (const c of r)
        i.run(
          s,
          c.act,
          c.sceneId,
          c.eventId,
          c.type,
          c.cue,
          c.fixture || "",
          c.effect || "",
          c.palette || "",
          c.color1 || "",
          c.color2 || "",
          c.color3 || "",
          c.brightness ?? 255,
          c.speed ?? 127,
          c.intensity ?? 127,
          c.transition ?? 0,
          c.sound ? 1 : 0,
          c.scriptPg ?? 1,
          c.duration ?? null,
          c.filename || "",
          // Use segment/effect/palette IDs if present, otherwise null
          c.segmentId !== void 0 ? c.segmentId : null,
          c.effectId !== void 0 ? c.effectId : null,
          c.paletteId !== void 0 ? c.paletteId : null
        );
    });
    try {
      return o(e, n);
    } catch (s) {
      throw console.error("Failed to save sequences:", s), s;
    }
  }
  /**
   * Retrieves all registered remote clients (e.g. tablet controllers).
   * @returns Array of remote client objects.
   */
  getRemoteClients() {
    return this.db.prepare("SELECT * FROM remote_clients ORDER BY lastConnected DESC").all().map((e) => ({
      ...e,
      // Convert SQLite integers to booleans for the frontend
      isCameraActive: !!e.isCameraActive,
      isSelfPreviewVisible: !!e.isSelfPreviewVisible,
      isLocked: !!e.isLocked,
      // Parse selected camera views from JSON string
      selectedCameraClients: e.selectedCameraClients ? JSON.parse(e.selectedCameraClients) : []
    }));
  }
  /**
   * Retrieves a single remote client by ID.
   * @param id The client ID.
   * @returns The remote client object or null if not found.
   */
  getRemoteClient(e) {
    const n = this.db.prepare("SELECT * FROM remote_clients WHERE id = ?").get(e);
    return n ? {
      ...n,
      isCameraActive: !!n.isCameraActive,
      isSelfPreviewVisible: !!n.isSelfPreviewVisible,
      isLocked: !!n.isLocked,
      selectedCameraClients: n.selectedCameraClients ? JSON.parse(n.selectedCameraClients) : []
    } : null;
  }
  /**
   * Registers or updates a remote client's info (IDs, name, status).
   * @param client The client data object.
   */
  upsertRemoteClient(e) {
    return this.db.prepare(`
            INSERT INTO remote_clients (id, friendlyName, pinCode, type, isCameraActive, isSelfPreviewVisible, selectedCameraClients, isLocked, lastConnected)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                friendlyName = excluded.friendlyName,
                pinCode = excluded.pinCode,
                type = excluded.type,
                isCameraActive = excluded.isCameraActive,
                isSelfPreviewVisible = excluded.isSelfPreviewVisible,
                selectedCameraClients = excluded.selectedCameraClients,
                isLocked = excluded.isLocked,
                lastConnected = CURRENT_TIMESTAMP
        `).run(
      e.id,
      e.friendlyName,
      e.pinCode,
      e.type || "REMOTE",
      e.isCameraActive ? 1 : 0,
      // Ensure visibility is default on (1) if not explicitly disabled
      e.isSelfPreviewVisible !== !1 ? 1 : 0,
      JSON.stringify(e.selectedCameraClients || []),
      e.isLocked ? 1 : 0
    );
  }
  /**
   * Updates specific status fields for a remote client (e.g. heartbeat/connection status).
   * @param id The client ID.
   * @param updates Object containing the fields to update.
   */
  updateRemoteClientStatus(e, n) {
    const t = Object.keys(n), i = Object.values(n).map((s) => typeof s == "boolean" ? s ? 1 : 0 : Array.isArray(s) || typeof s == "object" ? JSON.stringify(s) : s), o = t.map((s) => `${s} = ?`).join(", ");
    return this.db.prepare(`
            UPDATE remote_clients SET ${o}, lastConnected = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...i, e);
  }
  /**
   * Retrieves all items currently stored in the clipboard.
   * @returns Array of clipboard items with parsed data.
   */
  getClipboard() {
    return this.db.prepare("SELECT * FROM clipboard ORDER BY timestamp DESC").all().map((e) => ({
      ...e,
      // Parse the JSON data of the copied item
      data: JSON.parse(e.data)
    }));
  }
  /**
   * Adds an item to the clipboard.
   * @param type The type of data (e.g. 'EVENT', 'ACT').
   * @param data The data object to be copied.
   */
  addToClipboard(e, n) {
    return this.db.prepare("INSERT INTO clipboard (type, data) VALUES (?, ?)").run(e, JSON.stringify(n));
  }
  /**
   * Removes a specific item from the clipboard.
   * @param id The clipboard item ID.
   */
  removeFromClipboard(e) {
    return this.db.prepare("DELETE FROM clipboard WHERE id = ?").run(e);
  }
  /**
   * Clears all items from the clipboard.
   */
  clearClipboard() {
    return this.db.prepare("DELETE FROM clipboard").run();
  }
  /**
   * Permanently deletes archived shows and their associated data (sequences/devices).
   * @returns Object containing the count of deleted shows.
   */
  cleanupDatabase() {
    const n = this.db.prepare("SELECT id FROM shows WHERE archived = 1 AND id != 'GLOBAL'").all().map((i) => i.id);
    return n.length === 0 ? { deletedCount: 0 } : this.db.transaction(() => {
      const i = n.map(() => "?").join(",");
      return this.db.prepare(`DELETE FROM sequences WHERE showId IN (${i})`).run(...n), this.db.prepare(`DELETE FROM devices WHERE showId IN (${i})`).run(...n), this.db.prepare("DELETE FROM wled_segments WHERE id NOT IN (SELECT id FROM devices)").run(), { deletedCount: this.db.prepare("DELETE FROM shows WHERE archived = 1 AND id != 'GLOBAL'").run().changes };
    })();
  }
  /**
   * Saves (overwrites) stored WLED segments for a specific device.
   * @param deviceId The unique ID of the device.
   * @param segments Array of segment objects.
   */
  saveWledSegments(e, n) {
    return this.db.prepare(`
            INSERT INTO wled_segments (id, segments, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                segments = excluded.segments,
                updated_at = CURRENT_TIMESTAMP
        `).run(e, JSON.stringify(n));
  }
  /**
   * Retrieves the stored WLED segments for a specific device.
   * @param deviceId The unique ID of the device.
   * @returns Array of segment objects or null if none are stored.
   */
  getWledSegments(e) {
    const n = this.db.prepare("SELECT segments FROM wled_segments WHERE id = ?").get(e);
    return n ? JSON.parse(n.segments) : null;
  }
  /**
   * Retrieves all keyboard bindings.
   */
  getKeyboardBindings() {
    return this.db.prepare("SELECT * FROM keyboard_bindings ORDER BY id ASC").all().map((e) => ({
      ...e,
      ctrl: !!e.ctrl,
      shift: !!e.shift,
      alt: !!e.alt
    }));
  }
  /**
   * Saves a list of keyboard bindings.
   */
  saveKeyboardBindings(e) {
    const n = this.db.prepare("DELETE FROM keyboard_bindings"), t = this.db.prepare("INSERT INTO keyboard_bindings (id, key, ctrl, shift, alt, action, label) VALUES (?, ?, ?, ?, ?, ?, ?)");
    return this.db.transaction((o) => {
      n.run();
      for (const s of o)
        t.run(s.id, s.key, s.ctrl ? 1 : 0, s.shift ? 1 : 0, s.alt ? 1 : 0, s.action, s.label);
    })(e);
  }
}
const O = new Ts();
function Ai(a, e) {
  return function() {
    return a.apply(e, arguments);
  };
}
const { toString: Ss } = Object.prototype, { getPrototypeOf: Nn } = Object, { iterator: ca, toStringTag: _i } = Symbol, pa = /* @__PURE__ */ ((a) => (e) => {
  const n = Ss.call(e);
  return a[n] || (a[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), ue = (a) => (a = a.toLowerCase(), (e) => pa(e) === a), la = (a) => (e) => typeof e === a, { isArray: ke } = Array, Ce = la("undefined");
function Fe(a) {
  return a !== null && !Ce(a) && a.constructor !== null && !Ce(a.constructor) && se(a.constructor.isBuffer) && a.constructor.isBuffer(a);
}
const Ci = ue("ArrayBuffer");
function As(a) {
  let e;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? e = ArrayBuffer.isView(a) : e = a && a.buffer && Ci(a.buffer), e;
}
const _s = la("string"), se = la("function"), Oi = la("number"), Ue = (a) => a !== null && typeof a == "object", Cs = (a) => a === !0 || a === !1, Ze = (a) => {
  if (pa(a) !== "object")
    return !1;
  const e = Nn(a);
  return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(_i in a) && !(ca in a);
}, Os = (a) => {
  if (!Ue(a) || Fe(a))
    return !1;
  try {
    return Object.keys(a).length === 0 && Object.getPrototypeOf(a) === Object.prototype;
  } catch {
    return !1;
  }
}, ks = ue("Date"), js = ue("File"), Ns = ue("Blob"), Ps = ue("FileList"), Is = (a) => Ue(a) && se(a.pipe), Ls = (a) => {
  let e;
  return a && (typeof FormData == "function" && a instanceof FormData || se(a.append) && ((e = pa(a)) === "formdata" || // detect form-data instance
  e === "object" && se(a.toString) && a.toString() === "[object FormData]"));
}, Ds = ue("URLSearchParams"), [Fs, Us, qs, Bs] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(ue), Ms = (a) => a.trim ? a.trim() : a.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function qe(a, e, { allOwnKeys: n = !1 } = {}) {
  if (a === null || typeof a > "u")
    return;
  let t, i;
  if (typeof a != "object" && (a = [a]), ke(a))
    for (t = 0, i = a.length; t < i; t++)
      e.call(null, a[t], t, a);
  else {
    if (Fe(a))
      return;
    const o = n ? Object.getOwnPropertyNames(a) : Object.keys(a), s = o.length;
    let r;
    for (t = 0; t < s; t++)
      r = o[t], e.call(null, a[r], r, a);
  }
}
function ki(a, e) {
  if (Fe(a))
    return null;
  e = e.toLowerCase();
  const n = Object.keys(a);
  let t = n.length, i;
  for (; t-- > 0; )
    if (i = n[t], e === i.toLowerCase())
      return i;
  return null;
}
const ge = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, ji = (a) => !Ce(a) && a !== ge;
function Sn() {
  const { caseless: a, skipUndefined: e } = ji(this) && this || {}, n = {}, t = (i, o) => {
    if (o === "__proto__" || o === "constructor" || o === "prototype")
      return;
    const s = a && ki(n, o) || o;
    Ze(n[s]) && Ze(i) ? n[s] = Sn(n[s], i) : Ze(i) ? n[s] = Sn({}, i) : ke(i) ? n[s] = i.slice() : (!e || !Ce(i)) && (n[s] = i);
  };
  for (let i = 0, o = arguments.length; i < o; i++)
    arguments[i] && qe(arguments[i], t);
  return n;
}
const zs = (a, e, n, { allOwnKeys: t } = {}) => (qe(
  e,
  (i, o) => {
    n && se(i) ? Object.defineProperty(a, o, {
      value: Ai(i, n),
      writable: !0,
      enumerable: !0,
      configurable: !0
    }) : Object.defineProperty(a, o, {
      value: i,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  },
  { allOwnKeys: t }
), a), $s = (a) => (a.charCodeAt(0) === 65279 && (a = a.slice(1)), a), Hs = (a, e, n, t) => {
  a.prototype = Object.create(
    e.prototype,
    t
  ), Object.defineProperty(a.prototype, "constructor", {
    value: a,
    writable: !0,
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(a, "super", {
    value: e.prototype
  }), n && Object.assign(a.prototype, n);
}, Ws = (a, e, n, t) => {
  let i, o, s;
  const r = {};
  if (e = e || {}, a == null) return e;
  do {
    for (i = Object.getOwnPropertyNames(a), o = i.length; o-- > 0; )
      s = i[o], (!t || t(s, a, e)) && !r[s] && (e[s] = a[s], r[s] = !0);
    a = n !== !1 && Nn(a);
  } while (a && (!n || n(a, e)) && a !== Object.prototype);
  return e;
}, Gs = (a, e, n) => {
  a = String(a), (n === void 0 || n > a.length) && (n = a.length), n -= e.length;
  const t = a.indexOf(e, n);
  return t !== -1 && t === n;
}, Vs = (a) => {
  if (!a) return null;
  if (ke(a)) return a;
  let e = a.length;
  if (!Oi(e)) return null;
  const n = new Array(e);
  for (; e-- > 0; )
    n[e] = a[e];
  return n;
}, Js = /* @__PURE__ */ ((a) => (e) => a && e instanceof a)(typeof Uint8Array < "u" && Nn(Uint8Array)), Ks = (a, e) => {
  const t = (a && a[ca]).call(a);
  let i;
  for (; (i = t.next()) && !i.done; ) {
    const o = i.value;
    e.call(a, o[0], o[1]);
  }
}, Xs = (a, e) => {
  let n;
  const t = [];
  for (; (n = a.exec(e)) !== null; )
    t.push(n);
  return t;
}, Ys = ue("HTMLFormElement"), Zs = (a) => a.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(n, t, i) {
  return t.toUpperCase() + i;
}), zn = (({ hasOwnProperty: a }) => (e, n) => a.call(e, n))(Object.prototype), Qs = ue("RegExp"), Ni = (a, e) => {
  const n = Object.getOwnPropertyDescriptors(a), t = {};
  qe(n, (i, o) => {
    let s;
    (s = e(i, o, a)) !== !1 && (t[o] = s || i);
  }), Object.defineProperties(a, t);
}, eo = (a) => {
  Ni(a, (e, n) => {
    if (se(a) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
      return !1;
    const t = a[n];
    if (se(t)) {
      if (e.enumerable = !1, "writable" in e) {
        e.writable = !1;
        return;
      }
      e.set || (e.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, ao = (a, e) => {
  const n = {}, t = (i) => {
    i.forEach((o) => {
      n[o] = !0;
    });
  };
  return ke(a) ? t(a) : t(String(a).split(e)), n;
}, no = () => {
}, to = (a, e) => a != null && Number.isFinite(a = +a) ? a : e;
function io(a) {
  return !!(a && se(a.append) && a[_i] === "FormData" && a[ca]);
}
const so = (a) => {
  const e = new Array(10), n = (t, i) => {
    if (Ue(t)) {
      if (e.indexOf(t) >= 0)
        return;
      if (Fe(t))
        return t;
      if (!("toJSON" in t)) {
        e[i] = t;
        const o = ke(t) ? [] : {};
        return qe(t, (s, r) => {
          const c = n(s, i + 1);
          !Ce(c) && (o[r] = c);
        }), e[i] = void 0, o;
      }
    }
    return t;
  };
  return n(a, 0);
}, oo = ue("AsyncFunction"), ro = (a) => a && (Ue(a) || se(a)) && se(a.then) && se(a.catch), Pi = ((a, e) => a ? setImmediate : e ? ((n, t) => (ge.addEventListener(
  "message",
  ({ source: i, data: o }) => {
    i === ge && o === n && t.length && t.shift()();
  },
  !1
), (i) => {
  t.push(i), ge.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(typeof setImmediate == "function", se(ge.postMessage)), co = typeof queueMicrotask < "u" ? queueMicrotask.bind(ge) : typeof process < "u" && process.nextTick || Pi, po = (a) => a != null && se(a[ca]), h = {
  isArray: ke,
  isArrayBuffer: Ci,
  isBuffer: Fe,
  isFormData: Ls,
  isArrayBufferView: As,
  isString: _s,
  isNumber: Oi,
  isBoolean: Cs,
  isObject: Ue,
  isPlainObject: Ze,
  isEmptyObject: Os,
  isReadableStream: Fs,
  isRequest: Us,
  isResponse: qs,
  isHeaders: Bs,
  isUndefined: Ce,
  isDate: ks,
  isFile: js,
  isBlob: Ns,
  isRegExp: Qs,
  isFunction: se,
  isStream: Is,
  isURLSearchParams: Ds,
  isTypedArray: Js,
  isFileList: Ps,
  forEach: qe,
  merge: Sn,
  extend: zs,
  trim: Ms,
  stripBOM: $s,
  inherits: Hs,
  toFlatObject: Ws,
  kindOf: pa,
  kindOfTest: ue,
  endsWith: Gs,
  toArray: Vs,
  forEachEntry: Ks,
  matchAll: Xs,
  isHTMLForm: Ys,
  hasOwnProperty: zn,
  hasOwnProp: zn,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors: Ni,
  freezeMethods: eo,
  toObjectSet: ao,
  toCamelCase: Zs,
  noop: no,
  toFiniteNumber: to,
  findKey: ki,
  global: ge,
  isContextDefined: ji,
  isSpecCompliantForm: io,
  toJSONObject: so,
  isAsyncFn: oo,
  isThenable: ro,
  setImmediate: Pi,
  asap: co,
  isIterable: po
};
let R = class Ii extends Error {
  static from(e, n, t, i, o, s) {
    const r = new Ii(e.message, n || e.code, t, i, o);
    return r.cause = e, r.name = e.name, s && Object.assign(r, s), r;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(e, n, t, i, o) {
    super(e), this.name = "AxiosError", this.isAxiosError = !0, n && (this.code = n), t && (this.config = t), i && (this.request = i), o && (this.response = o, this.status = o.status);
  }
  toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: h.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
};
R.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
R.ERR_BAD_OPTION = "ERR_BAD_OPTION";
R.ECONNABORTED = "ECONNABORTED";
R.ETIMEDOUT = "ETIMEDOUT";
R.ERR_NETWORK = "ERR_NETWORK";
R.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
R.ERR_DEPRECATED = "ERR_DEPRECATED";
R.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
R.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
R.ERR_CANCELED = "ERR_CANCELED";
R.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
R.ERR_INVALID_URL = "ERR_INVALID_URL";
function Pn(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
var ha, $n;
function lo() {
  if ($n) return ha;
  $n = 1;
  var a = ie.Stream, e = Te;
  ha = n;
  function n() {
    this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
  }
  return e.inherits(n, a), n.create = function(t, i) {
    var o = new this();
    i = i || {};
    for (var s in i)
      o[s] = i[s];
    o.source = t;
    var r = t.emit;
    return t.emit = function() {
      return o._handleEmit(arguments), r.apply(t, arguments);
    }, t.on("error", function() {
    }), o.pauseStream && t.pause(), o;
  }, Object.defineProperty(n.prototype, "readable", {
    configurable: !0,
    enumerable: !0,
    get: function() {
      return this.source.readable;
    }
  }), n.prototype.setEncoding = function() {
    return this.source.setEncoding.apply(this.source, arguments);
  }, n.prototype.resume = function() {
    this._released || this.release(), this.source.resume();
  }, n.prototype.pause = function() {
    this.source.pause();
  }, n.prototype.release = function() {
    this._released = !0, this._bufferedEvents.forEach((function(t) {
      this.emit.apply(this, t);
    }).bind(this)), this._bufferedEvents = [];
  }, n.prototype.pipe = function() {
    var t = a.prototype.pipe.apply(this, arguments);
    return this.resume(), t;
  }, n.prototype._handleEmit = function(t) {
    if (this._released) {
      this.emit.apply(this, t);
      return;
    }
    t[0] === "data" && (this.dataSize += t[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(t);
  }, n.prototype._checkIfMaxDataSizeExceeded = function() {
    if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
      this._maxDataSizeExceeded = !0;
      var t = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this.emit("error", new Error(t));
    }
  }, ha;
}
var va, Hn;
function uo() {
  if (Hn) return va;
  Hn = 1;
  var a = Te, e = ie.Stream, n = lo();
  va = t;
  function t() {
    this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
  }
  return a.inherits(t, e), t.create = function(i) {
    var o = new this();
    i = i || {};
    for (var s in i)
      o[s] = i[s];
    return o;
  }, t.isStreamLike = function(i) {
    return typeof i != "function" && typeof i != "string" && typeof i != "boolean" && typeof i != "number" && !Buffer.isBuffer(i);
  }, t.prototype.append = function(i) {
    var o = t.isStreamLike(i);
    if (o) {
      if (!(i instanceof n)) {
        var s = n.create(i, {
          maxDataSize: 1 / 0,
          pauseStream: this.pauseStreams
        });
        i.on("data", this._checkDataSize.bind(this)), i = s;
      }
      this._handleErrors(i), this.pauseStreams && i.pause();
    }
    return this._streams.push(i), this;
  }, t.prototype.pipe = function(i, o) {
    return e.prototype.pipe.call(this, i, o), this.resume(), i;
  }, t.prototype._getNext = function() {
    if (this._currentStream = null, this._insideLoop) {
      this._pendingNext = !0;
      return;
    }
    this._insideLoop = !0;
    try {
      do
        this._pendingNext = !1, this._realGetNext();
      while (this._pendingNext);
    } finally {
      this._insideLoop = !1;
    }
  }, t.prototype._realGetNext = function() {
    var i = this._streams.shift();
    if (typeof i > "u") {
      this.end();
      return;
    }
    if (typeof i != "function") {
      this._pipeNext(i);
      return;
    }
    var o = i;
    o((function(s) {
      var r = t.isStreamLike(s);
      r && (s.on("data", this._checkDataSize.bind(this)), this._handleErrors(s)), this._pipeNext(s);
    }).bind(this));
  }, t.prototype._pipeNext = function(i) {
    this._currentStream = i;
    var o = t.isStreamLike(i);
    if (o) {
      i.on("end", this._getNext.bind(this)), i.pipe(this, { end: !1 });
      return;
    }
    var s = i;
    this.write(s), this._getNext();
  }, t.prototype._handleErrors = function(i) {
    var o = this;
    i.on("error", function(s) {
      o._emitError(s);
    });
  }, t.prototype.write = function(i) {
    this.emit("data", i);
  }, t.prototype.pause = function() {
    this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
  }, t.prototype.resume = function() {
    this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
  }, t.prototype.end = function() {
    this._reset(), this.emit("end");
  }, t.prototype.destroy = function() {
    this._reset(), this.emit("close");
  }, t.prototype._reset = function() {
    this.writable = !1, this._streams = [], this._currentStream = null;
  }, t.prototype._checkDataSize = function() {
    if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
      var i = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this._emitError(new Error(i));
    }
  }, t.prototype._updateDataSize = function() {
    this.dataSize = 0;
    var i = this;
    this._streams.forEach(function(o) {
      o.dataSize && (i.dataSize += o.dataSize);
    }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
  }, t.prototype._emitError = function(i) {
    this._reset(), this.emit("error", i);
  }, va;
}
var ba = {};
const mo = {
  "application/1d-interleaved-parityfec": { source: "iana" },
  "application/3gpdash-qoe-report+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/3gpp-ims+xml": { source: "iana", compressible: !0 },
  "application/3gpphal+json": { source: "iana", compressible: !0 },
  "application/3gpphalforms+json": { source: "iana", compressible: !0 },
  "application/a2l": { source: "iana" },
  "application/ace+cbor": { source: "iana" },
  "application/activemessage": { source: "iana" },
  "application/activity+json": { source: "iana", compressible: !0 },
  "application/alto-costmap+json": { source: "iana", compressible: !0 },
  "application/alto-costmapfilter+json": { source: "iana", compressible: !0 },
  "application/alto-directory+json": { source: "iana", compressible: !0 },
  "application/alto-endpointcost+json": { source: "iana", compressible: !0 },
  "application/alto-endpointcostparams+json": { source: "iana", compressible: !0 },
  "application/alto-endpointprop+json": { source: "iana", compressible: !0 },
  "application/alto-endpointpropparams+json": { source: "iana", compressible: !0 },
  "application/alto-error+json": { source: "iana", compressible: !0 },
  "application/alto-networkmap+json": { source: "iana", compressible: !0 },
  "application/alto-networkmapfilter+json": { source: "iana", compressible: !0 },
  "application/alto-updatestreamcontrol+json": { source: "iana", compressible: !0 },
  "application/alto-updatestreamparams+json": { source: "iana", compressible: !0 },
  "application/aml": { source: "iana" },
  "application/andrew-inset": { source: "iana", extensions: ["ez"] },
  "application/applefile": { source: "iana" },
  "application/applixware": { source: "apache", extensions: ["aw"] },
  "application/at+jwt": { source: "iana" },
  "application/atf": { source: "iana" },
  "application/atfx": { source: "iana" },
  "application/atom+xml": { source: "iana", compressible: !0, extensions: ["atom"] },
  "application/atomcat+xml": { source: "iana", compressible: !0, extensions: ["atomcat"] },
  "application/atomdeleted+xml": { source: "iana", compressible: !0, extensions: ["atomdeleted"] },
  "application/atomicmail": { source: "iana" },
  "application/atomsvc+xml": { source: "iana", compressible: !0, extensions: ["atomsvc"] },
  "application/atsc-dwd+xml": { source: "iana", compressible: !0, extensions: ["dwd"] },
  "application/atsc-dynamic-event-message": { source: "iana" },
  "application/atsc-held+xml": { source: "iana", compressible: !0, extensions: ["held"] },
  "application/atsc-rdt+json": { source: "iana", compressible: !0 },
  "application/atsc-rsat+xml": { source: "iana", compressible: !0, extensions: ["rsat"] },
  "application/atxml": { source: "iana" },
  "application/auth-policy+xml": { source: "iana", compressible: !0 },
  "application/bacnet-xdd+zip": { source: "iana", compressible: !1 },
  "application/batch-smtp": { source: "iana" },
  "application/bdoc": { compressible: !1, extensions: ["bdoc"] },
  "application/beep+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/calendar+json": { source: "iana", compressible: !0 },
  "application/calendar+xml": { source: "iana", compressible: !0, extensions: ["xcs"] },
  "application/call-completion": { source: "iana" },
  "application/cals-1840": { source: "iana" },
  "application/captive+json": { source: "iana", compressible: !0 },
  "application/cbor": { source: "iana" },
  "application/cbor-seq": { source: "iana" },
  "application/cccex": { source: "iana" },
  "application/ccmp+xml": { source: "iana", compressible: !0 },
  "application/ccxml+xml": { source: "iana", compressible: !0, extensions: ["ccxml"] },
  "application/cdfx+xml": { source: "iana", compressible: !0, extensions: ["cdfx"] },
  "application/cdmi-capability": { source: "iana", extensions: ["cdmia"] },
  "application/cdmi-container": { source: "iana", extensions: ["cdmic"] },
  "application/cdmi-domain": { source: "iana", extensions: ["cdmid"] },
  "application/cdmi-object": { source: "iana", extensions: ["cdmio"] },
  "application/cdmi-queue": { source: "iana", extensions: ["cdmiq"] },
  "application/cdni": { source: "iana" },
  "application/cea": { source: "iana" },
  "application/cea-2018+xml": { source: "iana", compressible: !0 },
  "application/cellml+xml": { source: "iana", compressible: !0 },
  "application/cfw": { source: "iana" },
  "application/city+json": { source: "iana", compressible: !0 },
  "application/clr": { source: "iana" },
  "application/clue+xml": { source: "iana", compressible: !0 },
  "application/clue_info+xml": { source: "iana", compressible: !0 },
  "application/cms": { source: "iana" },
  "application/cnrp+xml": { source: "iana", compressible: !0 },
  "application/coap-group+json": { source: "iana", compressible: !0 },
  "application/coap-payload": { source: "iana" },
  "application/commonground": { source: "iana" },
  "application/conference-info+xml": { source: "iana", compressible: !0 },
  "application/cose": { source: "iana" },
  "application/cose-key": { source: "iana" },
  "application/cose-key-set": { source: "iana" },
  "application/cpl+xml": { source: "iana", compressible: !0, extensions: ["cpl"] },
  "application/csrattrs": { source: "iana" },
  "application/csta+xml": { source: "iana", compressible: !0 },
  "application/cstadata+xml": { source: "iana", compressible: !0 },
  "application/csvm+json": { source: "iana", compressible: !0 },
  "application/cu-seeme": { source: "apache", extensions: ["cu"] },
  "application/cwt": { source: "iana" },
  "application/cybercash": { source: "iana" },
  "application/dart": { compressible: !0 },
  "application/dash+xml": { source: "iana", compressible: !0, extensions: ["mpd"] },
  "application/dash-patch+xml": { source: "iana", compressible: !0, extensions: ["mpp"] },
  "application/dashdelta": { source: "iana" },
  "application/davmount+xml": { source: "iana", compressible: !0, extensions: ["davmount"] },
  "application/dca-rft": { source: "iana" },
  "application/dcd": { source: "iana" },
  "application/dec-dx": { source: "iana" },
  "application/dialog-info+xml": { source: "iana", compressible: !0 },
  "application/dicom": { source: "iana" },
  "application/dicom+json": { source: "iana", compressible: !0 },
  "application/dicom+xml": { source: "iana", compressible: !0 },
  "application/dii": { source: "iana" },
  "application/dit": { source: "iana" },
  "application/dns": { source: "iana" },
  "application/dns+json": { source: "iana", compressible: !0 },
  "application/dns-message": { source: "iana" },
  "application/docbook+xml": { source: "apache", compressible: !0, extensions: ["dbk"] },
  "application/dots+cbor": { source: "iana" },
  "application/dskpp+xml": { source: "iana", compressible: !0 },
  "application/dssc+der": { source: "iana", extensions: ["dssc"] },
  "application/dssc+xml": { source: "iana", compressible: !0, extensions: ["xdssc"] },
  "application/dvcs": { source: "iana" },
  "application/ecmascript": { source: "iana", compressible: !0, extensions: ["es", "ecma"] },
  "application/edi-consent": { source: "iana" },
  "application/edi-x12": { source: "iana", compressible: !1 },
  "application/edifact": { source: "iana", compressible: !1 },
  "application/efi": { source: "iana" },
  "application/elm+json": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/elm+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.cap+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/emergencycalldata.comment+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.control+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.deviceinfo+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.ecall.msd": { source: "iana" },
  "application/emergencycalldata.providerinfo+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.serviceinfo+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.subscriberinfo+xml": { source: "iana", compressible: !0 },
  "application/emergencycalldata.veds+xml": { source: "iana", compressible: !0 },
  "application/emma+xml": { source: "iana", compressible: !0, extensions: ["emma"] },
  "application/emotionml+xml": { source: "iana", compressible: !0, extensions: ["emotionml"] },
  "application/encaprtp": { source: "iana" },
  "application/epp+xml": { source: "iana", compressible: !0 },
  "application/epub+zip": { source: "iana", compressible: !1, extensions: ["epub"] },
  "application/eshop": { source: "iana" },
  "application/exi": { source: "iana", extensions: ["exi"] },
  "application/expect-ct-report+json": { source: "iana", compressible: !0 },
  "application/express": { source: "iana", extensions: ["exp"] },
  "application/fastinfoset": { source: "iana" },
  "application/fastsoap": { source: "iana" },
  "application/fdt+xml": { source: "iana", compressible: !0, extensions: ["fdt"] },
  "application/fhir+json": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/fhir+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/fido.trusted-apps+json": { compressible: !0 },
  "application/fits": { source: "iana" },
  "application/flexfec": { source: "iana" },
  "application/font-sfnt": { source: "iana" },
  "application/font-tdpfr": { source: "iana", extensions: ["pfr"] },
  "application/font-woff": { source: "iana", compressible: !1 },
  "application/framework-attributes+xml": { source: "iana", compressible: !0 },
  "application/geo+json": { source: "iana", compressible: !0, extensions: ["geojson"] },
  "application/geo+json-seq": { source: "iana" },
  "application/geopackage+sqlite3": { source: "iana" },
  "application/geoxacml+xml": { source: "iana", compressible: !0 },
  "application/gltf-buffer": { source: "iana" },
  "application/gml+xml": { source: "iana", compressible: !0, extensions: ["gml"] },
  "application/gpx+xml": { source: "apache", compressible: !0, extensions: ["gpx"] },
  "application/gxf": { source: "apache", extensions: ["gxf"] },
  "application/gzip": { source: "iana", compressible: !1, extensions: ["gz"] },
  "application/h224": { source: "iana" },
  "application/held+xml": { source: "iana", compressible: !0 },
  "application/hjson": { extensions: ["hjson"] },
  "application/http": { source: "iana" },
  "application/hyperstudio": { source: "iana", extensions: ["stk"] },
  "application/ibe-key-request+xml": { source: "iana", compressible: !0 },
  "application/ibe-pkg-reply+xml": { source: "iana", compressible: !0 },
  "application/ibe-pp-data": { source: "iana" },
  "application/iges": { source: "iana" },
  "application/im-iscomposing+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/index": { source: "iana" },
  "application/index.cmd": { source: "iana" },
  "application/index.obj": { source: "iana" },
  "application/index.response": { source: "iana" },
  "application/index.vnd": { source: "iana" },
  "application/inkml+xml": { source: "iana", compressible: !0, extensions: ["ink", "inkml"] },
  "application/iotp": { source: "iana" },
  "application/ipfix": { source: "iana", extensions: ["ipfix"] },
  "application/ipp": { source: "iana" },
  "application/isup": { source: "iana" },
  "application/its+xml": { source: "iana", compressible: !0, extensions: ["its"] },
  "application/java-archive": { source: "apache", compressible: !1, extensions: ["jar", "war", "ear"] },
  "application/java-serialized-object": { source: "apache", compressible: !1, extensions: ["ser"] },
  "application/java-vm": { source: "apache", compressible: !1, extensions: ["class"] },
  "application/javascript": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["js", "mjs"] },
  "application/jf2feed+json": { source: "iana", compressible: !0 },
  "application/jose": { source: "iana" },
  "application/jose+json": { source: "iana", compressible: !0 },
  "application/jrd+json": { source: "iana", compressible: !0 },
  "application/jscalendar+json": { source: "iana", compressible: !0 },
  "application/json": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["json", "map"] },
  "application/json-patch+json": { source: "iana", compressible: !0 },
  "application/json-seq": { source: "iana" },
  "application/json5": { extensions: ["json5"] },
  "application/jsonml+json": { source: "apache", compressible: !0, extensions: ["jsonml"] },
  "application/jwk+json": { source: "iana", compressible: !0 },
  "application/jwk-set+json": { source: "iana", compressible: !0 },
  "application/jwt": { source: "iana" },
  "application/kpml-request+xml": { source: "iana", compressible: !0 },
  "application/kpml-response+xml": { source: "iana", compressible: !0 },
  "application/ld+json": { source: "iana", compressible: !0, extensions: ["jsonld"] },
  "application/lgr+xml": { source: "iana", compressible: !0, extensions: ["lgr"] },
  "application/link-format": { source: "iana" },
  "application/load-control+xml": { source: "iana", compressible: !0 },
  "application/lost+xml": { source: "iana", compressible: !0, extensions: ["lostxml"] },
  "application/lostsync+xml": { source: "iana", compressible: !0 },
  "application/lpf+zip": { source: "iana", compressible: !1 },
  "application/lxf": { source: "iana" },
  "application/mac-binhex40": { source: "iana", extensions: ["hqx"] },
  "application/mac-compactpro": { source: "apache", extensions: ["cpt"] },
  "application/macwriteii": { source: "iana" },
  "application/mads+xml": { source: "iana", compressible: !0, extensions: ["mads"] },
  "application/manifest+json": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["webmanifest"] },
  "application/marc": { source: "iana", extensions: ["mrc"] },
  "application/marcxml+xml": { source: "iana", compressible: !0, extensions: ["mrcx"] },
  "application/mathematica": { source: "iana", extensions: ["ma", "nb", "mb"] },
  "application/mathml+xml": { source: "iana", compressible: !0, extensions: ["mathml"] },
  "application/mathml-content+xml": { source: "iana", compressible: !0 },
  "application/mathml-presentation+xml": { source: "iana", compressible: !0 },
  "application/mbms-associated-procedure-description+xml": { source: "iana", compressible: !0 },
  "application/mbms-deregister+xml": { source: "iana", compressible: !0 },
  "application/mbms-envelope+xml": { source: "iana", compressible: !0 },
  "application/mbms-msk+xml": { source: "iana", compressible: !0 },
  "application/mbms-msk-response+xml": { source: "iana", compressible: !0 },
  "application/mbms-protection-description+xml": { source: "iana", compressible: !0 },
  "application/mbms-reception-report+xml": { source: "iana", compressible: !0 },
  "application/mbms-register+xml": { source: "iana", compressible: !0 },
  "application/mbms-register-response+xml": { source: "iana", compressible: !0 },
  "application/mbms-schedule+xml": { source: "iana", compressible: !0 },
  "application/mbms-user-service-description+xml": { source: "iana", compressible: !0 },
  "application/mbox": { source: "iana", extensions: ["mbox"] },
  "application/media-policy-dataset+xml": { source: "iana", compressible: !0, extensions: ["mpf"] },
  "application/media_control+xml": { source: "iana", compressible: !0 },
  "application/mediaservercontrol+xml": { source: "iana", compressible: !0, extensions: ["mscml"] },
  "application/merge-patch+json": { source: "iana", compressible: !0 },
  "application/metalink+xml": { source: "apache", compressible: !0, extensions: ["metalink"] },
  "application/metalink4+xml": { source: "iana", compressible: !0, extensions: ["meta4"] },
  "application/mets+xml": { source: "iana", compressible: !0, extensions: ["mets"] },
  "application/mf4": { source: "iana" },
  "application/mikey": { source: "iana" },
  "application/mipc": { source: "iana" },
  "application/missing-blocks+cbor-seq": { source: "iana" },
  "application/mmt-aei+xml": { source: "iana", compressible: !0, extensions: ["maei"] },
  "application/mmt-usd+xml": { source: "iana", compressible: !0, extensions: ["musd"] },
  "application/mods+xml": { source: "iana", compressible: !0, extensions: ["mods"] },
  "application/moss-keys": { source: "iana" },
  "application/moss-signature": { source: "iana" },
  "application/mosskey-data": { source: "iana" },
  "application/mosskey-request": { source: "iana" },
  "application/mp21": { source: "iana", extensions: ["m21", "mp21"] },
  "application/mp4": { source: "iana", extensions: ["mp4s", "m4p"] },
  "application/mpeg4-generic": { source: "iana" },
  "application/mpeg4-iod": { source: "iana" },
  "application/mpeg4-iod-xmt": { source: "iana" },
  "application/mrb-consumer+xml": { source: "iana", compressible: !0 },
  "application/mrb-publish+xml": { source: "iana", compressible: !0 },
  "application/msc-ivr+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/msc-mixer+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/msword": { source: "iana", compressible: !1, extensions: ["doc", "dot"] },
  "application/mud+json": { source: "iana", compressible: !0 },
  "application/multipart-core": { source: "iana" },
  "application/mxf": { source: "iana", extensions: ["mxf"] },
  "application/n-quads": { source: "iana", extensions: ["nq"] },
  "application/n-triples": { source: "iana", extensions: ["nt"] },
  "application/nasdata": { source: "iana" },
  "application/news-checkgroups": { source: "iana", charset: "US-ASCII" },
  "application/news-groupinfo": { source: "iana", charset: "US-ASCII" },
  "application/news-transmission": { source: "iana" },
  "application/nlsml+xml": { source: "iana", compressible: !0 },
  "application/node": { source: "iana", extensions: ["cjs"] },
  "application/nss": { source: "iana" },
  "application/oauth-authz-req+jwt": { source: "iana" },
  "application/oblivious-dns-message": { source: "iana" },
  "application/ocsp-request": { source: "iana" },
  "application/ocsp-response": { source: "iana" },
  "application/octet-stream": { source: "iana", compressible: !1, extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"] },
  "application/oda": { source: "iana", extensions: ["oda"] },
  "application/odm+xml": { source: "iana", compressible: !0 },
  "application/odx": { source: "iana" },
  "application/oebps-package+xml": { source: "iana", compressible: !0, extensions: ["opf"] },
  "application/ogg": { source: "iana", compressible: !1, extensions: ["ogx"] },
  "application/omdoc+xml": { source: "apache", compressible: !0, extensions: ["omdoc"] },
  "application/onenote": { source: "apache", extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"] },
  "application/opc-nodeset+xml": { source: "iana", compressible: !0 },
  "application/oscore": { source: "iana" },
  "application/oxps": { source: "iana", extensions: ["oxps"] },
  "application/p21": { source: "iana" },
  "application/p21+zip": { source: "iana", compressible: !1 },
  "application/p2p-overlay+xml": { source: "iana", compressible: !0, extensions: ["relo"] },
  "application/parityfec": { source: "iana" },
  "application/passport": { source: "iana" },
  "application/patch-ops-error+xml": { source: "iana", compressible: !0, extensions: ["xer"] },
  "application/pdf": { source: "iana", compressible: !1, extensions: ["pdf"] },
  "application/pdx": { source: "iana" },
  "application/pem-certificate-chain": { source: "iana" },
  "application/pgp-encrypted": { source: "iana", compressible: !1, extensions: ["pgp"] },
  "application/pgp-keys": { source: "iana", extensions: ["asc"] },
  "application/pgp-signature": { source: "iana", extensions: ["asc", "sig"] },
  "application/pics-rules": { source: "apache", extensions: ["prf"] },
  "application/pidf+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/pidf-diff+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/pkcs10": { source: "iana", extensions: ["p10"] },
  "application/pkcs12": { source: "iana" },
  "application/pkcs7-mime": { source: "iana", extensions: ["p7m", "p7c"] },
  "application/pkcs7-signature": { source: "iana", extensions: ["p7s"] },
  "application/pkcs8": { source: "iana", extensions: ["p8"] },
  "application/pkcs8-encrypted": { source: "iana" },
  "application/pkix-attr-cert": { source: "iana", extensions: ["ac"] },
  "application/pkix-cert": { source: "iana", extensions: ["cer"] },
  "application/pkix-crl": { source: "iana", extensions: ["crl"] },
  "application/pkix-pkipath": { source: "iana", extensions: ["pkipath"] },
  "application/pkixcmp": { source: "iana", extensions: ["pki"] },
  "application/pls+xml": { source: "iana", compressible: !0, extensions: ["pls"] },
  "application/poc-settings+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/postscript": { source: "iana", compressible: !0, extensions: ["ai", "eps", "ps"] },
  "application/ppsp-tracker+json": { source: "iana", compressible: !0 },
  "application/problem+json": { source: "iana", compressible: !0 },
  "application/problem+xml": { source: "iana", compressible: !0 },
  "application/provenance+xml": { source: "iana", compressible: !0, extensions: ["provx"] },
  "application/prs.alvestrand.titrax-sheet": { source: "iana" },
  "application/prs.cww": { source: "iana", extensions: ["cww"] },
  "application/prs.cyn": { source: "iana", charset: "7-BIT" },
  "application/prs.hpub+zip": { source: "iana", compressible: !1 },
  "application/prs.nprend": { source: "iana" },
  "application/prs.plucker": { source: "iana" },
  "application/prs.rdf-xml-crypt": { source: "iana" },
  "application/prs.xsf+xml": { source: "iana", compressible: !0 },
  "application/pskc+xml": { source: "iana", compressible: !0, extensions: ["pskcxml"] },
  "application/pvd+json": { source: "iana", compressible: !0 },
  "application/qsig": { source: "iana" },
  "application/raml+yaml": { compressible: !0, extensions: ["raml"] },
  "application/raptorfec": { source: "iana" },
  "application/rdap+json": { source: "iana", compressible: !0 },
  "application/rdf+xml": { source: "iana", compressible: !0, extensions: ["rdf", "owl"] },
  "application/reginfo+xml": { source: "iana", compressible: !0, extensions: ["rif"] },
  "application/relax-ng-compact-syntax": { source: "iana", extensions: ["rnc"] },
  "application/remote-printing": { source: "iana" },
  "application/reputon+json": { source: "iana", compressible: !0 },
  "application/resource-lists+xml": { source: "iana", compressible: !0, extensions: ["rl"] },
  "application/resource-lists-diff+xml": { source: "iana", compressible: !0, extensions: ["rld"] },
  "application/rfc+xml": { source: "iana", compressible: !0 },
  "application/riscos": { source: "iana" },
  "application/rlmi+xml": { source: "iana", compressible: !0 },
  "application/rls-services+xml": { source: "iana", compressible: !0, extensions: ["rs"] },
  "application/route-apd+xml": { source: "iana", compressible: !0, extensions: ["rapd"] },
  "application/route-s-tsid+xml": { source: "iana", compressible: !0, extensions: ["sls"] },
  "application/route-usd+xml": { source: "iana", compressible: !0, extensions: ["rusd"] },
  "application/rpki-ghostbusters": { source: "iana", extensions: ["gbr"] },
  "application/rpki-manifest": { source: "iana", extensions: ["mft"] },
  "application/rpki-publication": { source: "iana" },
  "application/rpki-roa": { source: "iana", extensions: ["roa"] },
  "application/rpki-updown": { source: "iana" },
  "application/rsd+xml": { source: "apache", compressible: !0, extensions: ["rsd"] },
  "application/rss+xml": { source: "apache", compressible: !0, extensions: ["rss"] },
  "application/rtf": { source: "iana", compressible: !0, extensions: ["rtf"] },
  "application/rtploopback": { source: "iana" },
  "application/rtx": { source: "iana" },
  "application/samlassertion+xml": { source: "iana", compressible: !0 },
  "application/samlmetadata+xml": { source: "iana", compressible: !0 },
  "application/sarif+json": { source: "iana", compressible: !0 },
  "application/sarif-external-properties+json": { source: "iana", compressible: !0 },
  "application/sbe": { source: "iana" },
  "application/sbml+xml": { source: "iana", compressible: !0, extensions: ["sbml"] },
  "application/scaip+xml": { source: "iana", compressible: !0 },
  "application/scim+json": { source: "iana", compressible: !0 },
  "application/scvp-cv-request": { source: "iana", extensions: ["scq"] },
  "application/scvp-cv-response": { source: "iana", extensions: ["scs"] },
  "application/scvp-vp-request": { source: "iana", extensions: ["spq"] },
  "application/scvp-vp-response": { source: "iana", extensions: ["spp"] },
  "application/sdp": { source: "iana", extensions: ["sdp"] },
  "application/secevent+jwt": { source: "iana" },
  "application/senml+cbor": { source: "iana" },
  "application/senml+json": { source: "iana", compressible: !0 },
  "application/senml+xml": { source: "iana", compressible: !0, extensions: ["senmlx"] },
  "application/senml-etch+cbor": { source: "iana" },
  "application/senml-etch+json": { source: "iana", compressible: !0 },
  "application/senml-exi": { source: "iana" },
  "application/sensml+cbor": { source: "iana" },
  "application/sensml+json": { source: "iana", compressible: !0 },
  "application/sensml+xml": { source: "iana", compressible: !0, extensions: ["sensmlx"] },
  "application/sensml-exi": { source: "iana" },
  "application/sep+xml": { source: "iana", compressible: !0 },
  "application/sep-exi": { source: "iana" },
  "application/session-info": { source: "iana" },
  "application/set-payment": { source: "iana" },
  "application/set-payment-initiation": { source: "iana", extensions: ["setpay"] },
  "application/set-registration": { source: "iana" },
  "application/set-registration-initiation": { source: "iana", extensions: ["setreg"] },
  "application/sgml": { source: "iana" },
  "application/sgml-open-catalog": { source: "iana" },
  "application/shf+xml": { source: "iana", compressible: !0, extensions: ["shf"] },
  "application/sieve": { source: "iana", extensions: ["siv", "sieve"] },
  "application/simple-filter+xml": { source: "iana", compressible: !0 },
  "application/simple-message-summary": { source: "iana" },
  "application/simplesymbolcontainer": { source: "iana" },
  "application/sipc": { source: "iana" },
  "application/slate": { source: "iana" },
  "application/smil": { source: "iana" },
  "application/smil+xml": { source: "iana", compressible: !0, extensions: ["smi", "smil"] },
  "application/smpte336m": { source: "iana" },
  "application/soap+fastinfoset": { source: "iana" },
  "application/soap+xml": { source: "iana", compressible: !0 },
  "application/sparql-query": { source: "iana", extensions: ["rq"] },
  "application/sparql-results+xml": { source: "iana", compressible: !0, extensions: ["srx"] },
  "application/spdx+json": { source: "iana", compressible: !0 },
  "application/spirits-event+xml": { source: "iana", compressible: !0 },
  "application/sql": { source: "iana" },
  "application/srgs": { source: "iana", extensions: ["gram"] },
  "application/srgs+xml": { source: "iana", compressible: !0, extensions: ["grxml"] },
  "application/sru+xml": { source: "iana", compressible: !0, extensions: ["sru"] },
  "application/ssdl+xml": { source: "apache", compressible: !0, extensions: ["ssdl"] },
  "application/ssml+xml": { source: "iana", compressible: !0, extensions: ["ssml"] },
  "application/stix+json": { source: "iana", compressible: !0 },
  "application/swid+xml": { source: "iana", compressible: !0, extensions: ["swidtag"] },
  "application/tamp-apex-update": { source: "iana" },
  "application/tamp-apex-update-confirm": { source: "iana" },
  "application/tamp-community-update": { source: "iana" },
  "application/tamp-community-update-confirm": { source: "iana" },
  "application/tamp-error": { source: "iana" },
  "application/tamp-sequence-adjust": { source: "iana" },
  "application/tamp-sequence-adjust-confirm": { source: "iana" },
  "application/tamp-status-query": { source: "iana" },
  "application/tamp-status-response": { source: "iana" },
  "application/tamp-update": { source: "iana" },
  "application/tamp-update-confirm": { source: "iana" },
  "application/tar": { compressible: !0 },
  "application/taxii+json": { source: "iana", compressible: !0 },
  "application/td+json": { source: "iana", compressible: !0 },
  "application/tei+xml": { source: "iana", compressible: !0, extensions: ["tei", "teicorpus"] },
  "application/tetra_isi": { source: "iana" },
  "application/thraud+xml": { source: "iana", compressible: !0, extensions: ["tfi"] },
  "application/timestamp-query": { source: "iana" },
  "application/timestamp-reply": { source: "iana" },
  "application/timestamped-data": { source: "iana", extensions: ["tsd"] },
  "application/tlsrpt+gzip": { source: "iana" },
  "application/tlsrpt+json": { source: "iana", compressible: !0 },
  "application/tnauthlist": { source: "iana" },
  "application/token-introspection+jwt": { source: "iana" },
  "application/toml": { compressible: !0, extensions: ["toml"] },
  "application/trickle-ice-sdpfrag": { source: "iana" },
  "application/trig": { source: "iana", extensions: ["trig"] },
  "application/ttml+xml": { source: "iana", compressible: !0, extensions: ["ttml"] },
  "application/tve-trigger": { source: "iana" },
  "application/tzif": { source: "iana" },
  "application/tzif-leap": { source: "iana" },
  "application/ubjson": { compressible: !1, extensions: ["ubj"] },
  "application/ulpfec": { source: "iana" },
  "application/urc-grpsheet+xml": { source: "iana", compressible: !0 },
  "application/urc-ressheet+xml": { source: "iana", compressible: !0, extensions: ["rsheet"] },
  "application/urc-targetdesc+xml": { source: "iana", compressible: !0, extensions: ["td"] },
  "application/urc-uisocketdesc+xml": { source: "iana", compressible: !0 },
  "application/vcard+json": { source: "iana", compressible: !0 },
  "application/vcard+xml": { source: "iana", compressible: !0 },
  "application/vemmi": { source: "iana" },
  "application/vividence.scriptfile": { source: "apache" },
  "application/vnd.1000minds.decision-model+xml": { source: "iana", compressible: !0, extensions: ["1km"] },
  "application/vnd.3gpp-prose+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp-prose-pc3ch+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp-v2x-local-service-information": { source: "iana" },
  "application/vnd.3gpp.5gnas": { source: "iana" },
  "application/vnd.3gpp.access-transfer-events+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.bsf+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.gmop+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.gtpc": { source: "iana" },
  "application/vnd.3gpp.interworking-data": { source: "iana" },
  "application/vnd.3gpp.lpp": { source: "iana" },
  "application/vnd.3gpp.mc-signalling-ear": { source: "iana" },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcdata-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcdata-payload": { source: "iana" },
  "application/vnd.3gpp.mcdata-service-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcdata-signalling": { source: "iana" },
  "application/vnd.3gpp.mcdata-ue-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcdata-user-profile+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-floor-request+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-location-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-service-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-signed+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-ue-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcptt-user-profile+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-location-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-service-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-ue-config+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mcvideo-user-profile+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.mid-call+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.ngap": { source: "iana" },
  "application/vnd.3gpp.pfcp": { source: "iana" },
  "application/vnd.3gpp.pic-bw-large": { source: "iana", extensions: ["plb"] },
  "application/vnd.3gpp.pic-bw-small": { source: "iana", extensions: ["psb"] },
  "application/vnd.3gpp.pic-bw-var": { source: "iana", extensions: ["pvb"] },
  "application/vnd.3gpp.s1ap": { source: "iana" },
  "application/vnd.3gpp.sms": { source: "iana" },
  "application/vnd.3gpp.sms+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.srvcc-ext+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.srvcc-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.state-and-event-info+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp.ussd+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp2.bcmcsinfo+xml": { source: "iana", compressible: !0 },
  "application/vnd.3gpp2.sms": { source: "iana" },
  "application/vnd.3gpp2.tcap": { source: "iana", extensions: ["tcap"] },
  "application/vnd.3lightssoftware.imagescal": { source: "iana" },
  "application/vnd.3m.post-it-notes": { source: "iana", extensions: ["pwn"] },
  "application/vnd.accpac.simply.aso": { source: "iana", extensions: ["aso"] },
  "application/vnd.accpac.simply.imp": { source: "iana", extensions: ["imp"] },
  "application/vnd.acucobol": { source: "iana", extensions: ["acu"] },
  "application/vnd.acucorp": { source: "iana", extensions: ["atc", "acutc"] },
  "application/vnd.adobe.air-application-installer-package+zip": { source: "apache", compressible: !1, extensions: ["air"] },
  "application/vnd.adobe.flash.movie": { source: "iana" },
  "application/vnd.adobe.formscentral.fcdt": { source: "iana", extensions: ["fcdt"] },
  "application/vnd.adobe.fxp": { source: "iana", extensions: ["fxp", "fxpl"] },
  "application/vnd.adobe.partial-upload": { source: "iana" },
  "application/vnd.adobe.xdp+xml": { source: "iana", compressible: !0, extensions: ["xdp"] },
  "application/vnd.adobe.xfdf": { source: "iana", extensions: ["xfdf"] },
  "application/vnd.aether.imp": { source: "iana" },
  "application/vnd.afpc.afplinedata": { source: "iana" },
  "application/vnd.afpc.afplinedata-pagedef": { source: "iana" },
  "application/vnd.afpc.cmoca-cmresource": { source: "iana" },
  "application/vnd.afpc.foca-charset": { source: "iana" },
  "application/vnd.afpc.foca-codedfont": { source: "iana" },
  "application/vnd.afpc.foca-codepage": { source: "iana" },
  "application/vnd.afpc.modca": { source: "iana" },
  "application/vnd.afpc.modca-cmtable": { source: "iana" },
  "application/vnd.afpc.modca-formdef": { source: "iana" },
  "application/vnd.afpc.modca-mediummap": { source: "iana" },
  "application/vnd.afpc.modca-objectcontainer": { source: "iana" },
  "application/vnd.afpc.modca-overlay": { source: "iana" },
  "application/vnd.afpc.modca-pagesegment": { source: "iana" },
  "application/vnd.age": { source: "iana", extensions: ["age"] },
  "application/vnd.ah-barcode": { source: "iana" },
  "application/vnd.ahead.space": { source: "iana", extensions: ["ahead"] },
  "application/vnd.airzip.filesecure.azf": { source: "iana", extensions: ["azf"] },
  "application/vnd.airzip.filesecure.azs": { source: "iana", extensions: ["azs"] },
  "application/vnd.amadeus+json": { source: "iana", compressible: !0 },
  "application/vnd.amazon.ebook": { source: "apache", extensions: ["azw"] },
  "application/vnd.amazon.mobi8-ebook": { source: "iana" },
  "application/vnd.americandynamics.acc": { source: "iana", extensions: ["acc"] },
  "application/vnd.amiga.ami": { source: "iana", extensions: ["ami"] },
  "application/vnd.amundsen.maze+xml": { source: "iana", compressible: !0 },
  "application/vnd.android.ota": { source: "iana" },
  "application/vnd.android.package-archive": { source: "apache", compressible: !1, extensions: ["apk"] },
  "application/vnd.anki": { source: "iana" },
  "application/vnd.anser-web-certificate-issue-initiation": { source: "iana", extensions: ["cii"] },
  "application/vnd.anser-web-funds-transfer-initiation": { source: "apache", extensions: ["fti"] },
  "application/vnd.antix.game-component": { source: "iana", extensions: ["atx"] },
  "application/vnd.apache.arrow.file": { source: "iana" },
  "application/vnd.apache.arrow.stream": { source: "iana" },
  "application/vnd.apache.thrift.binary": { source: "iana" },
  "application/vnd.apache.thrift.compact": { source: "iana" },
  "application/vnd.apache.thrift.json": { source: "iana" },
  "application/vnd.api+json": { source: "iana", compressible: !0 },
  "application/vnd.aplextor.warrp+json": { source: "iana", compressible: !0 },
  "application/vnd.apothekende.reservation+json": { source: "iana", compressible: !0 },
  "application/vnd.apple.installer+xml": { source: "iana", compressible: !0, extensions: ["mpkg"] },
  "application/vnd.apple.keynote": { source: "iana", extensions: ["key"] },
  "application/vnd.apple.mpegurl": { source: "iana", extensions: ["m3u8"] },
  "application/vnd.apple.numbers": { source: "iana", extensions: ["numbers"] },
  "application/vnd.apple.pages": { source: "iana", extensions: ["pages"] },
  "application/vnd.apple.pkpass": { compressible: !1, extensions: ["pkpass"] },
  "application/vnd.arastra.swi": { source: "iana" },
  "application/vnd.aristanetworks.swi": { source: "iana", extensions: ["swi"] },
  "application/vnd.artisan+json": { source: "iana", compressible: !0 },
  "application/vnd.artsquare": { source: "iana" },
  "application/vnd.astraea-software.iota": { source: "iana", extensions: ["iota"] },
  "application/vnd.audiograph": { source: "iana", extensions: ["aep"] },
  "application/vnd.autopackage": { source: "iana" },
  "application/vnd.avalon+json": { source: "iana", compressible: !0 },
  "application/vnd.avistar+xml": { source: "iana", compressible: !0 },
  "application/vnd.balsamiq.bmml+xml": { source: "iana", compressible: !0, extensions: ["bmml"] },
  "application/vnd.balsamiq.bmpr": { source: "iana" },
  "application/vnd.banana-accounting": { source: "iana" },
  "application/vnd.bbf.usp.error": { source: "iana" },
  "application/vnd.bbf.usp.msg": { source: "iana" },
  "application/vnd.bbf.usp.msg+json": { source: "iana", compressible: !0 },
  "application/vnd.bekitzur-stech+json": { source: "iana", compressible: !0 },
  "application/vnd.bint.med-content": { source: "iana" },
  "application/vnd.biopax.rdf+xml": { source: "iana", compressible: !0 },
  "application/vnd.blink-idb-value-wrapper": { source: "iana" },
  "application/vnd.blueice.multipass": { source: "iana", extensions: ["mpm"] },
  "application/vnd.bluetooth.ep.oob": { source: "iana" },
  "application/vnd.bluetooth.le.oob": { source: "iana" },
  "application/vnd.bmi": { source: "iana", extensions: ["bmi"] },
  "application/vnd.bpf": { source: "iana" },
  "application/vnd.bpf3": { source: "iana" },
  "application/vnd.businessobjects": { source: "iana", extensions: ["rep"] },
  "application/vnd.byu.uapi+json": { source: "iana", compressible: !0 },
  "application/vnd.cab-jscript": { source: "iana" },
  "application/vnd.canon-cpdl": { source: "iana" },
  "application/vnd.canon-lips": { source: "iana" },
  "application/vnd.capasystems-pg+json": { source: "iana", compressible: !0 },
  "application/vnd.cendio.thinlinc.clientconf": { source: "iana" },
  "application/vnd.century-systems.tcp_stream": { source: "iana" },
  "application/vnd.chemdraw+xml": { source: "iana", compressible: !0, extensions: ["cdxml"] },
  "application/vnd.chess-pgn": { source: "iana" },
  "application/vnd.chipnuts.karaoke-mmd": { source: "iana", extensions: ["mmd"] },
  "application/vnd.ciedi": { source: "iana" },
  "application/vnd.cinderella": { source: "iana", extensions: ["cdy"] },
  "application/vnd.cirpack.isdn-ext": { source: "iana" },
  "application/vnd.citationstyles.style+xml": { source: "iana", compressible: !0, extensions: ["csl"] },
  "application/vnd.claymore": { source: "iana", extensions: ["cla"] },
  "application/vnd.cloanto.rp9": { source: "iana", extensions: ["rp9"] },
  "application/vnd.clonk.c4group": { source: "iana", extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"] },
  "application/vnd.cluetrust.cartomobile-config": { source: "iana", extensions: ["c11amc"] },
  "application/vnd.cluetrust.cartomobile-config-pkg": { source: "iana", extensions: ["c11amz"] },
  "application/vnd.coffeescript": { source: "iana" },
  "application/vnd.collabio.xodocuments.document": { source: "iana" },
  "application/vnd.collabio.xodocuments.document-template": { source: "iana" },
  "application/vnd.collabio.xodocuments.presentation": { source: "iana" },
  "application/vnd.collabio.xodocuments.presentation-template": { source: "iana" },
  "application/vnd.collabio.xodocuments.spreadsheet": { source: "iana" },
  "application/vnd.collabio.xodocuments.spreadsheet-template": { source: "iana" },
  "application/vnd.collection+json": { source: "iana", compressible: !0 },
  "application/vnd.collection.doc+json": { source: "iana", compressible: !0 },
  "application/vnd.collection.next+json": { source: "iana", compressible: !0 },
  "application/vnd.comicbook+zip": { source: "iana", compressible: !1 },
  "application/vnd.comicbook-rar": { source: "iana" },
  "application/vnd.commerce-battelle": { source: "iana" },
  "application/vnd.commonspace": { source: "iana", extensions: ["csp"] },
  "application/vnd.contact.cmsg": { source: "iana", extensions: ["cdbcmsg"] },
  "application/vnd.coreos.ignition+json": { source: "iana", compressible: !0 },
  "application/vnd.cosmocaller": { source: "iana", extensions: ["cmc"] },
  "application/vnd.crick.clicker": { source: "iana", extensions: ["clkx"] },
  "application/vnd.crick.clicker.keyboard": { source: "iana", extensions: ["clkk"] },
  "application/vnd.crick.clicker.palette": { source: "iana", extensions: ["clkp"] },
  "application/vnd.crick.clicker.template": { source: "iana", extensions: ["clkt"] },
  "application/vnd.crick.clicker.wordbank": { source: "iana", extensions: ["clkw"] },
  "application/vnd.criticaltools.wbs+xml": { source: "iana", compressible: !0, extensions: ["wbs"] },
  "application/vnd.cryptii.pipe+json": { source: "iana", compressible: !0 },
  "application/vnd.crypto-shade-file": { source: "iana" },
  "application/vnd.cryptomator.encrypted": { source: "iana" },
  "application/vnd.cryptomator.vault": { source: "iana" },
  "application/vnd.ctc-posml": { source: "iana", extensions: ["pml"] },
  "application/vnd.ctct.ws+xml": { source: "iana", compressible: !0 },
  "application/vnd.cups-pdf": { source: "iana" },
  "application/vnd.cups-postscript": { source: "iana" },
  "application/vnd.cups-ppd": { source: "iana", extensions: ["ppd"] },
  "application/vnd.cups-raster": { source: "iana" },
  "application/vnd.cups-raw": { source: "iana" },
  "application/vnd.curl": { source: "iana" },
  "application/vnd.curl.car": { source: "apache", extensions: ["car"] },
  "application/vnd.curl.pcurl": { source: "apache", extensions: ["pcurl"] },
  "application/vnd.cyan.dean.root+xml": { source: "iana", compressible: !0 },
  "application/vnd.cybank": { source: "iana" },
  "application/vnd.cyclonedx+json": { source: "iana", compressible: !0 },
  "application/vnd.cyclonedx+xml": { source: "iana", compressible: !0 },
  "application/vnd.d2l.coursepackage1p0+zip": { source: "iana", compressible: !1 },
  "application/vnd.d3m-dataset": { source: "iana" },
  "application/vnd.d3m-problem": { source: "iana" },
  "application/vnd.dart": { source: "iana", compressible: !0, extensions: ["dart"] },
  "application/vnd.data-vision.rdz": { source: "iana", extensions: ["rdz"] },
  "application/vnd.datapackage+json": { source: "iana", compressible: !0 },
  "application/vnd.dataresource+json": { source: "iana", compressible: !0 },
  "application/vnd.dbf": { source: "iana", extensions: ["dbf"] },
  "application/vnd.debian.binary-package": { source: "iana" },
  "application/vnd.dece.data": { source: "iana", extensions: ["uvf", "uvvf", "uvd", "uvvd"] },
  "application/vnd.dece.ttml+xml": { source: "iana", compressible: !0, extensions: ["uvt", "uvvt"] },
  "application/vnd.dece.unspecified": { source: "iana", extensions: ["uvx", "uvvx"] },
  "application/vnd.dece.zip": { source: "iana", extensions: ["uvz", "uvvz"] },
  "application/vnd.denovo.fcselayout-link": { source: "iana", extensions: ["fe_launch"] },
  "application/vnd.desmume.movie": { source: "iana" },
  "application/vnd.dir-bi.plate-dl-nosuffix": { source: "iana" },
  "application/vnd.dm.delegation+xml": { source: "iana", compressible: !0 },
  "application/vnd.dna": { source: "iana", extensions: ["dna"] },
  "application/vnd.document+json": { source: "iana", compressible: !0 },
  "application/vnd.dolby.mlp": { source: "apache", extensions: ["mlp"] },
  "application/vnd.dolby.mobile.1": { source: "iana" },
  "application/vnd.dolby.mobile.2": { source: "iana" },
  "application/vnd.doremir.scorecloud-binary-document": { source: "iana" },
  "application/vnd.dpgraph": { source: "iana", extensions: ["dpg"] },
  "application/vnd.dreamfactory": { source: "iana", extensions: ["dfac"] },
  "application/vnd.drive+json": { source: "iana", compressible: !0 },
  "application/vnd.ds-keypoint": { source: "apache", extensions: ["kpxx"] },
  "application/vnd.dtg.local": { source: "iana" },
  "application/vnd.dtg.local.flash": { source: "iana" },
  "application/vnd.dtg.local.html": { source: "iana" },
  "application/vnd.dvb.ait": { source: "iana", extensions: ["ait"] },
  "application/vnd.dvb.dvbisl+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.dvbj": { source: "iana" },
  "application/vnd.dvb.esgcontainer": { source: "iana" },
  "application/vnd.dvb.ipdcdftnotifaccess": { source: "iana" },
  "application/vnd.dvb.ipdcesgaccess": { source: "iana" },
  "application/vnd.dvb.ipdcesgaccess2": { source: "iana" },
  "application/vnd.dvb.ipdcesgpdd": { source: "iana" },
  "application/vnd.dvb.ipdcroaming": { source: "iana" },
  "application/vnd.dvb.iptv.alfec-base": { source: "iana" },
  "application/vnd.dvb.iptv.alfec-enhancement": { source: "iana" },
  "application/vnd.dvb.notif-aggregate-root+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-container+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-generic+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-ia-msglist+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-ia-registration-request+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-ia-registration-response+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.notif-init+xml": { source: "iana", compressible: !0 },
  "application/vnd.dvb.pfr": { source: "iana" },
  "application/vnd.dvb.service": { source: "iana", extensions: ["svc"] },
  "application/vnd.dxr": { source: "iana" },
  "application/vnd.dynageo": { source: "iana", extensions: ["geo"] },
  "application/vnd.dzr": { source: "iana" },
  "application/vnd.easykaraoke.cdgdownload": { source: "iana" },
  "application/vnd.ecdis-update": { source: "iana" },
  "application/vnd.ecip.rlp": { source: "iana" },
  "application/vnd.eclipse.ditto+json": { source: "iana", compressible: !0 },
  "application/vnd.ecowin.chart": { source: "iana", extensions: ["mag"] },
  "application/vnd.ecowin.filerequest": { source: "iana" },
  "application/vnd.ecowin.fileupdate": { source: "iana" },
  "application/vnd.ecowin.series": { source: "iana" },
  "application/vnd.ecowin.seriesrequest": { source: "iana" },
  "application/vnd.ecowin.seriesupdate": { source: "iana" },
  "application/vnd.efi.img": { source: "iana" },
  "application/vnd.efi.iso": { source: "iana" },
  "application/vnd.emclient.accessrequest+xml": { source: "iana", compressible: !0 },
  "application/vnd.enliven": { source: "iana", extensions: ["nml"] },
  "application/vnd.enphase.envoy": { source: "iana" },
  "application/vnd.eprints.data+xml": { source: "iana", compressible: !0 },
  "application/vnd.epson.esf": { source: "iana", extensions: ["esf"] },
  "application/vnd.epson.msf": { source: "iana", extensions: ["msf"] },
  "application/vnd.epson.quickanime": { source: "iana", extensions: ["qam"] },
  "application/vnd.epson.salt": { source: "iana", extensions: ["slt"] },
  "application/vnd.epson.ssf": { source: "iana", extensions: ["ssf"] },
  "application/vnd.ericsson.quickcall": { source: "iana" },
  "application/vnd.espass-espass+zip": { source: "iana", compressible: !1 },
  "application/vnd.eszigno3+xml": { source: "iana", compressible: !0, extensions: ["es3", "et3"] },
  "application/vnd.etsi.aoc+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.asic-e+zip": { source: "iana", compressible: !1 },
  "application/vnd.etsi.asic-s+zip": { source: "iana", compressible: !1 },
  "application/vnd.etsi.cug+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvcommand+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvdiscovery+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvprofile+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvsad-bc+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvsad-cod+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvsad-npvr+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvservice+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvsync+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.iptvueprofile+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.mcid+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.mheg5": { source: "iana" },
  "application/vnd.etsi.overload-control-policy-dataset+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.pstn+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.sci+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.simservs+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.timestamp-token": { source: "iana" },
  "application/vnd.etsi.tsl+xml": { source: "iana", compressible: !0 },
  "application/vnd.etsi.tsl.der": { source: "iana" },
  "application/vnd.eu.kasparian.car+json": { source: "iana", compressible: !0 },
  "application/vnd.eudora.data": { source: "iana" },
  "application/vnd.evolv.ecig.profile": { source: "iana" },
  "application/vnd.evolv.ecig.settings": { source: "iana" },
  "application/vnd.evolv.ecig.theme": { source: "iana" },
  "application/vnd.exstream-empower+zip": { source: "iana", compressible: !1 },
  "application/vnd.exstream-package": { source: "iana" },
  "application/vnd.ezpix-album": { source: "iana", extensions: ["ez2"] },
  "application/vnd.ezpix-package": { source: "iana", extensions: ["ez3"] },
  "application/vnd.f-secure.mobile": { source: "iana" },
  "application/vnd.familysearch.gedcom+zip": { source: "iana", compressible: !1 },
  "application/vnd.fastcopy-disk-image": { source: "iana" },
  "application/vnd.fdf": { source: "iana", extensions: ["fdf"] },
  "application/vnd.fdsn.mseed": { source: "iana", extensions: ["mseed"] },
  "application/vnd.fdsn.seed": { source: "iana", extensions: ["seed", "dataless"] },
  "application/vnd.ffsns": { source: "iana" },
  "application/vnd.ficlab.flb+zip": { source: "iana", compressible: !1 },
  "application/vnd.filmit.zfc": { source: "iana" },
  "application/vnd.fints": { source: "iana" },
  "application/vnd.firemonkeys.cloudcell": { source: "iana" },
  "application/vnd.flographit": { source: "iana", extensions: ["gph"] },
  "application/vnd.fluxtime.clip": { source: "iana", extensions: ["ftc"] },
  "application/vnd.font-fontforge-sfd": { source: "iana" },
  "application/vnd.framemaker": { source: "iana", extensions: ["fm", "frame", "maker", "book"] },
  "application/vnd.frogans.fnc": { source: "iana", extensions: ["fnc"] },
  "application/vnd.frogans.ltf": { source: "iana", extensions: ["ltf"] },
  "application/vnd.fsc.weblaunch": { source: "iana", extensions: ["fsc"] },
  "application/vnd.fujifilm.fb.docuworks": { source: "iana" },
  "application/vnd.fujifilm.fb.docuworks.binder": { source: "iana" },
  "application/vnd.fujifilm.fb.docuworks.container": { source: "iana" },
  "application/vnd.fujifilm.fb.jfi+xml": { source: "iana", compressible: !0 },
  "application/vnd.fujitsu.oasys": { source: "iana", extensions: ["oas"] },
  "application/vnd.fujitsu.oasys2": { source: "iana", extensions: ["oa2"] },
  "application/vnd.fujitsu.oasys3": { source: "iana", extensions: ["oa3"] },
  "application/vnd.fujitsu.oasysgp": { source: "iana", extensions: ["fg5"] },
  "application/vnd.fujitsu.oasysprs": { source: "iana", extensions: ["bh2"] },
  "application/vnd.fujixerox.art-ex": { source: "iana" },
  "application/vnd.fujixerox.art4": { source: "iana" },
  "application/vnd.fujixerox.ddd": { source: "iana", extensions: ["ddd"] },
  "application/vnd.fujixerox.docuworks": { source: "iana", extensions: ["xdw"] },
  "application/vnd.fujixerox.docuworks.binder": { source: "iana", extensions: ["xbd"] },
  "application/vnd.fujixerox.docuworks.container": { source: "iana" },
  "application/vnd.fujixerox.hbpl": { source: "iana" },
  "application/vnd.fut-misnet": { source: "iana" },
  "application/vnd.futoin+cbor": { source: "iana" },
  "application/vnd.futoin+json": { source: "iana", compressible: !0 },
  "application/vnd.fuzzysheet": { source: "iana", extensions: ["fzs"] },
  "application/vnd.genomatix.tuxedo": { source: "iana", extensions: ["txd"] },
  "application/vnd.gentics.grd+json": { source: "iana", compressible: !0 },
  "application/vnd.geo+json": { source: "iana", compressible: !0 },
  "application/vnd.geocube+xml": { source: "iana", compressible: !0 },
  "application/vnd.geogebra.file": { source: "iana", extensions: ["ggb"] },
  "application/vnd.geogebra.slides": { source: "iana" },
  "application/vnd.geogebra.tool": { source: "iana", extensions: ["ggt"] },
  "application/vnd.geometry-explorer": { source: "iana", extensions: ["gex", "gre"] },
  "application/vnd.geonext": { source: "iana", extensions: ["gxt"] },
  "application/vnd.geoplan": { source: "iana", extensions: ["g2w"] },
  "application/vnd.geospace": { source: "iana", extensions: ["g3w"] },
  "application/vnd.gerber": { source: "iana" },
  "application/vnd.globalplatform.card-content-mgt": { source: "iana" },
  "application/vnd.globalplatform.card-content-mgt-response": { source: "iana" },
  "application/vnd.gmx": { source: "iana", extensions: ["gmx"] },
  "application/vnd.google-apps.document": { compressible: !1, extensions: ["gdoc"] },
  "application/vnd.google-apps.presentation": { compressible: !1, extensions: ["gslides"] },
  "application/vnd.google-apps.spreadsheet": { compressible: !1, extensions: ["gsheet"] },
  "application/vnd.google-earth.kml+xml": { source: "iana", compressible: !0, extensions: ["kml"] },
  "application/vnd.google-earth.kmz": { source: "iana", compressible: !1, extensions: ["kmz"] },
  "application/vnd.gov.sk.e-form+xml": { source: "iana", compressible: !0 },
  "application/vnd.gov.sk.e-form+zip": { source: "iana", compressible: !1 },
  "application/vnd.gov.sk.xmldatacontainer+xml": { source: "iana", compressible: !0 },
  "application/vnd.grafeq": { source: "iana", extensions: ["gqf", "gqs"] },
  "application/vnd.gridmp": { source: "iana" },
  "application/vnd.groove-account": { source: "iana", extensions: ["gac"] },
  "application/vnd.groove-help": { source: "iana", extensions: ["ghf"] },
  "application/vnd.groove-identity-message": { source: "iana", extensions: ["gim"] },
  "application/vnd.groove-injector": { source: "iana", extensions: ["grv"] },
  "application/vnd.groove-tool-message": { source: "iana", extensions: ["gtm"] },
  "application/vnd.groove-tool-template": { source: "iana", extensions: ["tpl"] },
  "application/vnd.groove-vcard": { source: "iana", extensions: ["vcg"] },
  "application/vnd.hal+json": { source: "iana", compressible: !0 },
  "application/vnd.hal+xml": { source: "iana", compressible: !0, extensions: ["hal"] },
  "application/vnd.handheld-entertainment+xml": { source: "iana", compressible: !0, extensions: ["zmm"] },
  "application/vnd.hbci": { source: "iana", extensions: ["hbci"] },
  "application/vnd.hc+json": { source: "iana", compressible: !0 },
  "application/vnd.hcl-bireports": { source: "iana" },
  "application/vnd.hdt": { source: "iana" },
  "application/vnd.heroku+json": { source: "iana", compressible: !0 },
  "application/vnd.hhe.lesson-player": { source: "iana", extensions: ["les"] },
  "application/vnd.hl7cda+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.hl7v2+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.hp-hpgl": { source: "iana", extensions: ["hpgl"] },
  "application/vnd.hp-hpid": { source: "iana", extensions: ["hpid"] },
  "application/vnd.hp-hps": { source: "iana", extensions: ["hps"] },
  "application/vnd.hp-jlyt": { source: "iana", extensions: ["jlt"] },
  "application/vnd.hp-pcl": { source: "iana", extensions: ["pcl"] },
  "application/vnd.hp-pclxl": { source: "iana", extensions: ["pclxl"] },
  "application/vnd.httphone": { source: "iana" },
  "application/vnd.hydrostatix.sof-data": { source: "iana", extensions: ["sfd-hdstx"] },
  "application/vnd.hyper+json": { source: "iana", compressible: !0 },
  "application/vnd.hyper-item+json": { source: "iana", compressible: !0 },
  "application/vnd.hyperdrive+json": { source: "iana", compressible: !0 },
  "application/vnd.hzn-3d-crossword": { source: "iana" },
  "application/vnd.ibm.afplinedata": { source: "iana" },
  "application/vnd.ibm.electronic-media": { source: "iana" },
  "application/vnd.ibm.minipay": { source: "iana", extensions: ["mpy"] },
  "application/vnd.ibm.modcap": { source: "iana", extensions: ["afp", "listafp", "list3820"] },
  "application/vnd.ibm.rights-management": { source: "iana", extensions: ["irm"] },
  "application/vnd.ibm.secure-container": { source: "iana", extensions: ["sc"] },
  "application/vnd.iccprofile": { source: "iana", extensions: ["icc", "icm"] },
  "application/vnd.ieee.1905": { source: "iana" },
  "application/vnd.igloader": { source: "iana", extensions: ["igl"] },
  "application/vnd.imagemeter.folder+zip": { source: "iana", compressible: !1 },
  "application/vnd.imagemeter.image+zip": { source: "iana", compressible: !1 },
  "application/vnd.immervision-ivp": { source: "iana", extensions: ["ivp"] },
  "application/vnd.immervision-ivu": { source: "iana", extensions: ["ivu"] },
  "application/vnd.ims.imsccv1p1": { source: "iana" },
  "application/vnd.ims.imsccv1p2": { source: "iana" },
  "application/vnd.ims.imsccv1p3": { source: "iana" },
  "application/vnd.ims.lis.v2.result+json": { source: "iana", compressible: !0 },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": { source: "iana", compressible: !0 },
  "application/vnd.ims.lti.v2.toolproxy+json": { source: "iana", compressible: !0 },
  "application/vnd.ims.lti.v2.toolproxy.id+json": { source: "iana", compressible: !0 },
  "application/vnd.ims.lti.v2.toolsettings+json": { source: "iana", compressible: !0 },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": { source: "iana", compressible: !0 },
  "application/vnd.informedcontrol.rms+xml": { source: "iana", compressible: !0 },
  "application/vnd.informix-visionary": { source: "iana" },
  "application/vnd.infotech.project": { source: "iana" },
  "application/vnd.infotech.project+xml": { source: "iana", compressible: !0 },
  "application/vnd.innopath.wamp.notification": { source: "iana" },
  "application/vnd.insors.igm": { source: "iana", extensions: ["igm"] },
  "application/vnd.intercon.formnet": { source: "iana", extensions: ["xpw", "xpx"] },
  "application/vnd.intergeo": { source: "iana", extensions: ["i2g"] },
  "application/vnd.intertrust.digibox": { source: "iana" },
  "application/vnd.intertrust.nncp": { source: "iana" },
  "application/vnd.intu.qbo": { source: "iana", extensions: ["qbo"] },
  "application/vnd.intu.qfx": { source: "iana", extensions: ["qfx"] },
  "application/vnd.iptc.g2.catalogitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.conceptitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.knowledgeitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.newsitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.newsmessage+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.packageitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.iptc.g2.planningitem+xml": { source: "iana", compressible: !0 },
  "application/vnd.ipunplugged.rcprofile": { source: "iana", extensions: ["rcprofile"] },
  "application/vnd.irepository.package+xml": { source: "iana", compressible: !0, extensions: ["irp"] },
  "application/vnd.is-xpr": { source: "iana", extensions: ["xpr"] },
  "application/vnd.isac.fcs": { source: "iana", extensions: ["fcs"] },
  "application/vnd.iso11783-10+zip": { source: "iana", compressible: !1 },
  "application/vnd.jam": { source: "iana", extensions: ["jam"] },
  "application/vnd.japannet-directory-service": { source: "iana" },
  "application/vnd.japannet-jpnstore-wakeup": { source: "iana" },
  "application/vnd.japannet-payment-wakeup": { source: "iana" },
  "application/vnd.japannet-registration": { source: "iana" },
  "application/vnd.japannet-registration-wakeup": { source: "iana" },
  "application/vnd.japannet-setstore-wakeup": { source: "iana" },
  "application/vnd.japannet-verification": { source: "iana" },
  "application/vnd.japannet-verification-wakeup": { source: "iana" },
  "application/vnd.jcp.javame.midlet-rms": { source: "iana", extensions: ["rms"] },
  "application/vnd.jisp": { source: "iana", extensions: ["jisp"] },
  "application/vnd.joost.joda-archive": { source: "iana", extensions: ["joda"] },
  "application/vnd.jsk.isdn-ngn": { source: "iana" },
  "application/vnd.kahootz": { source: "iana", extensions: ["ktz", "ktr"] },
  "application/vnd.kde.karbon": { source: "iana", extensions: ["karbon"] },
  "application/vnd.kde.kchart": { source: "iana", extensions: ["chrt"] },
  "application/vnd.kde.kformula": { source: "iana", extensions: ["kfo"] },
  "application/vnd.kde.kivio": { source: "iana", extensions: ["flw"] },
  "application/vnd.kde.kontour": { source: "iana", extensions: ["kon"] },
  "application/vnd.kde.kpresenter": { source: "iana", extensions: ["kpr", "kpt"] },
  "application/vnd.kde.kspread": { source: "iana", extensions: ["ksp"] },
  "application/vnd.kde.kword": { source: "iana", extensions: ["kwd", "kwt"] },
  "application/vnd.kenameaapp": { source: "iana", extensions: ["htke"] },
  "application/vnd.kidspiration": { source: "iana", extensions: ["kia"] },
  "application/vnd.kinar": { source: "iana", extensions: ["kne", "knp"] },
  "application/vnd.koan": { source: "iana", extensions: ["skp", "skd", "skt", "skm"] },
  "application/vnd.kodak-descriptor": { source: "iana", extensions: ["sse"] },
  "application/vnd.las": { source: "iana" },
  "application/vnd.las.las+json": { source: "iana", compressible: !0 },
  "application/vnd.las.las+xml": { source: "iana", compressible: !0, extensions: ["lasxml"] },
  "application/vnd.laszip": { source: "iana" },
  "application/vnd.leap+json": { source: "iana", compressible: !0 },
  "application/vnd.liberty-request+xml": { source: "iana", compressible: !0 },
  "application/vnd.llamagraphics.life-balance.desktop": { source: "iana", extensions: ["lbd"] },
  "application/vnd.llamagraphics.life-balance.exchange+xml": { source: "iana", compressible: !0, extensions: ["lbe"] },
  "application/vnd.logipipe.circuit+zip": { source: "iana", compressible: !1 },
  "application/vnd.loom": { source: "iana" },
  "application/vnd.lotus-1-2-3": { source: "iana", extensions: ["123"] },
  "application/vnd.lotus-approach": { source: "iana", extensions: ["apr"] },
  "application/vnd.lotus-freelance": { source: "iana", extensions: ["pre"] },
  "application/vnd.lotus-notes": { source: "iana", extensions: ["nsf"] },
  "application/vnd.lotus-organizer": { source: "iana", extensions: ["org"] },
  "application/vnd.lotus-screencam": { source: "iana", extensions: ["scm"] },
  "application/vnd.lotus-wordpro": { source: "iana", extensions: ["lwp"] },
  "application/vnd.macports.portpkg": { source: "iana", extensions: ["portpkg"] },
  "application/vnd.mapbox-vector-tile": { source: "iana", extensions: ["mvt"] },
  "application/vnd.marlin.drm.actiontoken+xml": { source: "iana", compressible: !0 },
  "application/vnd.marlin.drm.conftoken+xml": { source: "iana", compressible: !0 },
  "application/vnd.marlin.drm.license+xml": { source: "iana", compressible: !0 },
  "application/vnd.marlin.drm.mdcf": { source: "iana" },
  "application/vnd.mason+json": { source: "iana", compressible: !0 },
  "application/vnd.maxar.archive.3tz+zip": { source: "iana", compressible: !1 },
  "application/vnd.maxmind.maxmind-db": { source: "iana" },
  "application/vnd.mcd": { source: "iana", extensions: ["mcd"] },
  "application/vnd.medcalcdata": { source: "iana", extensions: ["mc1"] },
  "application/vnd.mediastation.cdkey": { source: "iana", extensions: ["cdkey"] },
  "application/vnd.meridian-slingshot": { source: "iana" },
  "application/vnd.mfer": { source: "iana", extensions: ["mwf"] },
  "application/vnd.mfmp": { source: "iana", extensions: ["mfm"] },
  "application/vnd.micro+json": { source: "iana", compressible: !0 },
  "application/vnd.micrografx.flo": { source: "iana", extensions: ["flo"] },
  "application/vnd.micrografx.igx": { source: "iana", extensions: ["igx"] },
  "application/vnd.microsoft.portable-executable": { source: "iana" },
  "application/vnd.microsoft.windows.thumbnail-cache": { source: "iana" },
  "application/vnd.miele+json": { source: "iana", compressible: !0 },
  "application/vnd.mif": { source: "iana", extensions: ["mif"] },
  "application/vnd.minisoft-hp3000-save": { source: "iana" },
  "application/vnd.mitsubishi.misty-guard.trustweb": { source: "iana" },
  "application/vnd.mobius.daf": { source: "iana", extensions: ["daf"] },
  "application/vnd.mobius.dis": { source: "iana", extensions: ["dis"] },
  "application/vnd.mobius.mbk": { source: "iana", extensions: ["mbk"] },
  "application/vnd.mobius.mqy": { source: "iana", extensions: ["mqy"] },
  "application/vnd.mobius.msl": { source: "iana", extensions: ["msl"] },
  "application/vnd.mobius.plc": { source: "iana", extensions: ["plc"] },
  "application/vnd.mobius.txf": { source: "iana", extensions: ["txf"] },
  "application/vnd.mophun.application": { source: "iana", extensions: ["mpn"] },
  "application/vnd.mophun.certificate": { source: "iana", extensions: ["mpc"] },
  "application/vnd.motorola.flexsuite": { source: "iana" },
  "application/vnd.motorola.flexsuite.adsi": { source: "iana" },
  "application/vnd.motorola.flexsuite.fis": { source: "iana" },
  "application/vnd.motorola.flexsuite.gotap": { source: "iana" },
  "application/vnd.motorola.flexsuite.kmr": { source: "iana" },
  "application/vnd.motorola.flexsuite.ttc": { source: "iana" },
  "application/vnd.motorola.flexsuite.wem": { source: "iana" },
  "application/vnd.motorola.iprm": { source: "iana" },
  "application/vnd.mozilla.xul+xml": { source: "iana", compressible: !0, extensions: ["xul"] },
  "application/vnd.ms-3mfdocument": { source: "iana" },
  "application/vnd.ms-artgalry": { source: "iana", extensions: ["cil"] },
  "application/vnd.ms-asf": { source: "iana" },
  "application/vnd.ms-cab-compressed": { source: "iana", extensions: ["cab"] },
  "application/vnd.ms-color.iccprofile": { source: "apache" },
  "application/vnd.ms-excel": { source: "iana", compressible: !1, extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"] },
  "application/vnd.ms-excel.addin.macroenabled.12": { source: "iana", extensions: ["xlam"] },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": { source: "iana", extensions: ["xlsb"] },
  "application/vnd.ms-excel.sheet.macroenabled.12": { source: "iana", extensions: ["xlsm"] },
  "application/vnd.ms-excel.template.macroenabled.12": { source: "iana", extensions: ["xltm"] },
  "application/vnd.ms-fontobject": { source: "iana", compressible: !0, extensions: ["eot"] },
  "application/vnd.ms-htmlhelp": { source: "iana", extensions: ["chm"] },
  "application/vnd.ms-ims": { source: "iana", extensions: ["ims"] },
  "application/vnd.ms-lrm": { source: "iana", extensions: ["lrm"] },
  "application/vnd.ms-office.activex+xml": { source: "iana", compressible: !0 },
  "application/vnd.ms-officetheme": { source: "iana", extensions: ["thmx"] },
  "application/vnd.ms-opentype": { source: "apache", compressible: !0 },
  "application/vnd.ms-outlook": { compressible: !1, extensions: ["msg"] },
  "application/vnd.ms-package.obfuscated-opentype": { source: "apache" },
  "application/vnd.ms-pki.seccat": { source: "apache", extensions: ["cat"] },
  "application/vnd.ms-pki.stl": { source: "apache", extensions: ["stl"] },
  "application/vnd.ms-playready.initiator+xml": { source: "iana", compressible: !0 },
  "application/vnd.ms-powerpoint": { source: "iana", compressible: !1, extensions: ["ppt", "pps", "pot"] },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": { source: "iana", extensions: ["ppam"] },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": { source: "iana", extensions: ["pptm"] },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": { source: "iana", extensions: ["sldm"] },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": { source: "iana", extensions: ["ppsm"] },
  "application/vnd.ms-powerpoint.template.macroenabled.12": { source: "iana", extensions: ["potm"] },
  "application/vnd.ms-printdevicecapabilities+xml": { source: "iana", compressible: !0 },
  "application/vnd.ms-printing.printticket+xml": { source: "apache", compressible: !0 },
  "application/vnd.ms-printschematicket+xml": { source: "iana", compressible: !0 },
  "application/vnd.ms-project": { source: "iana", extensions: ["mpp", "mpt"] },
  "application/vnd.ms-tnef": { source: "iana" },
  "application/vnd.ms-windows.devicepairing": { source: "iana" },
  "application/vnd.ms-windows.nwprinting.oob": { source: "iana" },
  "application/vnd.ms-windows.printerpairing": { source: "iana" },
  "application/vnd.ms-windows.wsd.oob": { source: "iana" },
  "application/vnd.ms-wmdrm.lic-chlg-req": { source: "iana" },
  "application/vnd.ms-wmdrm.lic-resp": { source: "iana" },
  "application/vnd.ms-wmdrm.meter-chlg-req": { source: "iana" },
  "application/vnd.ms-wmdrm.meter-resp": { source: "iana" },
  "application/vnd.ms-word.document.macroenabled.12": { source: "iana", extensions: ["docm"] },
  "application/vnd.ms-word.template.macroenabled.12": { source: "iana", extensions: ["dotm"] },
  "application/vnd.ms-works": { source: "iana", extensions: ["wps", "wks", "wcm", "wdb"] },
  "application/vnd.ms-wpl": { source: "iana", extensions: ["wpl"] },
  "application/vnd.ms-xpsdocument": { source: "iana", compressible: !1, extensions: ["xps"] },
  "application/vnd.msa-disk-image": { source: "iana" },
  "application/vnd.mseq": { source: "iana", extensions: ["mseq"] },
  "application/vnd.msign": { source: "iana" },
  "application/vnd.multiad.creator": { source: "iana" },
  "application/vnd.multiad.creator.cif": { source: "iana" },
  "application/vnd.music-niff": { source: "iana" },
  "application/vnd.musician": { source: "iana", extensions: ["mus"] },
  "application/vnd.muvee.style": { source: "iana", extensions: ["msty"] },
  "application/vnd.mynfc": { source: "iana", extensions: ["taglet"] },
  "application/vnd.nacamar.ybrid+json": { source: "iana", compressible: !0 },
  "application/vnd.ncd.control": { source: "iana" },
  "application/vnd.ncd.reference": { source: "iana" },
  "application/vnd.nearst.inv+json": { source: "iana", compressible: !0 },
  "application/vnd.nebumind.line": { source: "iana" },
  "application/vnd.nervana": { source: "iana" },
  "application/vnd.netfpx": { source: "iana" },
  "application/vnd.neurolanguage.nlu": { source: "iana", extensions: ["nlu"] },
  "application/vnd.nimn": { source: "iana" },
  "application/vnd.nintendo.nitro.rom": { source: "iana" },
  "application/vnd.nintendo.snes.rom": { source: "iana" },
  "application/vnd.nitf": { source: "iana", extensions: ["ntf", "nitf"] },
  "application/vnd.noblenet-directory": { source: "iana", extensions: ["nnd"] },
  "application/vnd.noblenet-sealer": { source: "iana", extensions: ["nns"] },
  "application/vnd.noblenet-web": { source: "iana", extensions: ["nnw"] },
  "application/vnd.nokia.catalogs": { source: "iana" },
  "application/vnd.nokia.conml+wbxml": { source: "iana" },
  "application/vnd.nokia.conml+xml": { source: "iana", compressible: !0 },
  "application/vnd.nokia.iptv.config+xml": { source: "iana", compressible: !0 },
  "application/vnd.nokia.isds-radio-presets": { source: "iana" },
  "application/vnd.nokia.landmark+wbxml": { source: "iana" },
  "application/vnd.nokia.landmark+xml": { source: "iana", compressible: !0 },
  "application/vnd.nokia.landmarkcollection+xml": { source: "iana", compressible: !0 },
  "application/vnd.nokia.n-gage.ac+xml": { source: "iana", compressible: !0, extensions: ["ac"] },
  "application/vnd.nokia.n-gage.data": { source: "iana", extensions: ["ngdat"] },
  "application/vnd.nokia.n-gage.symbian.install": { source: "iana", extensions: ["n-gage"] },
  "application/vnd.nokia.ncd": { source: "iana" },
  "application/vnd.nokia.pcd+wbxml": { source: "iana" },
  "application/vnd.nokia.pcd+xml": { source: "iana", compressible: !0 },
  "application/vnd.nokia.radio-preset": { source: "iana", extensions: ["rpst"] },
  "application/vnd.nokia.radio-presets": { source: "iana", extensions: ["rpss"] },
  "application/vnd.novadigm.edm": { source: "iana", extensions: ["edm"] },
  "application/vnd.novadigm.edx": { source: "iana", extensions: ["edx"] },
  "application/vnd.novadigm.ext": { source: "iana", extensions: ["ext"] },
  "application/vnd.ntt-local.content-share": { source: "iana" },
  "application/vnd.ntt-local.file-transfer": { source: "iana" },
  "application/vnd.ntt-local.ogw_remote-access": { source: "iana" },
  "application/vnd.ntt-local.sip-ta_remote": { source: "iana" },
  "application/vnd.ntt-local.sip-ta_tcp_stream": { source: "iana" },
  "application/vnd.oasis.opendocument.chart": { source: "iana", extensions: ["odc"] },
  "application/vnd.oasis.opendocument.chart-template": { source: "iana", extensions: ["otc"] },
  "application/vnd.oasis.opendocument.database": { source: "iana", extensions: ["odb"] },
  "application/vnd.oasis.opendocument.formula": { source: "iana", extensions: ["odf"] },
  "application/vnd.oasis.opendocument.formula-template": { source: "iana", extensions: ["odft"] },
  "application/vnd.oasis.opendocument.graphics": { source: "iana", compressible: !1, extensions: ["odg"] },
  "application/vnd.oasis.opendocument.graphics-template": { source: "iana", extensions: ["otg"] },
  "application/vnd.oasis.opendocument.image": { source: "iana", extensions: ["odi"] },
  "application/vnd.oasis.opendocument.image-template": { source: "iana", extensions: ["oti"] },
  "application/vnd.oasis.opendocument.presentation": { source: "iana", compressible: !1, extensions: ["odp"] },
  "application/vnd.oasis.opendocument.presentation-template": { source: "iana", extensions: ["otp"] },
  "application/vnd.oasis.opendocument.spreadsheet": { source: "iana", compressible: !1, extensions: ["ods"] },
  "application/vnd.oasis.opendocument.spreadsheet-template": { source: "iana", extensions: ["ots"] },
  "application/vnd.oasis.opendocument.text": { source: "iana", compressible: !1, extensions: ["odt"] },
  "application/vnd.oasis.opendocument.text-master": { source: "iana", extensions: ["odm"] },
  "application/vnd.oasis.opendocument.text-template": { source: "iana", extensions: ["ott"] },
  "application/vnd.oasis.opendocument.text-web": { source: "iana", extensions: ["oth"] },
  "application/vnd.obn": { source: "iana" },
  "application/vnd.ocf+cbor": { source: "iana" },
  "application/vnd.oci.image.manifest.v1+json": { source: "iana", compressible: !0 },
  "application/vnd.oftn.l10n+json": { source: "iana", compressible: !0 },
  "application/vnd.oipf.contentaccessdownload+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.contentaccessstreaming+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.cspg-hexbinary": { source: "iana" },
  "application/vnd.oipf.dae.svg+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.dae.xhtml+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.mippvcontrolmessage+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.pae.gem": { source: "iana" },
  "application/vnd.oipf.spdiscovery+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.spdlist+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.ueprofile+xml": { source: "iana", compressible: !0 },
  "application/vnd.oipf.userprofile+xml": { source: "iana", compressible: !0 },
  "application/vnd.olpc-sugar": { source: "iana", extensions: ["xo"] },
  "application/vnd.oma-scws-config": { source: "iana" },
  "application/vnd.oma-scws-http-request": { source: "iana" },
  "application/vnd.oma-scws-http-response": { source: "iana" },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.drm-trigger+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.imd+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.ltkm": { source: "iana" },
  "application/vnd.oma.bcast.notification+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.provisioningtrigger": { source: "iana" },
  "application/vnd.oma.bcast.sgboot": { source: "iana" },
  "application/vnd.oma.bcast.sgdd+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.sgdu": { source: "iana" },
  "application/vnd.oma.bcast.simple-symbol-container": { source: "iana" },
  "application/vnd.oma.bcast.smartcard-trigger+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.sprov+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.bcast.stkm": { source: "iana" },
  "application/vnd.oma.cab-address-book+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.cab-feature-handler+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.cab-pcc+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.cab-subs-invite+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.cab-user-prefs+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.dcd": { source: "iana" },
  "application/vnd.oma.dcdc": { source: "iana" },
  "application/vnd.oma.dd2+xml": { source: "iana", compressible: !0, extensions: ["dd2"] },
  "application/vnd.oma.drm.risd+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.group-usage-list+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.lwm2m+cbor": { source: "iana" },
  "application/vnd.oma.lwm2m+json": { source: "iana", compressible: !0 },
  "application/vnd.oma.lwm2m+tlv": { source: "iana" },
  "application/vnd.oma.pal+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.poc.detailed-progress-report+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.poc.final-report+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.poc.groups+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.poc.invocation-descriptor+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.poc.optimized-progress-report+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.push": { source: "iana" },
  "application/vnd.oma.scidm.messages+xml": { source: "iana", compressible: !0 },
  "application/vnd.oma.xcap-directory+xml": { source: "iana", compressible: !0 },
  "application/vnd.omads-email+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.omads-file+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.omads-folder+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.omaloc-supl-init": { source: "iana" },
  "application/vnd.onepager": { source: "iana" },
  "application/vnd.onepagertamp": { source: "iana" },
  "application/vnd.onepagertamx": { source: "iana" },
  "application/vnd.onepagertat": { source: "iana" },
  "application/vnd.onepagertatp": { source: "iana" },
  "application/vnd.onepagertatx": { source: "iana" },
  "application/vnd.openblox.game+xml": { source: "iana", compressible: !0, extensions: ["obgx"] },
  "application/vnd.openblox.game-binary": { source: "iana" },
  "application/vnd.openeye.oeb": { source: "iana" },
  "application/vnd.openofficeorg.extension": { source: "apache", extensions: ["oxt"] },
  "application/vnd.openstreetmap.data+xml": { source: "iana", compressible: !0, extensions: ["osm"] },
  "application/vnd.opentimestamps.ots": { source: "iana" },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawing+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { source: "iana", compressible: !1, extensions: ["pptx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": { source: "iana", extensions: ["sldx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": { source: "iana", extensions: ["ppsx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.template": { source: "iana", extensions: ["potx"] },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { source: "iana", compressible: !1, extensions: ["xlsx"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": { source: "iana", extensions: ["xltx"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.theme+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.vmldrawing": { source: "iana" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { source: "iana", compressible: !1, extensions: ["docx"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": { source: "iana", extensions: ["dotx"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-package.core-properties+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": { source: "iana", compressible: !0 },
  "application/vnd.openxmlformats-package.relationships+xml": { source: "iana", compressible: !0 },
  "application/vnd.oracle.resource+json": { source: "iana", compressible: !0 },
  "application/vnd.orange.indata": { source: "iana" },
  "application/vnd.osa.netdeploy": { source: "iana" },
  "application/vnd.osgeo.mapguide.package": { source: "iana", extensions: ["mgp"] },
  "application/vnd.osgi.bundle": { source: "iana" },
  "application/vnd.osgi.dp": { source: "iana", extensions: ["dp"] },
  "application/vnd.osgi.subsystem": { source: "iana", extensions: ["esa"] },
  "application/vnd.otps.ct-kip+xml": { source: "iana", compressible: !0 },
  "application/vnd.oxli.countgraph": { source: "iana" },
  "application/vnd.pagerduty+json": { source: "iana", compressible: !0 },
  "application/vnd.palm": { source: "iana", extensions: ["pdb", "pqa", "oprc"] },
  "application/vnd.panoply": { source: "iana" },
  "application/vnd.paos.xml": { source: "iana" },
  "application/vnd.patentdive": { source: "iana" },
  "application/vnd.patientecommsdoc": { source: "iana" },
  "application/vnd.pawaafile": { source: "iana", extensions: ["paw"] },
  "application/vnd.pcos": { source: "iana" },
  "application/vnd.pg.format": { source: "iana", extensions: ["str"] },
  "application/vnd.pg.osasli": { source: "iana", extensions: ["ei6"] },
  "application/vnd.piaccess.application-licence": { source: "iana" },
  "application/vnd.picsel": { source: "iana", extensions: ["efif"] },
  "application/vnd.pmi.widget": { source: "iana", extensions: ["wg"] },
  "application/vnd.poc.group-advertisement+xml": { source: "iana", compressible: !0 },
  "application/vnd.pocketlearn": { source: "iana", extensions: ["plf"] },
  "application/vnd.powerbuilder6": { source: "iana", extensions: ["pbd"] },
  "application/vnd.powerbuilder6-s": { source: "iana" },
  "application/vnd.powerbuilder7": { source: "iana" },
  "application/vnd.powerbuilder7-s": { source: "iana" },
  "application/vnd.powerbuilder75": { source: "iana" },
  "application/vnd.powerbuilder75-s": { source: "iana" },
  "application/vnd.preminet": { source: "iana" },
  "application/vnd.previewsystems.box": { source: "iana", extensions: ["box"] },
  "application/vnd.proteus.magazine": { source: "iana", extensions: ["mgz"] },
  "application/vnd.psfs": { source: "iana" },
  "application/vnd.publishare-delta-tree": { source: "iana", extensions: ["qps"] },
  "application/vnd.pvi.ptid1": { source: "iana", extensions: ["ptid"] },
  "application/vnd.pwg-multiplexed": { source: "iana" },
  "application/vnd.pwg-xhtml-print+xml": { source: "iana", compressible: !0 },
  "application/vnd.qualcomm.brew-app-res": { source: "iana" },
  "application/vnd.quarantainenet": { source: "iana" },
  "application/vnd.quark.quarkxpress": { source: "iana", extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"] },
  "application/vnd.quobject-quoxdocument": { source: "iana" },
  "application/vnd.radisys.moml+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-audit+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-audit-conf+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-audit-conn+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-audit-dialog+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-audit-stream+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-conf+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-base+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-group+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-speech+xml": { source: "iana", compressible: !0 },
  "application/vnd.radisys.msml-dialog-transform+xml": { source: "iana", compressible: !0 },
  "application/vnd.rainstor.data": { source: "iana" },
  "application/vnd.rapid": { source: "iana" },
  "application/vnd.rar": { source: "iana", extensions: ["rar"] },
  "application/vnd.realvnc.bed": { source: "iana", extensions: ["bed"] },
  "application/vnd.recordare.musicxml": { source: "iana", extensions: ["mxl"] },
  "application/vnd.recordare.musicxml+xml": { source: "iana", compressible: !0, extensions: ["musicxml"] },
  "application/vnd.renlearn.rlprint": { source: "iana" },
  "application/vnd.resilient.logic": { source: "iana" },
  "application/vnd.restful+json": { source: "iana", compressible: !0 },
  "application/vnd.rig.cryptonote": { source: "iana", extensions: ["cryptonote"] },
  "application/vnd.rim.cod": { source: "apache", extensions: ["cod"] },
  "application/vnd.rn-realmedia": { source: "apache", extensions: ["rm"] },
  "application/vnd.rn-realmedia-vbr": { source: "apache", extensions: ["rmvb"] },
  "application/vnd.route66.link66+xml": { source: "iana", compressible: !0, extensions: ["link66"] },
  "application/vnd.rs-274x": { source: "iana" },
  "application/vnd.ruckus.download": { source: "iana" },
  "application/vnd.s3sms": { source: "iana" },
  "application/vnd.sailingtracker.track": { source: "iana", extensions: ["st"] },
  "application/vnd.sar": { source: "iana" },
  "application/vnd.sbm.cid": { source: "iana" },
  "application/vnd.sbm.mid2": { source: "iana" },
  "application/vnd.scribus": { source: "iana" },
  "application/vnd.sealed.3df": { source: "iana" },
  "application/vnd.sealed.csf": { source: "iana" },
  "application/vnd.sealed.doc": { source: "iana" },
  "application/vnd.sealed.eml": { source: "iana" },
  "application/vnd.sealed.mht": { source: "iana" },
  "application/vnd.sealed.net": { source: "iana" },
  "application/vnd.sealed.ppt": { source: "iana" },
  "application/vnd.sealed.tiff": { source: "iana" },
  "application/vnd.sealed.xls": { source: "iana" },
  "application/vnd.sealedmedia.softseal.html": { source: "iana" },
  "application/vnd.sealedmedia.softseal.pdf": { source: "iana" },
  "application/vnd.seemail": { source: "iana", extensions: ["see"] },
  "application/vnd.seis+json": { source: "iana", compressible: !0 },
  "application/vnd.sema": { source: "iana", extensions: ["sema"] },
  "application/vnd.semd": { source: "iana", extensions: ["semd"] },
  "application/vnd.semf": { source: "iana", extensions: ["semf"] },
  "application/vnd.shade-save-file": { source: "iana" },
  "application/vnd.shana.informed.formdata": { source: "iana", extensions: ["ifm"] },
  "application/vnd.shana.informed.formtemplate": { source: "iana", extensions: ["itp"] },
  "application/vnd.shana.informed.interchange": { source: "iana", extensions: ["iif"] },
  "application/vnd.shana.informed.package": { source: "iana", extensions: ["ipk"] },
  "application/vnd.shootproof+json": { source: "iana", compressible: !0 },
  "application/vnd.shopkick+json": { source: "iana", compressible: !0 },
  "application/vnd.shp": { source: "iana" },
  "application/vnd.shx": { source: "iana" },
  "application/vnd.sigrok.session": { source: "iana" },
  "application/vnd.simtech-mindmapper": { source: "iana", extensions: ["twd", "twds"] },
  "application/vnd.siren+json": { source: "iana", compressible: !0 },
  "application/vnd.smaf": { source: "iana", extensions: ["mmf"] },
  "application/vnd.smart.notebook": { source: "iana" },
  "application/vnd.smart.teacher": { source: "iana", extensions: ["teacher"] },
  "application/vnd.snesdev-page-table": { source: "iana" },
  "application/vnd.software602.filler.form+xml": { source: "iana", compressible: !0, extensions: ["fo"] },
  "application/vnd.software602.filler.form-xml-zip": { source: "iana" },
  "application/vnd.solent.sdkm+xml": { source: "iana", compressible: !0, extensions: ["sdkm", "sdkd"] },
  "application/vnd.spotfire.dxp": { source: "iana", extensions: ["dxp"] },
  "application/vnd.spotfire.sfs": { source: "iana", extensions: ["sfs"] },
  "application/vnd.sqlite3": { source: "iana" },
  "application/vnd.sss-cod": { source: "iana" },
  "application/vnd.sss-dtf": { source: "iana" },
  "application/vnd.sss-ntf": { source: "iana" },
  "application/vnd.stardivision.calc": { source: "apache", extensions: ["sdc"] },
  "application/vnd.stardivision.draw": { source: "apache", extensions: ["sda"] },
  "application/vnd.stardivision.impress": { source: "apache", extensions: ["sdd"] },
  "application/vnd.stardivision.math": { source: "apache", extensions: ["smf"] },
  "application/vnd.stardivision.writer": { source: "apache", extensions: ["sdw", "vor"] },
  "application/vnd.stardivision.writer-global": { source: "apache", extensions: ["sgl"] },
  "application/vnd.stepmania.package": { source: "iana", extensions: ["smzip"] },
  "application/vnd.stepmania.stepchart": { source: "iana", extensions: ["sm"] },
  "application/vnd.street-stream": { source: "iana" },
  "application/vnd.sun.wadl+xml": { source: "iana", compressible: !0, extensions: ["wadl"] },
  "application/vnd.sun.xml.calc": { source: "apache", extensions: ["sxc"] },
  "application/vnd.sun.xml.calc.template": { source: "apache", extensions: ["stc"] },
  "application/vnd.sun.xml.draw": { source: "apache", extensions: ["sxd"] },
  "application/vnd.sun.xml.draw.template": { source: "apache", extensions: ["std"] },
  "application/vnd.sun.xml.impress": { source: "apache", extensions: ["sxi"] },
  "application/vnd.sun.xml.impress.template": { source: "apache", extensions: ["sti"] },
  "application/vnd.sun.xml.math": { source: "apache", extensions: ["sxm"] },
  "application/vnd.sun.xml.writer": { source: "apache", extensions: ["sxw"] },
  "application/vnd.sun.xml.writer.global": { source: "apache", extensions: ["sxg"] },
  "application/vnd.sun.xml.writer.template": { source: "apache", extensions: ["stw"] },
  "application/vnd.sus-calendar": { source: "iana", extensions: ["sus", "susp"] },
  "application/vnd.svd": { source: "iana", extensions: ["svd"] },
  "application/vnd.swiftview-ics": { source: "iana" },
  "application/vnd.sycle+xml": { source: "iana", compressible: !0 },
  "application/vnd.syft+json": { source: "iana", compressible: !0 },
  "application/vnd.symbian.install": { source: "apache", extensions: ["sis", "sisx"] },
  "application/vnd.syncml+xml": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["xsm"] },
  "application/vnd.syncml.dm+wbxml": { source: "iana", charset: "UTF-8", extensions: ["bdm"] },
  "application/vnd.syncml.dm+xml": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["xdm"] },
  "application/vnd.syncml.dm.notification": { source: "iana" },
  "application/vnd.syncml.dmddf+wbxml": { source: "iana" },
  "application/vnd.syncml.dmddf+xml": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["ddf"] },
  "application/vnd.syncml.dmtnds+wbxml": { source: "iana" },
  "application/vnd.syncml.dmtnds+xml": { source: "iana", charset: "UTF-8", compressible: !0 },
  "application/vnd.syncml.ds.notification": { source: "iana" },
  "application/vnd.tableschema+json": { source: "iana", compressible: !0 },
  "application/vnd.tao.intent-module-archive": { source: "iana", extensions: ["tao"] },
  "application/vnd.tcpdump.pcap": { source: "iana", extensions: ["pcap", "cap", "dmp"] },
  "application/vnd.think-cell.ppttc+json": { source: "iana", compressible: !0 },
  "application/vnd.tmd.mediaflex.api+xml": { source: "iana", compressible: !0 },
  "application/vnd.tml": { source: "iana" },
  "application/vnd.tmobile-livetv": { source: "iana", extensions: ["tmo"] },
  "application/vnd.tri.onesource": { source: "iana" },
  "application/vnd.trid.tpt": { source: "iana", extensions: ["tpt"] },
  "application/vnd.triscape.mxs": { source: "iana", extensions: ["mxs"] },
  "application/vnd.trueapp": { source: "iana", extensions: ["tra"] },
  "application/vnd.truedoc": { source: "iana" },
  "application/vnd.ubisoft.webplayer": { source: "iana" },
  "application/vnd.ufdl": { source: "iana", extensions: ["ufd", "ufdl"] },
  "application/vnd.uiq.theme": { source: "iana", extensions: ["utz"] },
  "application/vnd.umajin": { source: "iana", extensions: ["umj"] },
  "application/vnd.unity": { source: "iana", extensions: ["unityweb"] },
  "application/vnd.uoml+xml": { source: "iana", compressible: !0, extensions: ["uoml"] },
  "application/vnd.uplanet.alert": { source: "iana" },
  "application/vnd.uplanet.alert-wbxml": { source: "iana" },
  "application/vnd.uplanet.bearer-choice": { source: "iana" },
  "application/vnd.uplanet.bearer-choice-wbxml": { source: "iana" },
  "application/vnd.uplanet.cacheop": { source: "iana" },
  "application/vnd.uplanet.cacheop-wbxml": { source: "iana" },
  "application/vnd.uplanet.channel": { source: "iana" },
  "application/vnd.uplanet.channel-wbxml": { source: "iana" },
  "application/vnd.uplanet.list": { source: "iana" },
  "application/vnd.uplanet.list-wbxml": { source: "iana" },
  "application/vnd.uplanet.listcmd": { source: "iana" },
  "application/vnd.uplanet.listcmd-wbxml": { source: "iana" },
  "application/vnd.uplanet.signal": { source: "iana" },
  "application/vnd.uri-map": { source: "iana" },
  "application/vnd.valve.source.material": { source: "iana" },
  "application/vnd.vcx": { source: "iana", extensions: ["vcx"] },
  "application/vnd.vd-study": { source: "iana" },
  "application/vnd.vectorworks": { source: "iana" },
  "application/vnd.vel+json": { source: "iana", compressible: !0 },
  "application/vnd.verimatrix.vcas": { source: "iana" },
  "application/vnd.veritone.aion+json": { source: "iana", compressible: !0 },
  "application/vnd.veryant.thin": { source: "iana" },
  "application/vnd.ves.encrypted": { source: "iana" },
  "application/vnd.vidsoft.vidconference": { source: "iana" },
  "application/vnd.visio": { source: "iana", extensions: ["vsd", "vst", "vss", "vsw"] },
  "application/vnd.visionary": { source: "iana", extensions: ["vis"] },
  "application/vnd.vividence.scriptfile": { source: "iana" },
  "application/vnd.vsf": { source: "iana", extensions: ["vsf"] },
  "application/vnd.wap.sic": { source: "iana" },
  "application/vnd.wap.slc": { source: "iana" },
  "application/vnd.wap.wbxml": { source: "iana", charset: "UTF-8", extensions: ["wbxml"] },
  "application/vnd.wap.wmlc": { source: "iana", extensions: ["wmlc"] },
  "application/vnd.wap.wmlscriptc": { source: "iana", extensions: ["wmlsc"] },
  "application/vnd.webturbo": { source: "iana", extensions: ["wtb"] },
  "application/vnd.wfa.dpp": { source: "iana" },
  "application/vnd.wfa.p2p": { source: "iana" },
  "application/vnd.wfa.wsc": { source: "iana" },
  "application/vnd.windows.devicepairing": { source: "iana" },
  "application/vnd.wmc": { source: "iana" },
  "application/vnd.wmf.bootstrap": { source: "iana" },
  "application/vnd.wolfram.mathematica": { source: "iana" },
  "application/vnd.wolfram.mathematica.package": { source: "iana" },
  "application/vnd.wolfram.player": { source: "iana", extensions: ["nbp"] },
  "application/vnd.wordperfect": { source: "iana", extensions: ["wpd"] },
  "application/vnd.wqd": { source: "iana", extensions: ["wqd"] },
  "application/vnd.wrq-hp3000-labelled": { source: "iana" },
  "application/vnd.wt.stf": { source: "iana", extensions: ["stf"] },
  "application/vnd.wv.csp+wbxml": { source: "iana" },
  "application/vnd.wv.csp+xml": { source: "iana", compressible: !0 },
  "application/vnd.wv.ssp+xml": { source: "iana", compressible: !0 },
  "application/vnd.xacml+json": { source: "iana", compressible: !0 },
  "application/vnd.xara": { source: "iana", extensions: ["xar"] },
  "application/vnd.xfdl": { source: "iana", extensions: ["xfdl"] },
  "application/vnd.xfdl.webform": { source: "iana" },
  "application/vnd.xmi+xml": { source: "iana", compressible: !0 },
  "application/vnd.xmpie.cpkg": { source: "iana" },
  "application/vnd.xmpie.dpkg": { source: "iana" },
  "application/vnd.xmpie.plan": { source: "iana" },
  "application/vnd.xmpie.ppkg": { source: "iana" },
  "application/vnd.xmpie.xlim": { source: "iana" },
  "application/vnd.yamaha.hv-dic": { source: "iana", extensions: ["hvd"] },
  "application/vnd.yamaha.hv-script": { source: "iana", extensions: ["hvs"] },
  "application/vnd.yamaha.hv-voice": { source: "iana", extensions: ["hvp"] },
  "application/vnd.yamaha.openscoreformat": { source: "iana", extensions: ["osf"] },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": { source: "iana", compressible: !0, extensions: ["osfpvg"] },
  "application/vnd.yamaha.remote-setup": { source: "iana" },
  "application/vnd.yamaha.smaf-audio": { source: "iana", extensions: ["saf"] },
  "application/vnd.yamaha.smaf-phrase": { source: "iana", extensions: ["spf"] },
  "application/vnd.yamaha.through-ngn": { source: "iana" },
  "application/vnd.yamaha.tunnel-udpencap": { source: "iana" },
  "application/vnd.yaoweme": { source: "iana" },
  "application/vnd.yellowriver-custom-menu": { source: "iana", extensions: ["cmp"] },
  "application/vnd.youtube.yt": { source: "iana" },
  "application/vnd.zul": { source: "iana", extensions: ["zir", "zirz"] },
  "application/vnd.zzazz.deck+xml": { source: "iana", compressible: !0, extensions: ["zaz"] },
  "application/voicexml+xml": { source: "iana", compressible: !0, extensions: ["vxml"] },
  "application/voucher-cms+json": { source: "iana", compressible: !0 },
  "application/vq-rtcpxr": { source: "iana" },
  "application/wasm": { source: "iana", compressible: !0, extensions: ["wasm"] },
  "application/watcherinfo+xml": { source: "iana", compressible: !0, extensions: ["wif"] },
  "application/webpush-options+json": { source: "iana", compressible: !0 },
  "application/whoispp-query": { source: "iana" },
  "application/whoispp-response": { source: "iana" },
  "application/widget": { source: "iana", extensions: ["wgt"] },
  "application/winhlp": { source: "apache", extensions: ["hlp"] },
  "application/wita": { source: "iana" },
  "application/wordperfect5.1": { source: "iana" },
  "application/wsdl+xml": { source: "iana", compressible: !0, extensions: ["wsdl"] },
  "application/wspolicy+xml": { source: "iana", compressible: !0, extensions: ["wspolicy"] },
  "application/x-7z-compressed": { source: "apache", compressible: !1, extensions: ["7z"] },
  "application/x-abiword": { source: "apache", extensions: ["abw"] },
  "application/x-ace-compressed": { source: "apache", extensions: ["ace"] },
  "application/x-amf": { source: "apache" },
  "application/x-apple-diskimage": { source: "apache", extensions: ["dmg"] },
  "application/x-arj": { compressible: !1, extensions: ["arj"] },
  "application/x-authorware-bin": { source: "apache", extensions: ["aab", "x32", "u32", "vox"] },
  "application/x-authorware-map": { source: "apache", extensions: ["aam"] },
  "application/x-authorware-seg": { source: "apache", extensions: ["aas"] },
  "application/x-bcpio": { source: "apache", extensions: ["bcpio"] },
  "application/x-bdoc": { compressible: !1, extensions: ["bdoc"] },
  "application/x-bittorrent": { source: "apache", extensions: ["torrent"] },
  "application/x-blorb": { source: "apache", extensions: ["blb", "blorb"] },
  "application/x-bzip": { source: "apache", compressible: !1, extensions: ["bz"] },
  "application/x-bzip2": { source: "apache", compressible: !1, extensions: ["bz2", "boz"] },
  "application/x-cbr": { source: "apache", extensions: ["cbr", "cba", "cbt", "cbz", "cb7"] },
  "application/x-cdlink": { source: "apache", extensions: ["vcd"] },
  "application/x-cfs-compressed": { source: "apache", extensions: ["cfs"] },
  "application/x-chat": { source: "apache", extensions: ["chat"] },
  "application/x-chess-pgn": { source: "apache", extensions: ["pgn"] },
  "application/x-chrome-extension": { extensions: ["crx"] },
  "application/x-cocoa": { source: "nginx", extensions: ["cco"] },
  "application/x-compress": { source: "apache" },
  "application/x-conference": { source: "apache", extensions: ["nsc"] },
  "application/x-cpio": { source: "apache", extensions: ["cpio"] },
  "application/x-csh": { source: "apache", extensions: ["csh"] },
  "application/x-deb": { compressible: !1 },
  "application/x-debian-package": { source: "apache", extensions: ["deb", "udeb"] },
  "application/x-dgc-compressed": { source: "apache", extensions: ["dgc"] },
  "application/x-director": { source: "apache", extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"] },
  "application/x-doom": { source: "apache", extensions: ["wad"] },
  "application/x-dtbncx+xml": { source: "apache", compressible: !0, extensions: ["ncx"] },
  "application/x-dtbook+xml": { source: "apache", compressible: !0, extensions: ["dtb"] },
  "application/x-dtbresource+xml": { source: "apache", compressible: !0, extensions: ["res"] },
  "application/x-dvi": { source: "apache", compressible: !1, extensions: ["dvi"] },
  "application/x-envoy": { source: "apache", extensions: ["evy"] },
  "application/x-eva": { source: "apache", extensions: ["eva"] },
  "application/x-font-bdf": { source: "apache", extensions: ["bdf"] },
  "application/x-font-dos": { source: "apache" },
  "application/x-font-framemaker": { source: "apache" },
  "application/x-font-ghostscript": { source: "apache", extensions: ["gsf"] },
  "application/x-font-libgrx": { source: "apache" },
  "application/x-font-linux-psf": { source: "apache", extensions: ["psf"] },
  "application/x-font-pcf": { source: "apache", extensions: ["pcf"] },
  "application/x-font-snf": { source: "apache", extensions: ["snf"] },
  "application/x-font-speedo": { source: "apache" },
  "application/x-font-sunos-news": { source: "apache" },
  "application/x-font-type1": { source: "apache", extensions: ["pfa", "pfb", "pfm", "afm"] },
  "application/x-font-vfont": { source: "apache" },
  "application/x-freearc": { source: "apache", extensions: ["arc"] },
  "application/x-futuresplash": { source: "apache", extensions: ["spl"] },
  "application/x-gca-compressed": { source: "apache", extensions: ["gca"] },
  "application/x-glulx": { source: "apache", extensions: ["ulx"] },
  "application/x-gnumeric": { source: "apache", extensions: ["gnumeric"] },
  "application/x-gramps-xml": { source: "apache", extensions: ["gramps"] },
  "application/x-gtar": { source: "apache", extensions: ["gtar"] },
  "application/x-gzip": { source: "apache" },
  "application/x-hdf": { source: "apache", extensions: ["hdf"] },
  "application/x-httpd-php": { compressible: !0, extensions: ["php"] },
  "application/x-install-instructions": { source: "apache", extensions: ["install"] },
  "application/x-iso9660-image": { source: "apache", extensions: ["iso"] },
  "application/x-iwork-keynote-sffkey": { extensions: ["key"] },
  "application/x-iwork-numbers-sffnumbers": { extensions: ["numbers"] },
  "application/x-iwork-pages-sffpages": { extensions: ["pages"] },
  "application/x-java-archive-diff": { source: "nginx", extensions: ["jardiff"] },
  "application/x-java-jnlp-file": { source: "apache", compressible: !1, extensions: ["jnlp"] },
  "application/x-javascript": { compressible: !0 },
  "application/x-keepass2": { extensions: ["kdbx"] },
  "application/x-latex": { source: "apache", compressible: !1, extensions: ["latex"] },
  "application/x-lua-bytecode": { extensions: ["luac"] },
  "application/x-lzh-compressed": { source: "apache", extensions: ["lzh", "lha"] },
  "application/x-makeself": { source: "nginx", extensions: ["run"] },
  "application/x-mie": { source: "apache", extensions: ["mie"] },
  "application/x-mobipocket-ebook": { source: "apache", extensions: ["prc", "mobi"] },
  "application/x-mpegurl": { compressible: !1 },
  "application/x-ms-application": { source: "apache", extensions: ["application"] },
  "application/x-ms-shortcut": { source: "apache", extensions: ["lnk"] },
  "application/x-ms-wmd": { source: "apache", extensions: ["wmd"] },
  "application/x-ms-wmz": { source: "apache", extensions: ["wmz"] },
  "application/x-ms-xbap": { source: "apache", extensions: ["xbap"] },
  "application/x-msaccess": { source: "apache", extensions: ["mdb"] },
  "application/x-msbinder": { source: "apache", extensions: ["obd"] },
  "application/x-mscardfile": { source: "apache", extensions: ["crd"] },
  "application/x-msclip": { source: "apache", extensions: ["clp"] },
  "application/x-msdos-program": { extensions: ["exe"] },
  "application/x-msdownload": { source: "apache", extensions: ["exe", "dll", "com", "bat", "msi"] },
  "application/x-msmediaview": { source: "apache", extensions: ["mvb", "m13", "m14"] },
  "application/x-msmetafile": { source: "apache", extensions: ["wmf", "wmz", "emf", "emz"] },
  "application/x-msmoney": { source: "apache", extensions: ["mny"] },
  "application/x-mspublisher": { source: "apache", extensions: ["pub"] },
  "application/x-msschedule": { source: "apache", extensions: ["scd"] },
  "application/x-msterminal": { source: "apache", extensions: ["trm"] },
  "application/x-mswrite": { source: "apache", extensions: ["wri"] },
  "application/x-netcdf": { source: "apache", extensions: ["nc", "cdf"] },
  "application/x-ns-proxy-autoconfig": { compressible: !0, extensions: ["pac"] },
  "application/x-nzb": { source: "apache", extensions: ["nzb"] },
  "application/x-perl": { source: "nginx", extensions: ["pl", "pm"] },
  "application/x-pilot": { source: "nginx", extensions: ["prc", "pdb"] },
  "application/x-pkcs12": { source: "apache", compressible: !1, extensions: ["p12", "pfx"] },
  "application/x-pkcs7-certificates": { source: "apache", extensions: ["p7b", "spc"] },
  "application/x-pkcs7-certreqresp": { source: "apache", extensions: ["p7r"] },
  "application/x-pki-message": { source: "iana" },
  "application/x-rar-compressed": { source: "apache", compressible: !1, extensions: ["rar"] },
  "application/x-redhat-package-manager": { source: "nginx", extensions: ["rpm"] },
  "application/x-research-info-systems": { source: "apache", extensions: ["ris"] },
  "application/x-sea": { source: "nginx", extensions: ["sea"] },
  "application/x-sh": { source: "apache", compressible: !0, extensions: ["sh"] },
  "application/x-shar": { source: "apache", extensions: ["shar"] },
  "application/x-shockwave-flash": { source: "apache", compressible: !1, extensions: ["swf"] },
  "application/x-silverlight-app": { source: "apache", extensions: ["xap"] },
  "application/x-sql": { source: "apache", extensions: ["sql"] },
  "application/x-stuffit": { source: "apache", compressible: !1, extensions: ["sit"] },
  "application/x-stuffitx": { source: "apache", extensions: ["sitx"] },
  "application/x-subrip": { source: "apache", extensions: ["srt"] },
  "application/x-sv4cpio": { source: "apache", extensions: ["sv4cpio"] },
  "application/x-sv4crc": { source: "apache", extensions: ["sv4crc"] },
  "application/x-t3vm-image": { source: "apache", extensions: ["t3"] },
  "application/x-tads": { source: "apache", extensions: ["gam"] },
  "application/x-tar": { source: "apache", compressible: !0, extensions: ["tar"] },
  "application/x-tcl": { source: "apache", extensions: ["tcl", "tk"] },
  "application/x-tex": { source: "apache", extensions: ["tex"] },
  "application/x-tex-tfm": { source: "apache", extensions: ["tfm"] },
  "application/x-texinfo": { source: "apache", extensions: ["texinfo", "texi"] },
  "application/x-tgif": { source: "apache", extensions: ["obj"] },
  "application/x-ustar": { source: "apache", extensions: ["ustar"] },
  "application/x-virtualbox-hdd": { compressible: !0, extensions: ["hdd"] },
  "application/x-virtualbox-ova": { compressible: !0, extensions: ["ova"] },
  "application/x-virtualbox-ovf": { compressible: !0, extensions: ["ovf"] },
  "application/x-virtualbox-vbox": { compressible: !0, extensions: ["vbox"] },
  "application/x-virtualbox-vbox-extpack": { compressible: !1, extensions: ["vbox-extpack"] },
  "application/x-virtualbox-vdi": { compressible: !0, extensions: ["vdi"] },
  "application/x-virtualbox-vhd": { compressible: !0, extensions: ["vhd"] },
  "application/x-virtualbox-vmdk": { compressible: !0, extensions: ["vmdk"] },
  "application/x-wais-source": { source: "apache", extensions: ["src"] },
  "application/x-web-app-manifest+json": { compressible: !0, extensions: ["webapp"] },
  "application/x-www-form-urlencoded": { source: "iana", compressible: !0 },
  "application/x-x509-ca-cert": { source: "iana", extensions: ["der", "crt", "pem"] },
  "application/x-x509-ca-ra-cert": { source: "iana" },
  "application/x-x509-next-ca-cert": { source: "iana" },
  "application/x-xfig": { source: "apache", extensions: ["fig"] },
  "application/x-xliff+xml": { source: "apache", compressible: !0, extensions: ["xlf"] },
  "application/x-xpinstall": { source: "apache", compressible: !1, extensions: ["xpi"] },
  "application/x-xz": { source: "apache", extensions: ["xz"] },
  "application/x-zmachine": { source: "apache", extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"] },
  "application/x400-bp": { source: "iana" },
  "application/xacml+xml": { source: "iana", compressible: !0 },
  "application/xaml+xml": { source: "apache", compressible: !0, extensions: ["xaml"] },
  "application/xcap-att+xml": { source: "iana", compressible: !0, extensions: ["xav"] },
  "application/xcap-caps+xml": { source: "iana", compressible: !0, extensions: ["xca"] },
  "application/xcap-diff+xml": { source: "iana", compressible: !0, extensions: ["xdf"] },
  "application/xcap-el+xml": { source: "iana", compressible: !0, extensions: ["xel"] },
  "application/xcap-error+xml": { source: "iana", compressible: !0 },
  "application/xcap-ns+xml": { source: "iana", compressible: !0, extensions: ["xns"] },
  "application/xcon-conference-info+xml": { source: "iana", compressible: !0 },
  "application/xcon-conference-info-diff+xml": { source: "iana", compressible: !0 },
  "application/xenc+xml": { source: "iana", compressible: !0, extensions: ["xenc"] },
  "application/xhtml+xml": { source: "iana", compressible: !0, extensions: ["xhtml", "xht"] },
  "application/xhtml-voice+xml": { source: "apache", compressible: !0 },
  "application/xliff+xml": { source: "iana", compressible: !0, extensions: ["xlf"] },
  "application/xml": { source: "iana", compressible: !0, extensions: ["xml", "xsl", "xsd", "rng"] },
  "application/xml-dtd": { source: "iana", compressible: !0, extensions: ["dtd"] },
  "application/xml-external-parsed-entity": { source: "iana" },
  "application/xml-patch+xml": { source: "iana", compressible: !0 },
  "application/xmpp+xml": { source: "iana", compressible: !0 },
  "application/xop+xml": { source: "iana", compressible: !0, extensions: ["xop"] },
  "application/xproc+xml": { source: "apache", compressible: !0, extensions: ["xpl"] },
  "application/xslt+xml": { source: "iana", compressible: !0, extensions: ["xsl", "xslt"] },
  "application/xspf+xml": { source: "apache", compressible: !0, extensions: ["xspf"] },
  "application/xv+xml": { source: "iana", compressible: !0, extensions: ["mxml", "xhvml", "xvml", "xvm"] },
  "application/yang": { source: "iana", extensions: ["yang"] },
  "application/yang-data+json": { source: "iana", compressible: !0 },
  "application/yang-data+xml": { source: "iana", compressible: !0 },
  "application/yang-patch+json": { source: "iana", compressible: !0 },
  "application/yang-patch+xml": { source: "iana", compressible: !0 },
  "application/yin+xml": { source: "iana", compressible: !0, extensions: ["yin"] },
  "application/zip": { source: "iana", compressible: !1, extensions: ["zip"] },
  "application/zlib": { source: "iana" },
  "application/zstd": { source: "iana" },
  "audio/1d-interleaved-parityfec": { source: "iana" },
  "audio/32kadpcm": { source: "iana" },
  "audio/3gpp": { source: "iana", compressible: !1, extensions: ["3gpp"] },
  "audio/3gpp2": { source: "iana" },
  "audio/aac": { source: "iana" },
  "audio/ac3": { source: "iana" },
  "audio/adpcm": { source: "apache", extensions: ["adp"] },
  "audio/amr": { source: "iana", extensions: ["amr"] },
  "audio/amr-wb": { source: "iana" },
  "audio/amr-wb+": { source: "iana" },
  "audio/aptx": { source: "iana" },
  "audio/asc": { source: "iana" },
  "audio/atrac-advanced-lossless": { source: "iana" },
  "audio/atrac-x": { source: "iana" },
  "audio/atrac3": { source: "iana" },
  "audio/basic": { source: "iana", compressible: !1, extensions: ["au", "snd"] },
  "audio/bv16": { source: "iana" },
  "audio/bv32": { source: "iana" },
  "audio/clearmode": { source: "iana" },
  "audio/cn": { source: "iana" },
  "audio/dat12": { source: "iana" },
  "audio/dls": { source: "iana" },
  "audio/dsr-es201108": { source: "iana" },
  "audio/dsr-es202050": { source: "iana" },
  "audio/dsr-es202211": { source: "iana" },
  "audio/dsr-es202212": { source: "iana" },
  "audio/dv": { source: "iana" },
  "audio/dvi4": { source: "iana" },
  "audio/eac3": { source: "iana" },
  "audio/encaprtp": { source: "iana" },
  "audio/evrc": { source: "iana" },
  "audio/evrc-qcp": { source: "iana" },
  "audio/evrc0": { source: "iana" },
  "audio/evrc1": { source: "iana" },
  "audio/evrcb": { source: "iana" },
  "audio/evrcb0": { source: "iana" },
  "audio/evrcb1": { source: "iana" },
  "audio/evrcnw": { source: "iana" },
  "audio/evrcnw0": { source: "iana" },
  "audio/evrcnw1": { source: "iana" },
  "audio/evrcwb": { source: "iana" },
  "audio/evrcwb0": { source: "iana" },
  "audio/evrcwb1": { source: "iana" },
  "audio/evs": { source: "iana" },
  "audio/flexfec": { source: "iana" },
  "audio/fwdred": { source: "iana" },
  "audio/g711-0": { source: "iana" },
  "audio/g719": { source: "iana" },
  "audio/g722": { source: "iana" },
  "audio/g7221": { source: "iana" },
  "audio/g723": { source: "iana" },
  "audio/g726-16": { source: "iana" },
  "audio/g726-24": { source: "iana" },
  "audio/g726-32": { source: "iana" },
  "audio/g726-40": { source: "iana" },
  "audio/g728": { source: "iana" },
  "audio/g729": { source: "iana" },
  "audio/g7291": { source: "iana" },
  "audio/g729d": { source: "iana" },
  "audio/g729e": { source: "iana" },
  "audio/gsm": { source: "iana" },
  "audio/gsm-efr": { source: "iana" },
  "audio/gsm-hr-08": { source: "iana" },
  "audio/ilbc": { source: "iana" },
  "audio/ip-mr_v2.5": { source: "iana" },
  "audio/isac": { source: "apache" },
  "audio/l16": { source: "iana" },
  "audio/l20": { source: "iana" },
  "audio/l24": { source: "iana", compressible: !1 },
  "audio/l8": { source: "iana" },
  "audio/lpc": { source: "iana" },
  "audio/melp": { source: "iana" },
  "audio/melp1200": { source: "iana" },
  "audio/melp2400": { source: "iana" },
  "audio/melp600": { source: "iana" },
  "audio/mhas": { source: "iana" },
  "audio/midi": { source: "apache", extensions: ["mid", "midi", "kar", "rmi"] },
  "audio/mobile-xmf": { source: "iana", extensions: ["mxmf"] },
  "audio/mp3": { compressible: !1, extensions: ["mp3"] },
  "audio/mp4": { source: "iana", compressible: !1, extensions: ["m4a", "mp4a"] },
  "audio/mp4a-latm": { source: "iana" },
  "audio/mpa": { source: "iana" },
  "audio/mpa-robust": { source: "iana" },
  "audio/mpeg": { source: "iana", compressible: !1, extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"] },
  "audio/mpeg4-generic": { source: "iana" },
  "audio/musepack": { source: "apache" },
  "audio/ogg": { source: "iana", compressible: !1, extensions: ["oga", "ogg", "spx", "opus"] },
  "audio/opus": { source: "iana" },
  "audio/parityfec": { source: "iana" },
  "audio/pcma": { source: "iana" },
  "audio/pcma-wb": { source: "iana" },
  "audio/pcmu": { source: "iana" },
  "audio/pcmu-wb": { source: "iana" },
  "audio/prs.sid": { source: "iana" },
  "audio/qcelp": { source: "iana" },
  "audio/raptorfec": { source: "iana" },
  "audio/red": { source: "iana" },
  "audio/rtp-enc-aescm128": { source: "iana" },
  "audio/rtp-midi": { source: "iana" },
  "audio/rtploopback": { source: "iana" },
  "audio/rtx": { source: "iana" },
  "audio/s3m": { source: "apache", extensions: ["s3m"] },
  "audio/scip": { source: "iana" },
  "audio/silk": { source: "apache", extensions: ["sil"] },
  "audio/smv": { source: "iana" },
  "audio/smv-qcp": { source: "iana" },
  "audio/smv0": { source: "iana" },
  "audio/sofa": { source: "iana" },
  "audio/sp-midi": { source: "iana" },
  "audio/speex": { source: "iana" },
  "audio/t140c": { source: "iana" },
  "audio/t38": { source: "iana" },
  "audio/telephone-event": { source: "iana" },
  "audio/tetra_acelp": { source: "iana" },
  "audio/tetra_acelp_bb": { source: "iana" },
  "audio/tone": { source: "iana" },
  "audio/tsvcis": { source: "iana" },
  "audio/uemclip": { source: "iana" },
  "audio/ulpfec": { source: "iana" },
  "audio/usac": { source: "iana" },
  "audio/vdvi": { source: "iana" },
  "audio/vmr-wb": { source: "iana" },
  "audio/vnd.3gpp.iufp": { source: "iana" },
  "audio/vnd.4sb": { source: "iana" },
  "audio/vnd.audiokoz": { source: "iana" },
  "audio/vnd.celp": { source: "iana" },
  "audio/vnd.cisco.nse": { source: "iana" },
  "audio/vnd.cmles.radio-events": { source: "iana" },
  "audio/vnd.cns.anp1": { source: "iana" },
  "audio/vnd.cns.inf1": { source: "iana" },
  "audio/vnd.dece.audio": { source: "iana", extensions: ["uva", "uvva"] },
  "audio/vnd.digital-winds": { source: "iana", extensions: ["eol"] },
  "audio/vnd.dlna.adts": { source: "iana" },
  "audio/vnd.dolby.heaac.1": { source: "iana" },
  "audio/vnd.dolby.heaac.2": { source: "iana" },
  "audio/vnd.dolby.mlp": { source: "iana" },
  "audio/vnd.dolby.mps": { source: "iana" },
  "audio/vnd.dolby.pl2": { source: "iana" },
  "audio/vnd.dolby.pl2x": { source: "iana" },
  "audio/vnd.dolby.pl2z": { source: "iana" },
  "audio/vnd.dolby.pulse.1": { source: "iana" },
  "audio/vnd.dra": { source: "iana", extensions: ["dra"] },
  "audio/vnd.dts": { source: "iana", extensions: ["dts"] },
  "audio/vnd.dts.hd": { source: "iana", extensions: ["dtshd"] },
  "audio/vnd.dts.uhd": { source: "iana" },
  "audio/vnd.dvb.file": { source: "iana" },
  "audio/vnd.everad.plj": { source: "iana" },
  "audio/vnd.hns.audio": { source: "iana" },
  "audio/vnd.lucent.voice": { source: "iana", extensions: ["lvp"] },
  "audio/vnd.ms-playready.media.pya": { source: "iana", extensions: ["pya"] },
  "audio/vnd.nokia.mobile-xmf": { source: "iana" },
  "audio/vnd.nortel.vbk": { source: "iana" },
  "audio/vnd.nuera.ecelp4800": { source: "iana", extensions: ["ecelp4800"] },
  "audio/vnd.nuera.ecelp7470": { source: "iana", extensions: ["ecelp7470"] },
  "audio/vnd.nuera.ecelp9600": { source: "iana", extensions: ["ecelp9600"] },
  "audio/vnd.octel.sbc": { source: "iana" },
  "audio/vnd.presonus.multitrack": { source: "iana" },
  "audio/vnd.qcelp": { source: "iana" },
  "audio/vnd.rhetorex.32kadpcm": { source: "iana" },
  "audio/vnd.rip": { source: "iana", extensions: ["rip"] },
  "audio/vnd.rn-realaudio": { compressible: !1 },
  "audio/vnd.sealedmedia.softseal.mpeg": { source: "iana" },
  "audio/vnd.vmx.cvsd": { source: "iana" },
  "audio/vnd.wave": { compressible: !1 },
  "audio/vorbis": { source: "iana", compressible: !1 },
  "audio/vorbis-config": { source: "iana" },
  "audio/wav": { compressible: !1, extensions: ["wav"] },
  "audio/wave": { compressible: !1, extensions: ["wav"] },
  "audio/webm": { source: "apache", compressible: !1, extensions: ["weba"] },
  "audio/x-aac": { source: "apache", compressible: !1, extensions: ["aac"] },
  "audio/x-aiff": { source: "apache", extensions: ["aif", "aiff", "aifc"] },
  "audio/x-caf": { source: "apache", compressible: !1, extensions: ["caf"] },
  "audio/x-flac": { source: "apache", extensions: ["flac"] },
  "audio/x-m4a": { source: "nginx", extensions: ["m4a"] },
  "audio/x-matroska": { source: "apache", extensions: ["mka"] },
  "audio/x-mpegurl": { source: "apache", extensions: ["m3u"] },
  "audio/x-ms-wax": { source: "apache", extensions: ["wax"] },
  "audio/x-ms-wma": { source: "apache", extensions: ["wma"] },
  "audio/x-pn-realaudio": { source: "apache", extensions: ["ram", "ra"] },
  "audio/x-pn-realaudio-plugin": { source: "apache", extensions: ["rmp"] },
  "audio/x-realaudio": { source: "nginx", extensions: ["ra"] },
  "audio/x-tta": { source: "apache" },
  "audio/x-wav": { source: "apache", extensions: ["wav"] },
  "audio/xm": { source: "apache", extensions: ["xm"] },
  "chemical/x-cdx": { source: "apache", extensions: ["cdx"] },
  "chemical/x-cif": { source: "apache", extensions: ["cif"] },
  "chemical/x-cmdf": { source: "apache", extensions: ["cmdf"] },
  "chemical/x-cml": { source: "apache", extensions: ["cml"] },
  "chemical/x-csml": { source: "apache", extensions: ["csml"] },
  "chemical/x-pdb": { source: "apache" },
  "chemical/x-xyz": { source: "apache", extensions: ["xyz"] },
  "font/collection": { source: "iana", extensions: ["ttc"] },
  "font/otf": { source: "iana", compressible: !0, extensions: ["otf"] },
  "font/sfnt": { source: "iana" },
  "font/ttf": { source: "iana", compressible: !0, extensions: ["ttf"] },
  "font/woff": { source: "iana", extensions: ["woff"] },
  "font/woff2": { source: "iana", extensions: ["woff2"] },
  "image/aces": { source: "iana", extensions: ["exr"] },
  "image/apng": { compressible: !1, extensions: ["apng"] },
  "image/avci": { source: "iana", extensions: ["avci"] },
  "image/avcs": { source: "iana", extensions: ["avcs"] },
  "image/avif": { source: "iana", compressible: !1, extensions: ["avif"] },
  "image/bmp": { source: "iana", compressible: !0, extensions: ["bmp"] },
  "image/cgm": { source: "iana", extensions: ["cgm"] },
  "image/dicom-rle": { source: "iana", extensions: ["drle"] },
  "image/emf": { source: "iana", extensions: ["emf"] },
  "image/fits": { source: "iana", extensions: ["fits"] },
  "image/g3fax": { source: "iana", extensions: ["g3"] },
  "image/gif": { source: "iana", compressible: !1, extensions: ["gif"] },
  "image/heic": { source: "iana", extensions: ["heic"] },
  "image/heic-sequence": { source: "iana", extensions: ["heics"] },
  "image/heif": { source: "iana", extensions: ["heif"] },
  "image/heif-sequence": { source: "iana", extensions: ["heifs"] },
  "image/hej2k": { source: "iana", extensions: ["hej2"] },
  "image/hsj2": { source: "iana", extensions: ["hsj2"] },
  "image/ief": { source: "iana", extensions: ["ief"] },
  "image/jls": { source: "iana", extensions: ["jls"] },
  "image/jp2": { source: "iana", compressible: !1, extensions: ["jp2", "jpg2"] },
  "image/jpeg": { source: "iana", compressible: !1, extensions: ["jpeg", "jpg", "jpe"] },
  "image/jph": { source: "iana", extensions: ["jph"] },
  "image/jphc": { source: "iana", extensions: ["jhc"] },
  "image/jpm": { source: "iana", compressible: !1, extensions: ["jpm"] },
  "image/jpx": { source: "iana", compressible: !1, extensions: ["jpx", "jpf"] },
  "image/jxr": { source: "iana", extensions: ["jxr"] },
  "image/jxra": { source: "iana", extensions: ["jxra"] },
  "image/jxrs": { source: "iana", extensions: ["jxrs"] },
  "image/jxs": { source: "iana", extensions: ["jxs"] },
  "image/jxsc": { source: "iana", extensions: ["jxsc"] },
  "image/jxsi": { source: "iana", extensions: ["jxsi"] },
  "image/jxss": { source: "iana", extensions: ["jxss"] },
  "image/ktx": { source: "iana", extensions: ["ktx"] },
  "image/ktx2": { source: "iana", extensions: ["ktx2"] },
  "image/naplps": { source: "iana" },
  "image/pjpeg": { compressible: !1 },
  "image/png": { source: "iana", compressible: !1, extensions: ["png"] },
  "image/prs.btif": { source: "iana", extensions: ["btif"] },
  "image/prs.pti": { source: "iana", extensions: ["pti"] },
  "image/pwg-raster": { source: "iana" },
  "image/sgi": { source: "apache", extensions: ["sgi"] },
  "image/svg+xml": { source: "iana", compressible: !0, extensions: ["svg", "svgz"] },
  "image/t38": { source: "iana", extensions: ["t38"] },
  "image/tiff": { source: "iana", compressible: !1, extensions: ["tif", "tiff"] },
  "image/tiff-fx": { source: "iana", extensions: ["tfx"] },
  "image/vnd.adobe.photoshop": { source: "iana", compressible: !0, extensions: ["psd"] },
  "image/vnd.airzip.accelerator.azv": { source: "iana", extensions: ["azv"] },
  "image/vnd.cns.inf2": { source: "iana" },
  "image/vnd.dece.graphic": { source: "iana", extensions: ["uvi", "uvvi", "uvg", "uvvg"] },
  "image/vnd.djvu": { source: "iana", extensions: ["djvu", "djv"] },
  "image/vnd.dvb.subtitle": { source: "iana", extensions: ["sub"] },
  "image/vnd.dwg": { source: "iana", extensions: ["dwg"] },
  "image/vnd.dxf": { source: "iana", extensions: ["dxf"] },
  "image/vnd.fastbidsheet": { source: "iana", extensions: ["fbs"] },
  "image/vnd.fpx": { source: "iana", extensions: ["fpx"] },
  "image/vnd.fst": { source: "iana", extensions: ["fst"] },
  "image/vnd.fujixerox.edmics-mmr": { source: "iana", extensions: ["mmr"] },
  "image/vnd.fujixerox.edmics-rlc": { source: "iana", extensions: ["rlc"] },
  "image/vnd.globalgraphics.pgb": { source: "iana" },
  "image/vnd.microsoft.icon": { source: "iana", compressible: !0, extensions: ["ico"] },
  "image/vnd.mix": { source: "iana" },
  "image/vnd.mozilla.apng": { source: "iana" },
  "image/vnd.ms-dds": { compressible: !0, extensions: ["dds"] },
  "image/vnd.ms-modi": { source: "iana", extensions: ["mdi"] },
  "image/vnd.ms-photo": { source: "apache", extensions: ["wdp"] },
  "image/vnd.net-fpx": { source: "iana", extensions: ["npx"] },
  "image/vnd.pco.b16": { source: "iana", extensions: ["b16"] },
  "image/vnd.radiance": { source: "iana" },
  "image/vnd.sealed.png": { source: "iana" },
  "image/vnd.sealedmedia.softseal.gif": { source: "iana" },
  "image/vnd.sealedmedia.softseal.jpg": { source: "iana" },
  "image/vnd.svf": { source: "iana" },
  "image/vnd.tencent.tap": { source: "iana", extensions: ["tap"] },
  "image/vnd.valve.source.texture": { source: "iana", extensions: ["vtf"] },
  "image/vnd.wap.wbmp": { source: "iana", extensions: ["wbmp"] },
  "image/vnd.xiff": { source: "iana", extensions: ["xif"] },
  "image/vnd.zbrush.pcx": { source: "iana", extensions: ["pcx"] },
  "image/webp": { source: "apache", extensions: ["webp"] },
  "image/wmf": { source: "iana", extensions: ["wmf"] },
  "image/x-3ds": { source: "apache", extensions: ["3ds"] },
  "image/x-cmu-raster": { source: "apache", extensions: ["ras"] },
  "image/x-cmx": { source: "apache", extensions: ["cmx"] },
  "image/x-freehand": { source: "apache", extensions: ["fh", "fhc", "fh4", "fh5", "fh7"] },
  "image/x-icon": { source: "apache", compressible: !0, extensions: ["ico"] },
  "image/x-jng": { source: "nginx", extensions: ["jng"] },
  "image/x-mrsid-image": { source: "apache", extensions: ["sid"] },
  "image/x-ms-bmp": { source: "nginx", compressible: !0, extensions: ["bmp"] },
  "image/x-pcx": { source: "apache", extensions: ["pcx"] },
  "image/x-pict": { source: "apache", extensions: ["pic", "pct"] },
  "image/x-portable-anymap": { source: "apache", extensions: ["pnm"] },
  "image/x-portable-bitmap": { source: "apache", extensions: ["pbm"] },
  "image/x-portable-graymap": { source: "apache", extensions: ["pgm"] },
  "image/x-portable-pixmap": { source: "apache", extensions: ["ppm"] },
  "image/x-rgb": { source: "apache", extensions: ["rgb"] },
  "image/x-tga": { source: "apache", extensions: ["tga"] },
  "image/x-xbitmap": { source: "apache", extensions: ["xbm"] },
  "image/x-xcf": { compressible: !1 },
  "image/x-xpixmap": { source: "apache", extensions: ["xpm"] },
  "image/x-xwindowdump": { source: "apache", extensions: ["xwd"] },
  "message/cpim": { source: "iana" },
  "message/delivery-status": { source: "iana" },
  "message/disposition-notification": { source: "iana", extensions: ["disposition-notification"] },
  "message/external-body": { source: "iana" },
  "message/feedback-report": { source: "iana" },
  "message/global": { source: "iana", extensions: ["u8msg"] },
  "message/global-delivery-status": { source: "iana", extensions: ["u8dsn"] },
  "message/global-disposition-notification": { source: "iana", extensions: ["u8mdn"] },
  "message/global-headers": { source: "iana", extensions: ["u8hdr"] },
  "message/http": { source: "iana", compressible: !1 },
  "message/imdn+xml": { source: "iana", compressible: !0 },
  "message/news": { source: "iana" },
  "message/partial": { source: "iana", compressible: !1 },
  "message/rfc822": { source: "iana", compressible: !0, extensions: ["eml", "mime"] },
  "message/s-http": { source: "iana" },
  "message/sip": { source: "iana" },
  "message/sipfrag": { source: "iana" },
  "message/tracking-status": { source: "iana" },
  "message/vnd.si.simp": { source: "iana" },
  "message/vnd.wfa.wsc": { source: "iana", extensions: ["wsc"] },
  "model/3mf": { source: "iana", extensions: ["3mf"] },
  "model/e57": { source: "iana" },
  "model/gltf+json": { source: "iana", compressible: !0, extensions: ["gltf"] },
  "model/gltf-binary": { source: "iana", compressible: !0, extensions: ["glb"] },
  "model/iges": { source: "iana", compressible: !1, extensions: ["igs", "iges"] },
  "model/mesh": { source: "iana", compressible: !1, extensions: ["msh", "mesh", "silo"] },
  "model/mtl": { source: "iana", extensions: ["mtl"] },
  "model/obj": { source: "iana", extensions: ["obj"] },
  "model/step": { source: "iana" },
  "model/step+xml": { source: "iana", compressible: !0, extensions: ["stpx"] },
  "model/step+zip": { source: "iana", compressible: !1, extensions: ["stpz"] },
  "model/step-xml+zip": { source: "iana", compressible: !1, extensions: ["stpxz"] },
  "model/stl": { source: "iana", extensions: ["stl"] },
  "model/vnd.collada+xml": { source: "iana", compressible: !0, extensions: ["dae"] },
  "model/vnd.dwf": { source: "iana", extensions: ["dwf"] },
  "model/vnd.flatland.3dml": { source: "iana" },
  "model/vnd.gdl": { source: "iana", extensions: ["gdl"] },
  "model/vnd.gs-gdl": { source: "apache" },
  "model/vnd.gs.gdl": { source: "iana" },
  "model/vnd.gtw": { source: "iana", extensions: ["gtw"] },
  "model/vnd.moml+xml": { source: "iana", compressible: !0 },
  "model/vnd.mts": { source: "iana", extensions: ["mts"] },
  "model/vnd.opengex": { source: "iana", extensions: ["ogex"] },
  "model/vnd.parasolid.transmit.binary": { source: "iana", extensions: ["x_b"] },
  "model/vnd.parasolid.transmit.text": { source: "iana", extensions: ["x_t"] },
  "model/vnd.pytha.pyox": { source: "iana" },
  "model/vnd.rosette.annotated-data-model": { source: "iana" },
  "model/vnd.sap.vds": { source: "iana", extensions: ["vds"] },
  "model/vnd.usdz+zip": { source: "iana", compressible: !1, extensions: ["usdz"] },
  "model/vnd.valve.source.compiled-map": { source: "iana", extensions: ["bsp"] },
  "model/vnd.vtu": { source: "iana", extensions: ["vtu"] },
  "model/vrml": { source: "iana", compressible: !1, extensions: ["wrl", "vrml"] },
  "model/x3d+binary": { source: "apache", compressible: !1, extensions: ["x3db", "x3dbz"] },
  "model/x3d+fastinfoset": { source: "iana", extensions: ["x3db"] },
  "model/x3d+vrml": { source: "apache", compressible: !1, extensions: ["x3dv", "x3dvz"] },
  "model/x3d+xml": { source: "iana", compressible: !0, extensions: ["x3d", "x3dz"] },
  "model/x3d-vrml": { source: "iana", extensions: ["x3dv"] },
  "multipart/alternative": { source: "iana", compressible: !1 },
  "multipart/appledouble": { source: "iana" },
  "multipart/byteranges": { source: "iana" },
  "multipart/digest": { source: "iana" },
  "multipart/encrypted": { source: "iana", compressible: !1 },
  "multipart/form-data": { source: "iana", compressible: !1 },
  "multipart/header-set": { source: "iana" },
  "multipart/mixed": { source: "iana" },
  "multipart/multilingual": { source: "iana" },
  "multipart/parallel": { source: "iana" },
  "multipart/related": { source: "iana", compressible: !1 },
  "multipart/report": { source: "iana" },
  "multipart/signed": { source: "iana", compressible: !1 },
  "multipart/vnd.bint.med-plus": { source: "iana" },
  "multipart/voice-message": { source: "iana" },
  "multipart/x-mixed-replace": { source: "iana" },
  "text/1d-interleaved-parityfec": { source: "iana" },
  "text/cache-manifest": { source: "iana", compressible: !0, extensions: ["appcache", "manifest"] },
  "text/calendar": { source: "iana", extensions: ["ics", "ifb"] },
  "text/calender": { compressible: !0 },
  "text/cmd": { compressible: !0 },
  "text/coffeescript": { extensions: ["coffee", "litcoffee"] },
  "text/cql": { source: "iana" },
  "text/cql-expression": { source: "iana" },
  "text/cql-identifier": { source: "iana" },
  "text/css": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["css"] },
  "text/csv": { source: "iana", compressible: !0, extensions: ["csv"] },
  "text/csv-schema": { source: "iana" },
  "text/directory": { source: "iana" },
  "text/dns": { source: "iana" },
  "text/ecmascript": { source: "iana" },
  "text/encaprtp": { source: "iana" },
  "text/enriched": { source: "iana" },
  "text/fhirpath": { source: "iana" },
  "text/flexfec": { source: "iana" },
  "text/fwdred": { source: "iana" },
  "text/gff3": { source: "iana" },
  "text/grammar-ref-list": { source: "iana" },
  "text/html": { source: "iana", compressible: !0, extensions: ["html", "htm", "shtml"] },
  "text/jade": { extensions: ["jade"] },
  "text/javascript": { source: "iana", compressible: !0 },
  "text/jcr-cnd": { source: "iana" },
  "text/jsx": { compressible: !0, extensions: ["jsx"] },
  "text/less": { compressible: !0, extensions: ["less"] },
  "text/markdown": { source: "iana", compressible: !0, extensions: ["markdown", "md"] },
  "text/mathml": { source: "nginx", extensions: ["mml"] },
  "text/mdx": { compressible: !0, extensions: ["mdx"] },
  "text/mizar": { source: "iana" },
  "text/n3": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["n3"] },
  "text/parameters": { source: "iana", charset: "UTF-8" },
  "text/parityfec": { source: "iana" },
  "text/plain": { source: "iana", compressible: !0, extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"] },
  "text/provenance-notation": { source: "iana", charset: "UTF-8" },
  "text/prs.fallenstein.rst": { source: "iana" },
  "text/prs.lines.tag": { source: "iana", extensions: ["dsc"] },
  "text/prs.prop.logic": { source: "iana" },
  "text/raptorfec": { source: "iana" },
  "text/red": { source: "iana" },
  "text/rfc822-headers": { source: "iana" },
  "text/richtext": { source: "iana", compressible: !0, extensions: ["rtx"] },
  "text/rtf": { source: "iana", compressible: !0, extensions: ["rtf"] },
  "text/rtp-enc-aescm128": { source: "iana" },
  "text/rtploopback": { source: "iana" },
  "text/rtx": { source: "iana" },
  "text/sgml": { source: "iana", extensions: ["sgml", "sgm"] },
  "text/shaclc": { source: "iana" },
  "text/shex": { source: "iana", extensions: ["shex"] },
  "text/slim": { extensions: ["slim", "slm"] },
  "text/spdx": { source: "iana", extensions: ["spdx"] },
  "text/strings": { source: "iana" },
  "text/stylus": { extensions: ["stylus", "styl"] },
  "text/t140": { source: "iana" },
  "text/tab-separated-values": { source: "iana", compressible: !0, extensions: ["tsv"] },
  "text/troff": { source: "iana", extensions: ["t", "tr", "roff", "man", "me", "ms"] },
  "text/turtle": { source: "iana", charset: "UTF-8", extensions: ["ttl"] },
  "text/ulpfec": { source: "iana" },
  "text/uri-list": { source: "iana", compressible: !0, extensions: ["uri", "uris", "urls"] },
  "text/vcard": { source: "iana", compressible: !0, extensions: ["vcard"] },
  "text/vnd.a": { source: "iana" },
  "text/vnd.abc": { source: "iana" },
  "text/vnd.ascii-art": { source: "iana" },
  "text/vnd.curl": { source: "iana", extensions: ["curl"] },
  "text/vnd.curl.dcurl": { source: "apache", extensions: ["dcurl"] },
  "text/vnd.curl.mcurl": { source: "apache", extensions: ["mcurl"] },
  "text/vnd.curl.scurl": { source: "apache", extensions: ["scurl"] },
  "text/vnd.debian.copyright": { source: "iana", charset: "UTF-8" },
  "text/vnd.dmclientscript": { source: "iana" },
  "text/vnd.dvb.subtitle": { source: "iana", extensions: ["sub"] },
  "text/vnd.esmertec.theme-descriptor": { source: "iana", charset: "UTF-8" },
  "text/vnd.familysearch.gedcom": { source: "iana", extensions: ["ged"] },
  "text/vnd.ficlab.flt": { source: "iana" },
  "text/vnd.fly": { source: "iana", extensions: ["fly"] },
  "text/vnd.fmi.flexstor": { source: "iana", extensions: ["flx"] },
  "text/vnd.gml": { source: "iana" },
  "text/vnd.graphviz": { source: "iana", extensions: ["gv"] },
  "text/vnd.hans": { source: "iana" },
  "text/vnd.hgl": { source: "iana" },
  "text/vnd.in3d.3dml": { source: "iana", extensions: ["3dml"] },
  "text/vnd.in3d.spot": { source: "iana", extensions: ["spot"] },
  "text/vnd.iptc.newsml": { source: "iana" },
  "text/vnd.iptc.nitf": { source: "iana" },
  "text/vnd.latex-z": { source: "iana" },
  "text/vnd.motorola.reflex": { source: "iana" },
  "text/vnd.ms-mediapackage": { source: "iana" },
  "text/vnd.net2phone.commcenter.command": { source: "iana" },
  "text/vnd.radisys.msml-basic-layout": { source: "iana" },
  "text/vnd.senx.warpscript": { source: "iana" },
  "text/vnd.si.uricatalogue": { source: "iana" },
  "text/vnd.sosi": { source: "iana" },
  "text/vnd.sun.j2me.app-descriptor": { source: "iana", charset: "UTF-8", extensions: ["jad"] },
  "text/vnd.trolltech.linguist": { source: "iana", charset: "UTF-8" },
  "text/vnd.wap.si": { source: "iana" },
  "text/vnd.wap.sl": { source: "iana" },
  "text/vnd.wap.wml": { source: "iana", extensions: ["wml"] },
  "text/vnd.wap.wmlscript": { source: "iana", extensions: ["wmls"] },
  "text/vtt": { source: "iana", charset: "UTF-8", compressible: !0, extensions: ["vtt"] },
  "text/x-asm": { source: "apache", extensions: ["s", "asm"] },
  "text/x-c": { source: "apache", extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"] },
  "text/x-component": { source: "nginx", extensions: ["htc"] },
  "text/x-fortran": { source: "apache", extensions: ["f", "for", "f77", "f90"] },
  "text/x-gwt-rpc": { compressible: !0 },
  "text/x-handlebars-template": { extensions: ["hbs"] },
  "text/x-java-source": { source: "apache", extensions: ["java"] },
  "text/x-jquery-tmpl": { compressible: !0 },
  "text/x-lua": { extensions: ["lua"] },
  "text/x-markdown": { compressible: !0, extensions: ["mkd"] },
  "text/x-nfo": { source: "apache", extensions: ["nfo"] },
  "text/x-opml": { source: "apache", extensions: ["opml"] },
  "text/x-org": { compressible: !0, extensions: ["org"] },
  "text/x-pascal": { source: "apache", extensions: ["p", "pas"] },
  "text/x-processing": { compressible: !0, extensions: ["pde"] },
  "text/x-sass": { extensions: ["sass"] },
  "text/x-scss": { extensions: ["scss"] },
  "text/x-setext": { source: "apache", extensions: ["etx"] },
  "text/x-sfv": { source: "apache", extensions: ["sfv"] },
  "text/x-suse-ymp": { compressible: !0, extensions: ["ymp"] },
  "text/x-uuencode": { source: "apache", extensions: ["uu"] },
  "text/x-vcalendar": { source: "apache", extensions: ["vcs"] },
  "text/x-vcard": { source: "apache", extensions: ["vcf"] },
  "text/xml": { source: "iana", compressible: !0, extensions: ["xml"] },
  "text/xml-external-parsed-entity": { source: "iana" },
  "text/yaml": { compressible: !0, extensions: ["yaml", "yml"] },
  "video/1d-interleaved-parityfec": { source: "iana" },
  "video/3gpp": { source: "iana", extensions: ["3gp", "3gpp"] },
  "video/3gpp-tt": { source: "iana" },
  "video/3gpp2": { source: "iana", extensions: ["3g2"] },
  "video/av1": { source: "iana" },
  "video/bmpeg": { source: "iana" },
  "video/bt656": { source: "iana" },
  "video/celb": { source: "iana" },
  "video/dv": { source: "iana" },
  "video/encaprtp": { source: "iana" },
  "video/ffv1": { source: "iana" },
  "video/flexfec": { source: "iana" },
  "video/h261": { source: "iana", extensions: ["h261"] },
  "video/h263": { source: "iana", extensions: ["h263"] },
  "video/h263-1998": { source: "iana" },
  "video/h263-2000": { source: "iana" },
  "video/h264": { source: "iana", extensions: ["h264"] },
  "video/h264-rcdo": { source: "iana" },
  "video/h264-svc": { source: "iana" },
  "video/h265": { source: "iana" },
  "video/iso.segment": { source: "iana", extensions: ["m4s"] },
  "video/jpeg": { source: "iana", extensions: ["jpgv"] },
  "video/jpeg2000": { source: "iana" },
  "video/jpm": { source: "apache", extensions: ["jpm", "jpgm"] },
  "video/jxsv": { source: "iana" },
  "video/mj2": { source: "iana", extensions: ["mj2", "mjp2"] },
  "video/mp1s": { source: "iana" },
  "video/mp2p": { source: "iana" },
  "video/mp2t": { source: "iana", extensions: ["ts"] },
  "video/mp4": { source: "iana", compressible: !1, extensions: ["mp4", "mp4v", "mpg4"] },
  "video/mp4v-es": { source: "iana" },
  "video/mpeg": { source: "iana", compressible: !1, extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"] },
  "video/mpeg4-generic": { source: "iana" },
  "video/mpv": { source: "iana" },
  "video/nv": { source: "iana" },
  "video/ogg": { source: "iana", compressible: !1, extensions: ["ogv"] },
  "video/parityfec": { source: "iana" },
  "video/pointer": { source: "iana" },
  "video/quicktime": { source: "iana", compressible: !1, extensions: ["qt", "mov"] },
  "video/raptorfec": { source: "iana" },
  "video/raw": { source: "iana" },
  "video/rtp-enc-aescm128": { source: "iana" },
  "video/rtploopback": { source: "iana" },
  "video/rtx": { source: "iana" },
  "video/scip": { source: "iana" },
  "video/smpte291": { source: "iana" },
  "video/smpte292m": { source: "iana" },
  "video/ulpfec": { source: "iana" },
  "video/vc1": { source: "iana" },
  "video/vc2": { source: "iana" },
  "video/vnd.cctv": { source: "iana" },
  "video/vnd.dece.hd": { source: "iana", extensions: ["uvh", "uvvh"] },
  "video/vnd.dece.mobile": { source: "iana", extensions: ["uvm", "uvvm"] },
  "video/vnd.dece.mp4": { source: "iana" },
  "video/vnd.dece.pd": { source: "iana", extensions: ["uvp", "uvvp"] },
  "video/vnd.dece.sd": { source: "iana", extensions: ["uvs", "uvvs"] },
  "video/vnd.dece.video": { source: "iana", extensions: ["uvv", "uvvv"] },
  "video/vnd.directv.mpeg": { source: "iana" },
  "video/vnd.directv.mpeg-tts": { source: "iana" },
  "video/vnd.dlna.mpeg-tts": { source: "iana" },
  "video/vnd.dvb.file": { source: "iana", extensions: ["dvb"] },
  "video/vnd.fvt": { source: "iana", extensions: ["fvt"] },
  "video/vnd.hns.video": { source: "iana" },
  "video/vnd.iptvforum.1dparityfec-1010": { source: "iana" },
  "video/vnd.iptvforum.1dparityfec-2005": { source: "iana" },
  "video/vnd.iptvforum.2dparityfec-1010": { source: "iana" },
  "video/vnd.iptvforum.2dparityfec-2005": { source: "iana" },
  "video/vnd.iptvforum.ttsavc": { source: "iana" },
  "video/vnd.iptvforum.ttsmpeg2": { source: "iana" },
  "video/vnd.motorola.video": { source: "iana" },
  "video/vnd.motorola.videop": { source: "iana" },
  "video/vnd.mpegurl": { source: "iana", extensions: ["mxu", "m4u"] },
  "video/vnd.ms-playready.media.pyv": { source: "iana", extensions: ["pyv"] },
  "video/vnd.nokia.interleaved-multimedia": { source: "iana" },
  "video/vnd.nokia.mp4vr": { source: "iana" },
  "video/vnd.nokia.videovoip": { source: "iana" },
  "video/vnd.objectvideo": { source: "iana" },
  "video/vnd.radgamettools.bink": { source: "iana" },
  "video/vnd.radgamettools.smacker": { source: "iana" },
  "video/vnd.sealed.mpeg1": { source: "iana" },
  "video/vnd.sealed.mpeg4": { source: "iana" },
  "video/vnd.sealed.swf": { source: "iana" },
  "video/vnd.sealedmedia.softseal.mov": { source: "iana" },
  "video/vnd.uvvu.mp4": { source: "iana", extensions: ["uvu", "uvvu"] },
  "video/vnd.vivo": { source: "iana", extensions: ["viv"] },
  "video/vnd.youtube.yt": { source: "iana" },
  "video/vp8": { source: "iana" },
  "video/vp9": { source: "iana" },
  "video/webm": { source: "apache", compressible: !1, extensions: ["webm"] },
  "video/x-f4v": { source: "apache", extensions: ["f4v"] },
  "video/x-fli": { source: "apache", extensions: ["fli"] },
  "video/x-flv": { source: "apache", compressible: !1, extensions: ["flv"] },
  "video/x-m4v": { source: "apache", extensions: ["m4v"] },
  "video/x-matroska": { source: "apache", compressible: !1, extensions: ["mkv", "mk3d", "mks"] },
  "video/x-mng": { source: "apache", extensions: ["mng"] },
  "video/x-ms-asf": { source: "apache", extensions: ["asf", "asx"] },
  "video/x-ms-vob": { source: "apache", extensions: ["vob"] },
  "video/x-ms-wm": { source: "apache", extensions: ["wm"] },
  "video/x-ms-wmv": { source: "apache", compressible: !1, extensions: ["wmv"] },
  "video/x-ms-wmx": { source: "apache", extensions: ["wmx"] },
  "video/x-ms-wvx": { source: "apache", extensions: ["wvx"] },
  "video/x-msvideo": { source: "apache", extensions: ["avi"] },
  "video/x-sgi-movie": { source: "apache", extensions: ["movie"] },
  "video/x-smv": { source: "apache", extensions: ["smv"] },
  "x-conference/x-cooltalk": { source: "apache", extensions: ["ice"] },
  "x-shader/x-fragment": { compressible: !0 },
  "x-shader/x-vertex": { compressible: !0 }
};
var ga, Wn;
function fo() {
  return Wn || (Wn = 1, ga = mo), ga;
}
var Gn;
function xo() {
  return Gn || (Gn = 1, (function(a) {
    var e = fo(), n = Ei.extname, t = /^\s*([^;\s]*)(?:;|\s|$)/, i = /^text\//i;
    a.charset = o, a.charsets = { lookup: o }, a.contentType = s, a.extension = r, a.extensions = /* @__PURE__ */ Object.create(null), a.lookup = c, a.types = /* @__PURE__ */ Object.create(null), u(a.extensions, a.types);
    function o(p) {
      if (!p || typeof p != "string")
        return !1;
      var l = t.exec(p), m = l && e[l[1].toLowerCase()];
      return m && m.charset ? m.charset : l && i.test(l[1]) ? "UTF-8" : !1;
    }
    function s(p) {
      if (!p || typeof p != "string")
        return !1;
      var l = p.indexOf("/") === -1 ? a.lookup(p) : p;
      if (!l)
        return !1;
      if (l.indexOf("charset") === -1) {
        var m = a.charset(l);
        m && (l += "; charset=" + m.toLowerCase());
      }
      return l;
    }
    function r(p) {
      if (!p || typeof p != "string")
        return !1;
      var l = t.exec(p), m = l && a.extensions[l[1].toLowerCase()];
      return !m || !m.length ? !1 : m[0];
    }
    function c(p) {
      if (!p || typeof p != "string")
        return !1;
      var l = n("x." + p).toLowerCase().substr(1);
      return l && a.types[l] || !1;
    }
    function u(p, l) {
      var m = ["nginx", "apache", void 0, "iana"];
      Object.keys(e).forEach(function(f) {
        var d = e[f], x = d.extensions;
        if (!(!x || !x.length)) {
          p[f] = x;
          for (var v = 0; v < x.length; v++) {
            var E = x[v];
            if (l[E]) {
              var A = m.indexOf(e[l[E]].source), j = m.indexOf(d.source);
              if (l[E] !== "application/octet-stream" && (A > j || A === j && l[E].substr(0, 12) === "application/"))
                continue;
            }
            l[E] = f;
          }
        }
      });
    }
  })(ba)), ba;
}
var ya, Vn;
function ho() {
  if (Vn) return ya;
  Vn = 1, ya = a;
  function a(e) {
    var n = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
    n ? n(e) : setTimeout(e, 0);
  }
  return ya;
}
var wa, Jn;
function Li() {
  if (Jn) return wa;
  Jn = 1;
  var a = ho();
  wa = e;
  function e(n) {
    var t = !1;
    return a(function() {
      t = !0;
    }), function(o, s) {
      t ? n(o, s) : a(function() {
        n(o, s);
      });
    };
  }
  return wa;
}
var Ea, Kn;
function Di() {
  if (Kn) return Ea;
  Kn = 1, Ea = a;
  function a(n) {
    Object.keys(n.jobs).forEach(e.bind(n)), n.jobs = {};
  }
  function e(n) {
    typeof this.jobs[n] == "function" && this.jobs[n]();
  }
  return Ea;
}
var Ra, Xn;
function Fi() {
  if (Xn) return Ra;
  Xn = 1;
  var a = Li(), e = Di();
  Ra = n;
  function n(i, o, s, r) {
    var c = s.keyedList ? s.keyedList[s.index] : s.index;
    s.jobs[c] = t(o, c, i[c], function(u, p) {
      c in s.jobs && (delete s.jobs[c], u ? e(s) : s.results[c] = p, r(u, s.results));
    });
  }
  function t(i, o, s, r) {
    var c;
    return i.length == 2 ? c = i(s, a(r)) : c = i(s, o, a(r)), c;
  }
  return Ra;
}
var Ta, Yn;
function Ui() {
  if (Yn) return Ta;
  Yn = 1, Ta = a;
  function a(e, n) {
    var t = !Array.isArray(e), i = {
      index: 0,
      keyedList: t || n ? Object.keys(e) : null,
      jobs: {},
      results: t ? {} : [],
      size: t ? Object.keys(e).length : e.length
    };
    return n && i.keyedList.sort(t ? n : function(o, s) {
      return n(e[o], e[s]);
    }), i;
  }
  return Ta;
}
var Sa, Zn;
function qi() {
  if (Zn) return Sa;
  Zn = 1;
  var a = Di(), e = Li();
  Sa = n;
  function n(t) {
    Object.keys(this.jobs).length && (this.index = this.size, a(this), e(t)(null, this.results));
  }
  return Sa;
}
var Aa, Qn;
function vo() {
  if (Qn) return Aa;
  Qn = 1;
  var a = Fi(), e = Ui(), n = qi();
  Aa = t;
  function t(i, o, s) {
    for (var r = e(i); r.index < (r.keyedList || i).length; )
      a(i, o, r, function(c, u) {
        if (c) {
          s(c, u);
          return;
        }
        if (Object.keys(r.jobs).length === 0) {
          s(null, r.results);
          return;
        }
      }), r.index++;
    return n.bind(r, s);
  }
  return Aa;
}
var Ne = { exports: {} }, et;
function Bi() {
  if (et) return Ne.exports;
  et = 1;
  var a = Fi(), e = Ui(), n = qi();
  Ne.exports = t, Ne.exports.ascending = i, Ne.exports.descending = o;
  function t(s, r, c, u) {
    var p = e(s, c);
    return a(s, r, p, function l(m, g) {
      if (m) {
        u(m, g);
        return;
      }
      if (p.index++, p.index < (p.keyedList || s).length) {
        a(s, r, p, l);
        return;
      }
      u(null, p.results);
    }), n.bind(p, u);
  }
  function i(s, r) {
    return s < r ? -1 : s > r ? 1 : 0;
  }
  function o(s, r) {
    return -1 * i(s, r);
  }
  return Ne.exports;
}
var _a, at;
function bo() {
  if (at) return _a;
  at = 1;
  var a = Bi();
  _a = e;
  function e(n, t, i) {
    return a(n, t, null, i);
  }
  return _a;
}
var Ca, nt;
function go() {
  return nt || (nt = 1, Ca = {
    parallel: vo(),
    serial: bo(),
    serialOrdered: Bi()
  }), Ca;
}
var Oa, tt;
function Mi() {
  return tt || (tt = 1, Oa = Object), Oa;
}
var ka, it;
function yo() {
  return it || (it = 1, ka = Error), ka;
}
var ja, st;
function wo() {
  return st || (st = 1, ja = EvalError), ja;
}
var Na, ot;
function Eo() {
  return ot || (ot = 1, Na = RangeError), Na;
}
var Pa, rt;
function Ro() {
  return rt || (rt = 1, Pa = ReferenceError), Pa;
}
var Ia, ct;
function To() {
  return ct || (ct = 1, Ia = SyntaxError), Ia;
}
var La, pt;
function In() {
  return pt || (pt = 1, La = TypeError), La;
}
var Da, lt;
function So() {
  return lt || (lt = 1, Da = URIError), Da;
}
var Fa, ut;
function Ao() {
  return ut || (ut = 1, Fa = Math.abs), Fa;
}
var Ua, dt;
function _o() {
  return dt || (dt = 1, Ua = Math.floor), Ua;
}
var qa, mt;
function Co() {
  return mt || (mt = 1, qa = Math.max), qa;
}
var Ba, ft;
function Oo() {
  return ft || (ft = 1, Ba = Math.min), Ba;
}
var Ma, xt;
function ko() {
  return xt || (xt = 1, Ma = Math.pow), Ma;
}
var za, ht;
function jo() {
  return ht || (ht = 1, za = Math.round), za;
}
var $a, vt;
function No() {
  return vt || (vt = 1, $a = Number.isNaN || function(e) {
    return e !== e;
  }), $a;
}
var Ha, bt;
function Po() {
  if (bt) return Ha;
  bt = 1;
  var a = /* @__PURE__ */ No();
  return Ha = function(n) {
    return a(n) || n === 0 ? n : n < 0 ? -1 : 1;
  }, Ha;
}
var Wa, gt;
function Io() {
  return gt || (gt = 1, Wa = Object.getOwnPropertyDescriptor), Wa;
}
var Ga, yt;
function zi() {
  if (yt) return Ga;
  yt = 1;
  var a = /* @__PURE__ */ Io();
  if (a)
    try {
      a([], "length");
    } catch {
      a = null;
    }
  return Ga = a, Ga;
}
var Va, wt;
function Lo() {
  if (wt) return Va;
  wt = 1;
  var a = Object.defineProperty || !1;
  if (a)
    try {
      a({}, "a", { value: 1 });
    } catch {
      a = !1;
    }
  return Va = a, Va;
}
var Ja, Et;
function $i() {
  return Et || (Et = 1, Ja = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var e = {}, n = /* @__PURE__ */ Symbol("test"), t = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(t) !== "[object Symbol]")
      return !1;
    var i = 42;
    e[n] = i;
    for (var o in e)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(e).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(e).length !== 0)
      return !1;
    var s = Object.getOwnPropertySymbols(e);
    if (s.length !== 1 || s[0] !== n || !Object.prototype.propertyIsEnumerable.call(e, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var r = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(e, n)
      );
      if (r.value !== i || r.enumerable !== !0)
        return !1;
    }
    return !0;
  }), Ja;
}
var Ka, Rt;
function Do() {
  if (Rt) return Ka;
  Rt = 1;
  var a = typeof Symbol < "u" && Symbol, e = $i();
  return Ka = function() {
    return typeof a != "function" || typeof Symbol != "function" || typeof a("foo") != "symbol" || typeof /* @__PURE__ */ Symbol("bar") != "symbol" ? !1 : e();
  }, Ka;
}
var Xa, Tt;
function Hi() {
  return Tt || (Tt = 1, Xa = typeof Reflect < "u" && Reflect.getPrototypeOf || null), Xa;
}
var Ya, St;
function Wi() {
  if (St) return Ya;
  St = 1;
  var a = /* @__PURE__ */ Mi();
  return Ya = a.getPrototypeOf || null, Ya;
}
var Za, At;
function Fo() {
  if (At) return Za;
  At = 1;
  var a = "Function.prototype.bind called on incompatible ", e = Object.prototype.toString, n = Math.max, t = "[object Function]", i = function(c, u) {
    for (var p = [], l = 0; l < c.length; l += 1)
      p[l] = c[l];
    for (var m = 0; m < u.length; m += 1)
      p[m + c.length] = u[m];
    return p;
  }, o = function(c, u) {
    for (var p = [], l = u, m = 0; l < c.length; l += 1, m += 1)
      p[m] = c[l];
    return p;
  }, s = function(r, c) {
    for (var u = "", p = 0; p < r.length; p += 1)
      u += r[p], p + 1 < r.length && (u += c);
    return u;
  };
  return Za = function(c) {
    var u = this;
    if (typeof u != "function" || e.apply(u) !== t)
      throw new TypeError(a + u);
    for (var p = o(arguments, 1), l, m = function() {
      if (this instanceof l) {
        var v = u.apply(
          this,
          i(p, arguments)
        );
        return Object(v) === v ? v : this;
      }
      return u.apply(
        c,
        i(p, arguments)
      );
    }, g = n(0, u.length - p.length), f = [], d = 0; d < g; d++)
      f[d] = "$" + d;
    if (l = Function("binder", "return function (" + s(f, ",") + "){ return binder.apply(this,arguments); }")(m), u.prototype) {
      var x = function() {
      };
      x.prototype = u.prototype, l.prototype = new x(), x.prototype = null;
    }
    return l;
  }, Za;
}
var Qa, _t;
function ua() {
  if (_t) return Qa;
  _t = 1;
  var a = Fo();
  return Qa = Function.prototype.bind || a, Qa;
}
var en, Ct;
function Ln() {
  return Ct || (Ct = 1, en = Function.prototype.call), en;
}
var an, Ot;
function Gi() {
  return Ot || (Ot = 1, an = Function.prototype.apply), an;
}
var nn, kt;
function Uo() {
  return kt || (kt = 1, nn = typeof Reflect < "u" && Reflect && Reflect.apply), nn;
}
var tn, jt;
function qo() {
  if (jt) return tn;
  jt = 1;
  var a = ua(), e = Gi(), n = Ln(), t = Uo();
  return tn = t || a.call(n, e), tn;
}
var sn, Nt;
function Bo() {
  if (Nt) return sn;
  Nt = 1;
  var a = ua(), e = /* @__PURE__ */ In(), n = Ln(), t = qo();
  return sn = function(o) {
    if (o.length < 1 || typeof o[0] != "function")
      throw new e("a function is required");
    return t(a, n, o);
  }, sn;
}
var on, Pt;
function Mo() {
  if (Pt) return on;
  Pt = 1;
  var a = Bo(), e = /* @__PURE__ */ zi(), n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (s) {
    if (!s || typeof s != "object" || !("code" in s) || s.code !== "ERR_PROTO_ACCESS")
      throw s;
  }
  var t = !!n && e && e(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), i = Object, o = i.getPrototypeOf;
  return on = t && typeof t.get == "function" ? a([t.get]) : typeof o == "function" ? (
    /** @type {import('./get')} */
    function(r) {
      return o(r == null ? r : i(r));
    }
  ) : !1, on;
}
var rn, It;
function zo() {
  if (It) return rn;
  It = 1;
  var a = Hi(), e = Wi(), n = /* @__PURE__ */ Mo();
  return rn = a ? function(i) {
    return a(i);
  } : e ? function(i) {
    if (!i || typeof i != "object" && typeof i != "function")
      throw new TypeError("getProto: not an object");
    return e(i);
  } : n ? function(i) {
    return n(i);
  } : null, rn;
}
var cn, Lt;
function Dn() {
  if (Lt) return cn;
  Lt = 1;
  var a = Function.prototype.call, e = Object.prototype.hasOwnProperty, n = ua();
  return cn = n.call(a, e), cn;
}
var pn, Dt;
function $o() {
  if (Dt) return pn;
  Dt = 1;
  var a, e = /* @__PURE__ */ Mi(), n = /* @__PURE__ */ yo(), t = /* @__PURE__ */ wo(), i = /* @__PURE__ */ Eo(), o = /* @__PURE__ */ Ro(), s = /* @__PURE__ */ To(), r = /* @__PURE__ */ In(), c = /* @__PURE__ */ So(), u = /* @__PURE__ */ Ao(), p = /* @__PURE__ */ _o(), l = /* @__PURE__ */ Co(), m = /* @__PURE__ */ Oo(), g = /* @__PURE__ */ ko(), f = /* @__PURE__ */ jo(), d = /* @__PURE__ */ Po(), x = Function, v = function(ne) {
    try {
      return x('"use strict"; return (' + ne + ").constructor;")();
    } catch {
    }
  }, E = /* @__PURE__ */ zi(), A = /* @__PURE__ */ Lo(), j = function() {
    throw new r();
  }, L = E ? (function() {
    try {
      return arguments.callee, j;
    } catch {
      try {
        return E(arguments, "callee").get;
      } catch {
        return j;
      }
    }
  })() : j, k = Do()(), _ = zo(), z = Wi(), V = Hi(), Q = Gi(), ee = Ln(), H = {}, J = typeof Uint8Array > "u" || !_ ? a : _(Uint8Array), X = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError > "u" ? a : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer > "u" ? a : ArrayBuffer,
    "%ArrayIteratorPrototype%": k && _ ? _([][Symbol.iterator]()) : a,
    "%AsyncFromSyncIteratorPrototype%": a,
    "%AsyncFunction%": H,
    "%AsyncGenerator%": H,
    "%AsyncGeneratorFunction%": H,
    "%AsyncIteratorPrototype%": H,
    "%Atomics%": typeof Atomics > "u" ? a : Atomics,
    "%BigInt%": typeof BigInt > "u" ? a : BigInt,
    "%BigInt64Array%": typeof BigInt64Array > "u" ? a : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array > "u" ? a : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView > "u" ? a : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": n,
    "%eval%": eval,
    // eslint-disable-line no-eval
    "%EvalError%": t,
    "%Float16Array%": typeof Float16Array > "u" ? a : Float16Array,
    "%Float32Array%": typeof Float32Array > "u" ? a : Float32Array,
    "%Float64Array%": typeof Float64Array > "u" ? a : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? a : FinalizationRegistry,
    "%Function%": x,
    "%GeneratorFunction%": H,
    "%Int8Array%": typeof Int8Array > "u" ? a : Int8Array,
    "%Int16Array%": typeof Int16Array > "u" ? a : Int16Array,
    "%Int32Array%": typeof Int32Array > "u" ? a : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": k && _ ? _(_([][Symbol.iterator]())) : a,
    "%JSON%": typeof JSON == "object" ? JSON : a,
    "%Map%": typeof Map > "u" ? a : Map,
    "%MapIteratorPrototype%": typeof Map > "u" || !k || !_ ? a : _((/* @__PURE__ */ new Map())[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": e,
    "%Object.getOwnPropertyDescriptor%": E,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise > "u" ? a : Promise,
    "%Proxy%": typeof Proxy > "u" ? a : Proxy,
    "%RangeError%": i,
    "%ReferenceError%": o,
    "%Reflect%": typeof Reflect > "u" ? a : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set > "u" ? a : Set,
    "%SetIteratorPrototype%": typeof Set > "u" || !k || !_ ? a : _((/* @__PURE__ */ new Set())[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? a : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": k && _ ? _(""[Symbol.iterator]()) : a,
    "%Symbol%": k ? Symbol : a,
    "%SyntaxError%": s,
    "%ThrowTypeError%": L,
    "%TypedArray%": J,
    "%TypeError%": r,
    "%Uint8Array%": typeof Uint8Array > "u" ? a : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? a : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array > "u" ? a : Uint16Array,
    "%Uint32Array%": typeof Uint32Array > "u" ? a : Uint32Array,
    "%URIError%": c,
    "%WeakMap%": typeof WeakMap > "u" ? a : WeakMap,
    "%WeakRef%": typeof WeakRef > "u" ? a : WeakRef,
    "%WeakSet%": typeof WeakSet > "u" ? a : WeakSet,
    "%Function.prototype.call%": ee,
    "%Function.prototype.apply%": Q,
    "%Object.defineProperty%": A,
    "%Object.getPrototypeOf%": z,
    "%Math.abs%": u,
    "%Math.floor%": p,
    "%Math.max%": l,
    "%Math.min%": m,
    "%Math.pow%": g,
    "%Math.round%": f,
    "%Math.sign%": d,
    "%Reflect.getPrototypeOf%": V
  };
  if (_)
    try {
      null.error;
    } catch (ne) {
      var re = _(_(ne));
      X["%Error.prototype%"] = re;
    }
  var b = function ne(I) {
    var Z;
    if (I === "%AsyncFunction%")
      Z = v("async function () {}");
    else if (I === "%GeneratorFunction%")
      Z = v("function* () {}");
    else if (I === "%AsyncGeneratorFunction%")
      Z = v("async function* () {}");
    else if (I === "%AsyncGenerator%") {
      var K = ne("%AsyncGeneratorFunction%");
      K && (Z = K.prototype);
    } else if (I === "%AsyncIteratorPrototype%") {
      var ae = ne("%AsyncGenerator%");
      ae && _ && (Z = _(ae.prototype));
    }
    return X[I] = Z, Z;
  }, y = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  }, w = ua(), N = /* @__PURE__ */ Dn(), S = w.call(ee, Array.prototype.concat), T = w.call(Q, Array.prototype.splice), P = w.call(ee, String.prototype.replace), $ = w.call(ee, String.prototype.slice), F = w.call(ee, RegExp.prototype.exec), U = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, D = /\\(\\)?/g, W = function(I) {
    var Z = $(I, 0, 1), K = $(I, -1);
    if (Z === "%" && K !== "%")
      throw new s("invalid intrinsic syntax, expected closing `%`");
    if (K === "%" && Z !== "%")
      throw new s("invalid intrinsic syntax, expected opening `%`");
    var ae = [];
    return P(I, U, function(de, Ae, te, ze) {
      ae[ae.length] = te ? P(ze, D, "$1") : Ae || de;
    }), ae;
  }, pe = function(I, Z) {
    var K = I, ae;
    if (N(y, K) && (ae = y[K], K = "%" + ae[0] + "%"), N(X, K)) {
      var de = X[K];
      if (de === H && (de = b(K)), typeof de > "u" && !Z)
        throw new r("intrinsic " + I + " exists, but is not available. Please file an issue!");
      return {
        alias: ae,
        name: K,
        value: de
      };
    }
    throw new s("intrinsic " + I + " does not exist!");
  };
  return pn = function(I, Z) {
    if (typeof I != "string" || I.length === 0)
      throw new r("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof Z != "boolean")
      throw new r('"allowMissing" argument must be a boolean');
    if (F(/^%?[^%]*%?$/, I) === null)
      throw new s("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    var K = W(I), ae = K.length > 0 ? K[0] : "", de = pe("%" + ae + "%", Z), Ae = de.name, te = de.value, ze = !1, xa = de.alias;
    xa && (ae = xa[0], T(K, S([0, 1], xa)));
    for (var $e = 1, je = !0; $e < K.length; $e += 1) {
      var fe = K[$e], He = $(fe, 0, 1), We = $(fe, -1);
      if ((He === '"' || He === "'" || He === "`" || We === '"' || We === "'" || We === "`") && He !== We)
        throw new s("property names with quotes must have matching quotes");
      if ((fe === "constructor" || !je) && (ze = !0), ae += "." + fe, Ae = "%" + ae + "%", N(X, Ae))
        te = X[Ae];
      else if (te != null) {
        if (!(fe in te)) {
          if (!Z)
            throw new r("base intrinsic for " + I + " exists, but the property is not available.");
          return;
        }
        if (E && $e + 1 >= K.length) {
          var Ge = E(te, fe);
          je = !!Ge, je && "get" in Ge && !("originalValue" in Ge.get) ? te = Ge.get : te = te[fe];
        } else
          je = N(te, fe), te = te[fe];
        je && !ze && (X[Ae] = te);
      }
    }
    return te;
  }, pn;
}
var ln, Ft;
function Ho() {
  if (Ft) return ln;
  Ft = 1;
  var a = $i();
  return ln = function() {
    return a() && !!Symbol.toStringTag;
  }, ln;
}
var un, Ut;
function Wo() {
  if (Ut) return un;
  Ut = 1;
  var a = /* @__PURE__ */ $o(), e = a("%Object.defineProperty%", !0), n = Ho()(), t = /* @__PURE__ */ Dn(), i = /* @__PURE__ */ In(), o = n ? Symbol.toStringTag : null;
  return un = function(r, c) {
    var u = arguments.length > 2 && !!arguments[2] && arguments[2].force, p = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
    if (typeof u < "u" && typeof u != "boolean" || typeof p < "u" && typeof p != "boolean")
      throw new i("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
    o && (u || !t(r, o)) && (e ? e(r, o, {
      configurable: !p,
      enumerable: !1,
      value: c,
      writable: !1
    }) : r[o] = c);
  }, un;
}
var dn, qt;
function Go() {
  return qt || (qt = 1, dn = function(a, e) {
    return Object.keys(e).forEach(function(n) {
      a[n] = a[n] || e[n];
    }), a;
  }), dn;
}
var mn, Bt;
function Vo() {
  if (Bt) return mn;
  Bt = 1;
  var a = uo(), e = Te, n = Ei, t = kn, i = jn, o = ra.parse, s = hs, r = ie.Stream, c = Ri, u = xo(), p = go(), l = /* @__PURE__ */ Wo(), m = /* @__PURE__ */ Dn(), g = Go();
  function f(d) {
    if (!(this instanceof f))
      return new f(d);
    this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], a.call(this), d = d || {};
    for (var x in d)
      this[x] = d[x];
  }
  return e.inherits(f, a), f.LINE_BREAK = `\r
`, f.DEFAULT_CONTENT_TYPE = "application/octet-stream", f.prototype.append = function(d, x, v) {
    v = v || {}, typeof v == "string" && (v = { filename: v });
    var E = a.prototype.append.bind(this);
    if ((typeof x == "number" || x == null) && (x = String(x)), Array.isArray(x)) {
      this._error(new Error("Arrays are not supported."));
      return;
    }
    var A = this._multiPartHeader(d, x, v), j = this._multiPartFooter();
    E(A), E(x), E(j), this._trackLength(A, x, v);
  }, f.prototype._trackLength = function(d, x, v) {
    var E = 0;
    v.knownLength != null ? E += Number(v.knownLength) : Buffer.isBuffer(x) ? E = x.length : typeof x == "string" && (E = Buffer.byteLength(x)), this._valueLength += E, this._overheadLength += Buffer.byteLength(d) + f.LINE_BREAK.length, !(!x || !x.path && !(x.readable && m(x, "httpVersion")) && !(x instanceof r)) && (v.knownLength || this._valuesToMeasure.push(x));
  }, f.prototype._lengthRetriever = function(d, x) {
    m(d, "fd") ? d.end != null && d.end != 1 / 0 && d.start != null ? x(null, d.end + 1 - (d.start ? d.start : 0)) : s.stat(d.path, function(v, E) {
      if (v) {
        x(v);
        return;
      }
      var A = E.size - (d.start ? d.start : 0);
      x(null, A);
    }) : m(d, "httpVersion") ? x(null, Number(d.headers["content-length"])) : m(d, "httpModule") ? (d.on("response", function(v) {
      d.pause(), x(null, Number(v.headers["content-length"]));
    }), d.resume()) : x("Unknown stream");
  }, f.prototype._multiPartHeader = function(d, x, v) {
    if (typeof v.header == "string")
      return v.header;
    var E = this._getContentDisposition(x, v), A = this._getContentType(x, v), j = "", L = {
      // add custom disposition as third element or keep it two elements if not
      "Content-Disposition": ["form-data", 'name="' + d + '"'].concat(E || []),
      // if no content type. allow it to be empty array
      "Content-Type": [].concat(A || [])
    };
    typeof v.header == "object" && g(L, v.header);
    var k;
    for (var _ in L)
      if (m(L, _)) {
        if (k = L[_], k == null)
          continue;
        Array.isArray(k) || (k = [k]), k.length && (j += _ + ": " + k.join("; ") + f.LINE_BREAK);
      }
    return "--" + this.getBoundary() + f.LINE_BREAK + j + f.LINE_BREAK;
  }, f.prototype._getContentDisposition = function(d, x) {
    var v;
    if (typeof x.filepath == "string" ? v = n.normalize(x.filepath).replace(/\\/g, "/") : x.filename || d && (d.name || d.path) ? v = n.basename(x.filename || d && (d.name || d.path)) : d && d.readable && m(d, "httpVersion") && (v = n.basename(d.client._httpMessage.path || "")), v)
      return 'filename="' + v + '"';
  }, f.prototype._getContentType = function(d, x) {
    var v = x.contentType;
    return !v && d && d.name && (v = u.lookup(d.name)), !v && d && d.path && (v = u.lookup(d.path)), !v && d && d.readable && m(d, "httpVersion") && (v = d.headers["content-type"]), !v && (x.filepath || x.filename) && (v = u.lookup(x.filepath || x.filename)), !v && d && typeof d == "object" && (v = f.DEFAULT_CONTENT_TYPE), v;
  }, f.prototype._multiPartFooter = function() {
    return (function(d) {
      var x = f.LINE_BREAK, v = this._streams.length === 0;
      v && (x += this._lastBoundary()), d(x);
    }).bind(this);
  }, f.prototype._lastBoundary = function() {
    return "--" + this.getBoundary() + "--" + f.LINE_BREAK;
  }, f.prototype.getHeaders = function(d) {
    var x, v = {
      "content-type": "multipart/form-data; boundary=" + this.getBoundary()
    };
    for (x in d)
      m(d, x) && (v[x.toLowerCase()] = d[x]);
    return v;
  }, f.prototype.setBoundary = function(d) {
    if (typeof d != "string")
      throw new TypeError("FormData boundary must be a string");
    this._boundary = d;
  }, f.prototype.getBoundary = function() {
    return this._boundary || this._generateBoundary(), this._boundary;
  }, f.prototype.getBuffer = function() {
    for (var d = new Buffer.alloc(0), x = this.getBoundary(), v = 0, E = this._streams.length; v < E; v++)
      typeof this._streams[v] != "function" && (Buffer.isBuffer(this._streams[v]) ? d = Buffer.concat([d, this._streams[v]]) : d = Buffer.concat([d, Buffer.from(this._streams[v])]), (typeof this._streams[v] != "string" || this._streams[v].substring(2, x.length + 2) !== x) && (d = Buffer.concat([d, Buffer.from(f.LINE_BREAK)])));
    return Buffer.concat([d, Buffer.from(this._lastBoundary())]);
  }, f.prototype._generateBoundary = function() {
    this._boundary = "--------------------------" + c.randomBytes(12).toString("hex");
  }, f.prototype.getLengthSync = function() {
    var d = this._overheadLength + this._valueLength;
    return this._streams.length && (d += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), d;
  }, f.prototype.hasKnownLength = function() {
    var d = !0;
    return this._valuesToMeasure.length && (d = !1), d;
  }, f.prototype.getLength = function(d) {
    var x = this._overheadLength + this._valueLength;
    if (this._streams.length && (x += this._lastBoundary().length), !this._valuesToMeasure.length) {
      process.nextTick(d.bind(this, null, x));
      return;
    }
    p.parallel(this._valuesToMeasure, this._lengthRetriever, function(v, E) {
      if (v) {
        d(v);
        return;
      }
      E.forEach(function(A) {
        x += A;
      }), d(null, x);
    });
  }, f.prototype.submit = function(d, x) {
    var v, E, A = { method: "post" };
    return typeof d == "string" ? (d = o(d), E = g({
      port: d.port,
      path: d.pathname,
      host: d.hostname,
      protocol: d.protocol
    }, A)) : (E = g(d, A), E.port || (E.port = E.protocol === "https:" ? 443 : 80)), E.headers = this.getHeaders(d.headers), E.protocol === "https:" ? v = i.request(E) : v = t.request(E), this.getLength((function(j, L) {
      if (j && j !== "Unknown stream") {
        this._error(j);
        return;
      }
      if (L && v.setHeader("Content-Length", L), this.pipe(v), x) {
        var k, _ = function(z, V) {
          return v.removeListener("error", _), v.removeListener("response", k), x.call(this, z, V);
        };
        k = _.bind(this, null), v.on("error", _), v.on("response", k);
      }
    }).bind(this)), v;
  }, f.prototype._error = function(d) {
    this.error || (this.error = d, this.pause(), this.emit("error", d));
  }, f.prototype.toString = function() {
    return "[object FormData]";
  }, l(f.prototype, "FormData"), mn = f, mn;
}
var Jo = Vo();
const Vi = /* @__PURE__ */ Pn(Jo);
function An(a) {
  return h.isPlainObject(a) || h.isArray(a);
}
function Ji(a) {
  return h.endsWith(a, "[]") ? a.slice(0, -2) : a;
}
function Mt(a, e, n) {
  return a ? a.concat(e).map(function(i, o) {
    return i = Ji(i), !n && o ? "[" + i + "]" : i;
  }).join(n ? "." : "") : e;
}
function Ko(a) {
  return h.isArray(a) && !a.some(An);
}
const Xo = h.toFlatObject(h, {}, null, function(e) {
  return /^is[A-Z]/.test(e);
});
function da(a, e, n) {
  if (!h.isObject(a))
    throw new TypeError("target must be an object");
  e = e || new (Vi || FormData)(), n = h.toFlatObject(n, {
    metaTokens: !0,
    dots: !1,
    indexes: !1
  }, !1, function(d, x) {
    return !h.isUndefined(x[d]);
  });
  const t = n.metaTokens, i = n.visitor || p, o = n.dots, s = n.indexes, c = (n.Blob || typeof Blob < "u" && Blob) && h.isSpecCompliantForm(e);
  if (!h.isFunction(i))
    throw new TypeError("visitor must be a function");
  function u(f) {
    if (f === null) return "";
    if (h.isDate(f))
      return f.toISOString();
    if (h.isBoolean(f))
      return f.toString();
    if (!c && h.isBlob(f))
      throw new R("Blob is not supported. Use a Buffer instead.");
    return h.isArrayBuffer(f) || h.isTypedArray(f) ? c && typeof Blob == "function" ? new Blob([f]) : Buffer.from(f) : f;
  }
  function p(f, d, x) {
    let v = f;
    if (f && !x && typeof f == "object") {
      if (h.endsWith(d, "{}"))
        d = t ? d : d.slice(0, -2), f = JSON.stringify(f);
      else if (h.isArray(f) && Ko(f) || (h.isFileList(f) || h.endsWith(d, "[]")) && (v = h.toArray(f)))
        return d = Ji(d), v.forEach(function(A, j) {
          !(h.isUndefined(A) || A === null) && e.append(
            // eslint-disable-next-line no-nested-ternary
            s === !0 ? Mt([d], j, o) : s === null ? d : d + "[]",
            u(A)
          );
        }), !1;
    }
    return An(f) ? !0 : (e.append(Mt(x, d, o), u(f)), !1);
  }
  const l = [], m = Object.assign(Xo, {
    defaultVisitor: p,
    convertValue: u,
    isVisitable: An
  });
  function g(f, d) {
    if (!h.isUndefined(f)) {
      if (l.indexOf(f) !== -1)
        throw Error("Circular reference detected in " + d.join("."));
      l.push(f), h.forEach(f, function(v, E) {
        (!(h.isUndefined(v) || v === null) && i.call(
          e,
          v,
          h.isString(E) ? E.trim() : E,
          d,
          m
        )) === !0 && g(v, d ? d.concat(E) : [E]);
      }), l.pop();
    }
  }
  if (!h.isObject(a))
    throw new TypeError("data must be an object");
  return g(a), e;
}
function zt(a) {
  const e = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(a).replace(/[!'()~]|%20|%00/g, function(t) {
    return e[t];
  });
}
function Ki(a, e) {
  this._pairs = [], a && da(a, this, e);
}
const Xi = Ki.prototype;
Xi.append = function(e, n) {
  this._pairs.push([e, n]);
};
Xi.toString = function(e) {
  const n = e ? function(t) {
    return e.call(this, t, zt);
  } : zt;
  return this._pairs.map(function(i) {
    return n(i[0]) + "=" + n(i[1]);
  }, "").join("&");
};
function Yo(a) {
  return encodeURIComponent(a).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function Fn(a, e, n) {
  if (!e)
    return a;
  const t = n && n.encode || Yo, i = h.isFunction(n) ? {
    serialize: n
  } : n, o = i && i.serialize;
  let s;
  if (o ? s = o(e, i) : s = h.isURLSearchParams(e) ? e.toString() : new Ki(e, i).toString(t), s) {
    const r = a.indexOf("#");
    r !== -1 && (a = a.slice(0, r)), a += (a.indexOf("?") === -1 ? "?" : "&") + s;
  }
  return a;
}
class $t {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(e, n, t) {
    return this.handlers.push({
      fulfilled: e,
      rejected: n,
      synchronous: t ? t.synchronous : !1,
      runWhen: t ? t.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(e) {
    this.handlers[e] && (this.handlers[e] = null);
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    this.handlers && (this.handlers = []);
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(e) {
    h.forEach(this.handlers, function(t) {
      t !== null && e(t);
    });
  }
}
const ma = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1,
  legacyInterceptorReqResOrdering: !0
}, Zo = ra.URLSearchParams, fn = "abcdefghijklmnopqrstuvwxyz", Ht = "0123456789", Yi = {
  DIGIT: Ht,
  ALPHA: fn,
  ALPHA_DIGIT: fn + fn.toUpperCase() + Ht
}, Qo = (a = 16, e = Yi.ALPHA_DIGIT) => {
  let n = "";
  const { length: t } = e, i = new Uint32Array(a);
  Ri.randomFillSync(i);
  for (let o = 0; o < a; o++)
    n += e[i[o] % t];
  return n;
}, er = {
  isNode: !0,
  classes: {
    URLSearchParams: Zo,
    FormData: Vi,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: Yi,
  generateString: Qo,
  protocols: ["http", "https", "file", "data"]
}, Un = typeof window < "u" && typeof document < "u", _n = typeof navigator == "object" && navigator || void 0, ar = Un && (!_n || ["ReactNative", "NativeScript", "NS"].indexOf(_n.product) < 0), nr = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", tr = Un && window.location.href || "http://localhost", ir = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: Un,
  hasStandardBrowserEnv: ar,
  hasStandardBrowserWebWorkerEnv: nr,
  navigator: _n,
  origin: tr
}, Symbol.toStringTag, { value: "Module" })), G = {
  ...ir,
  ...er
};
function sr(a, e) {
  return da(a, new G.classes.URLSearchParams(), {
    visitor: function(n, t, i, o) {
      return G.isNode && h.isBuffer(n) ? (this.append(t, n.toString("base64")), !1) : o.defaultVisitor.apply(this, arguments);
    },
    ...e
  });
}
function or(a) {
  return h.matchAll(/\w+|\[(\w*)]/g, a).map((e) => e[0] === "[]" ? "" : e[1] || e[0]);
}
function rr(a) {
  const e = {}, n = Object.keys(a);
  let t;
  const i = n.length;
  let o;
  for (t = 0; t < i; t++)
    o = n[t], e[o] = a[o];
  return e;
}
function Zi(a) {
  function e(n, t, i, o) {
    let s = n[o++];
    if (s === "__proto__") return !0;
    const r = Number.isFinite(+s), c = o >= n.length;
    return s = !s && h.isArray(i) ? i.length : s, c ? (h.hasOwnProp(i, s) ? i[s] = [i[s], t] : i[s] = t, !r) : ((!i[s] || !h.isObject(i[s])) && (i[s] = []), e(n, t, i[s], o) && h.isArray(i[s]) && (i[s] = rr(i[s])), !r);
  }
  if (h.isFormData(a) && h.isFunction(a.entries)) {
    const n = {};
    return h.forEachEntry(a, (t, i) => {
      e(or(t), i, n, 0);
    }), n;
  }
  return null;
}
function cr(a, e, n) {
  if (h.isString(a))
    try {
      return (e || JSON.parse)(a), h.trim(a);
    } catch (t) {
      if (t.name !== "SyntaxError")
        throw t;
    }
  return (n || JSON.stringify)(a);
}
const Be = {
  transitional: ma,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function(e, n) {
    const t = n.getContentType() || "", i = t.indexOf("application/json") > -1, o = h.isObject(e);
    if (o && h.isHTMLForm(e) && (e = new FormData(e)), h.isFormData(e))
      return i ? JSON.stringify(Zi(e)) : e;
    if (h.isArrayBuffer(e) || h.isBuffer(e) || h.isStream(e) || h.isFile(e) || h.isBlob(e) || h.isReadableStream(e))
      return e;
    if (h.isArrayBufferView(e))
      return e.buffer;
    if (h.isURLSearchParams(e))
      return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
    let r;
    if (o) {
      if (t.indexOf("application/x-www-form-urlencoded") > -1)
        return sr(e, this.formSerializer).toString();
      if ((r = h.isFileList(e)) || t.indexOf("multipart/form-data") > -1) {
        const c = this.env && this.env.FormData;
        return da(
          r ? { "files[]": e } : e,
          c && new c(),
          this.formSerializer
        );
      }
    }
    return o || i ? (n.setContentType("application/json", !1), cr(e)) : e;
  }],
  transformResponse: [function(e) {
    const n = this.transitional || Be.transitional, t = n && n.forcedJSONParsing, i = this.responseType === "json";
    if (h.isResponse(e) || h.isReadableStream(e))
      return e;
    if (e && h.isString(e) && (t && !this.responseType || i)) {
      const s = !(n && n.silentJSONParsing) && i;
      try {
        return JSON.parse(e, this.parseReviver);
      } catch (r) {
        if (s)
          throw r.name === "SyntaxError" ? R.from(r, R.ERR_BAD_RESPONSE, this, null, this.response) : r;
      }
    }
    return e;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: G.classes.FormData,
    Blob: G.classes.Blob
  },
  validateStatus: function(e) {
    return e >= 200 && e < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
h.forEach(["delete", "get", "head", "post", "put", "patch"], (a) => {
  Be.headers[a] = {};
});
const pr = h.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]), lr = (a) => {
  const e = {};
  let n, t, i;
  return a && a.split(`
`).forEach(function(s) {
    i = s.indexOf(":"), n = s.substring(0, i).trim().toLowerCase(), t = s.substring(i + 1).trim(), !(!n || e[n] && pr[n]) && (n === "set-cookie" ? e[n] ? e[n].push(t) : e[n] = [t] : e[n] = e[n] ? e[n] + ", " + t : t);
  }), e;
}, Wt = /* @__PURE__ */ Symbol("internals");
function Pe(a) {
  return a && String(a).trim().toLowerCase();
}
function Qe(a) {
  return a === !1 || a == null ? a : h.isArray(a) ? a.map(Qe) : String(a);
}
function ur(a) {
  const e = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let t;
  for (; t = n.exec(a); )
    e[t[1]] = t[2];
  return e;
}
const dr = (a) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(a.trim());
function xn(a, e, n, t, i) {
  if (h.isFunction(t))
    return t.call(this, e, n);
  if (i && (e = n), !!h.isString(e)) {
    if (h.isString(t))
      return e.indexOf(t) !== -1;
    if (h.isRegExp(t))
      return t.test(e);
  }
}
function mr(a) {
  return a.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, n, t) => n.toUpperCase() + t);
}
function fr(a, e) {
  const n = h.toCamelCase(" " + e);
  ["get", "set", "has"].forEach((t) => {
    Object.defineProperty(a, t + n, {
      value: function(i, o, s) {
        return this[t].call(this, e, i, o, s);
      },
      configurable: !0
    });
  });
}
let Y = class {
  constructor(e) {
    e && this.set(e);
  }
  set(e, n, t) {
    const i = this;
    function o(r, c, u) {
      const p = Pe(c);
      if (!p)
        throw new Error("header name must be a non-empty string");
      const l = h.findKey(i, p);
      (!l || i[l] === void 0 || u === !0 || u === void 0 && i[l] !== !1) && (i[l || c] = Qe(r));
    }
    const s = (r, c) => h.forEach(r, (u, p) => o(u, p, c));
    if (h.isPlainObject(e) || e instanceof this.constructor)
      s(e, n);
    else if (h.isString(e) && (e = e.trim()) && !dr(e))
      s(lr(e), n);
    else if (h.isObject(e) && h.isIterable(e)) {
      let r = {}, c, u;
      for (const p of e) {
        if (!h.isArray(p))
          throw TypeError("Object iterator must return a key-value pair");
        r[u = p[0]] = (c = r[u]) ? h.isArray(c) ? [...c, p[1]] : [c, p[1]] : p[1];
      }
      s(r, n);
    } else
      e != null && o(n, e, t);
    return this;
  }
  get(e, n) {
    if (e = Pe(e), e) {
      const t = h.findKey(this, e);
      if (t) {
        const i = this[t];
        if (!n)
          return i;
        if (n === !0)
          return ur(i);
        if (h.isFunction(n))
          return n.call(this, i, t);
        if (h.isRegExp(n))
          return n.exec(i);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(e, n) {
    if (e = Pe(e), e) {
      const t = h.findKey(this, e);
      return !!(t && this[t] !== void 0 && (!n || xn(this, this[t], t, n)));
    }
    return !1;
  }
  delete(e, n) {
    const t = this;
    let i = !1;
    function o(s) {
      if (s = Pe(s), s) {
        const r = h.findKey(t, s);
        r && (!n || xn(t, t[r], r, n)) && (delete t[r], i = !0);
      }
    }
    return h.isArray(e) ? e.forEach(o) : o(e), i;
  }
  clear(e) {
    const n = Object.keys(this);
    let t = n.length, i = !1;
    for (; t--; ) {
      const o = n[t];
      (!e || xn(this, this[o], o, e, !0)) && (delete this[o], i = !0);
    }
    return i;
  }
  normalize(e) {
    const n = this, t = {};
    return h.forEach(this, (i, o) => {
      const s = h.findKey(t, o);
      if (s) {
        n[s] = Qe(i), delete n[o];
        return;
      }
      const r = e ? mr(o) : String(o).trim();
      r !== o && delete n[o], n[r] = Qe(i), t[r] = !0;
    }), this;
  }
  concat(...e) {
    return this.constructor.concat(this, ...e);
  }
  toJSON(e) {
    const n = /* @__PURE__ */ Object.create(null);
    return h.forEach(this, (t, i) => {
      t != null && t !== !1 && (n[i] = e && h.isArray(t) ? t.join(", ") : t);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([e, n]) => e + ": " + n).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(e) {
    return e instanceof this ? e : new this(e);
  }
  static concat(e, ...n) {
    const t = new this(e);
    return n.forEach((i) => t.set(i)), t;
  }
  static accessor(e) {
    const t = (this[Wt] = this[Wt] = {
      accessors: {}
    }).accessors, i = this.prototype;
    function o(s) {
      const r = Pe(s);
      t[r] || (fr(i, s), t[r] = !0);
    }
    return h.isArray(e) ? e.forEach(o) : o(e), this;
  }
};
Y.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
h.reduceDescriptors(Y.prototype, ({ value: a }, e) => {
  let n = e[0].toUpperCase() + e.slice(1);
  return {
    get: () => a,
    set(t) {
      this[n] = t;
    }
  };
});
h.freezeMethods(Y);
function hn(a, e) {
  const n = this || Be, t = e || n, i = Y.from(t.headers);
  let o = t.data;
  return h.forEach(a, function(r) {
    o = r.call(n, o, i.normalize(), e ? e.status : void 0);
  }), i.normalize(), o;
}
function Qi(a) {
  return !!(a && a.__CANCEL__);
}
let Ee = class extends R {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(e, n, t) {
    super(e ?? "canceled", R.ERR_CANCELED, n, t), this.name = "CanceledError", this.__CANCEL__ = !0;
  }
};
function _e(a, e, n) {
  const t = n.config.validateStatus;
  !n.status || !t || t(n.status) ? a(n) : e(new R(
    "Request failed with status code " + n.status,
    [R.ERR_BAD_REQUEST, R.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],
    n.config,
    n.request,
    n
  ));
}
function xr(a) {
  return typeof a != "string" ? !1 : /^([a-z][a-z\d+\-.]*:)?\/\//i.test(a);
}
function hr(a, e) {
  return e ? a.replace(/\/?\/$/, "") + "/" + e.replace(/^\/+/, "") : a;
}
function qn(a, e, n) {
  let t = !xr(e);
  return a && (t || n == !1) ? hr(a, e) : e;
}
var vn = {}, Gt;
function vr() {
  if (Gt) return vn;
  Gt = 1;
  var a = ra.parse, e = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443
  }, n = String.prototype.endsWith || function(s) {
    return s.length <= this.length && this.indexOf(s, this.length - s.length) !== -1;
  };
  function t(s) {
    var r = typeof s == "string" ? a(s) : s || {}, c = r.protocol, u = r.host, p = r.port;
    if (typeof u != "string" || !u || typeof c != "string" || (c = c.split(":", 1)[0], u = u.replace(/:\d*$/, ""), p = parseInt(p) || e[c] || 0, !i(u, p)))
      return "";
    var l = o("npm_config_" + c + "_proxy") || o(c + "_proxy") || o("npm_config_proxy") || o("all_proxy");
    return l && l.indexOf("://") === -1 && (l = c + "://" + l), l;
  }
  function i(s, r) {
    var c = (o("npm_config_no_proxy") || o("no_proxy")).toLowerCase();
    return c ? c === "*" ? !1 : c.split(/[,\s]/).every(function(u) {
      if (!u)
        return !0;
      var p = u.match(/^(.+):(\d+)$/), l = p ? p[1] : u, m = p ? parseInt(p[2]) : 0;
      return m && m !== r ? !0 : /^[.*]/.test(l) ? (l.charAt(0) === "*" && (l = l.slice(1)), !n.call(s, l)) : s !== l;
    }) : !0;
  }
  function o(s) {
    return process.env[s.toLowerCase()] || process.env[s.toUpperCase()] || "";
  }
  return vn.getProxyForUrl = t, vn;
}
var br = vr();
const gr = /* @__PURE__ */ Pn(br);
var Ve = { exports: {} }, Je = { exports: {} }, Ke = { exports: {} }, bn, Vt;
function yr() {
  if (Vt) return bn;
  Vt = 1;
  var a = 1e3, e = a * 60, n = e * 60, t = n * 24, i = t * 7, o = t * 365.25;
  bn = function(p, l) {
    l = l || {};
    var m = typeof p;
    if (m === "string" && p.length > 0)
      return s(p);
    if (m === "number" && isFinite(p))
      return l.long ? c(p) : r(p);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(p)
    );
  };
  function s(p) {
    if (p = String(p), !(p.length > 100)) {
      var l = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        p
      );
      if (l) {
        var m = parseFloat(l[1]), g = (l[2] || "ms").toLowerCase();
        switch (g) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return m * o;
          case "weeks":
          case "week":
          case "w":
            return m * i;
          case "days":
          case "day":
          case "d":
            return m * t;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return m * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return m * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return m * a;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return m;
          default:
            return;
        }
      }
    }
  }
  function r(p) {
    var l = Math.abs(p);
    return l >= t ? Math.round(p / t) + "d" : l >= n ? Math.round(p / n) + "h" : l >= e ? Math.round(p / e) + "m" : l >= a ? Math.round(p / a) + "s" : p + "ms";
  }
  function c(p) {
    var l = Math.abs(p);
    return l >= t ? u(p, l, t, "day") : l >= n ? u(p, l, n, "hour") : l >= e ? u(p, l, e, "minute") : l >= a ? u(p, l, a, "second") : p + " ms";
  }
  function u(p, l, m, g) {
    var f = l >= m * 1.5;
    return Math.round(p / m) + " " + g + (f ? "s" : "");
  }
  return bn;
}
var gn, Jt;
function es() {
  if (Jt) return gn;
  Jt = 1;
  function a(e) {
    t.debug = t, t.default = t, t.coerce = u, t.disable = r, t.enable = o, t.enabled = c, t.humanize = yr(), t.destroy = p, Object.keys(e).forEach((l) => {
      t[l] = e[l];
    }), t.names = [], t.skips = [], t.formatters = {};
    function n(l) {
      let m = 0;
      for (let g = 0; g < l.length; g++)
        m = (m << 5) - m + l.charCodeAt(g), m |= 0;
      return t.colors[Math.abs(m) % t.colors.length];
    }
    t.selectColor = n;
    function t(l) {
      let m, g = null, f, d;
      function x(...v) {
        if (!x.enabled)
          return;
        const E = x, A = Number(/* @__PURE__ */ new Date()), j = A - (m || A);
        E.diff = j, E.prev = m, E.curr = A, m = A, v[0] = t.coerce(v[0]), typeof v[0] != "string" && v.unshift("%O");
        let L = 0;
        v[0] = v[0].replace(/%([a-zA-Z%])/g, (_, z) => {
          if (_ === "%%")
            return "%";
          L++;
          const V = t.formatters[z];
          if (typeof V == "function") {
            const Q = v[L];
            _ = V.call(E, Q), v.splice(L, 1), L--;
          }
          return _;
        }), t.formatArgs.call(E, v), (E.log || t.log).apply(E, v);
      }
      return x.namespace = l, x.useColors = t.useColors(), x.color = t.selectColor(l), x.extend = i, x.destroy = t.destroy, Object.defineProperty(x, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => g !== null ? g : (f !== t.namespaces && (f = t.namespaces, d = t.enabled(l)), d),
        set: (v) => {
          g = v;
        }
      }), typeof t.init == "function" && t.init(x), x;
    }
    function i(l, m) {
      const g = t(this.namespace + (typeof m > "u" ? ":" : m) + l);
      return g.log = this.log, g;
    }
    function o(l) {
      t.save(l), t.namespaces = l, t.names = [], t.skips = [];
      const m = (typeof l == "string" ? l : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const g of m)
        g[0] === "-" ? t.skips.push(g.slice(1)) : t.names.push(g);
    }
    function s(l, m) {
      let g = 0, f = 0, d = -1, x = 0;
      for (; g < l.length; )
        if (f < m.length && (m[f] === l[g] || m[f] === "*"))
          m[f] === "*" ? (d = f, x = g, f++) : (g++, f++);
        else if (d !== -1)
          f = d + 1, x++, g = x;
        else
          return !1;
      for (; f < m.length && m[f] === "*"; )
        f++;
      return f === m.length;
    }
    function r() {
      const l = [
        ...t.names,
        ...t.skips.map((m) => "-" + m)
      ].join(",");
      return t.enable(""), l;
    }
    function c(l) {
      for (const m of t.skips)
        if (s(l, m))
          return !1;
      for (const m of t.names)
        if (s(l, m))
          return !0;
      return !1;
    }
    function u(l) {
      return l instanceof Error ? l.stack || l.message : l;
    }
    function p() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return t.enable(t.load()), t;
  }
  return gn = a, gn;
}
var Kt;
function wr() {
  return Kt || (Kt = 1, (function(a, e) {
    e.formatArgs = t, e.save = i, e.load = o, e.useColors = n, e.storage = s(), e.destroy = /* @__PURE__ */ (() => {
      let c = !1;
      return () => {
        c || (c = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let c;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (c = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(c[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function t(c) {
      if (c[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + c[0] + (this.useColors ? "%c " : " ") + "+" + a.exports.humanize(this.diff), !this.useColors)
        return;
      const u = "color: " + this.color;
      c.splice(1, 0, u, "color: inherit");
      let p = 0, l = 0;
      c[0].replace(/%[a-zA-Z%]/g, (m) => {
        m !== "%%" && (p++, m === "%c" && (l = p));
      }), c.splice(l, 0, u);
    }
    e.log = console.debug || console.log || (() => {
    });
    function i(c) {
      try {
        c ? e.storage.setItem("debug", c) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function o() {
      let c;
      try {
        c = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !c && typeof process < "u" && "env" in process && (c = process.env.DEBUG), c;
    }
    function s() {
      try {
        return localStorage;
      } catch {
      }
    }
    a.exports = es()(e);
    const { formatters: r } = a.exports;
    r.j = function(c) {
      try {
        return JSON.stringify(c);
      } catch (u) {
        return "[UnexpectedJSONParseError]: " + u.message;
      }
    };
  })(Ke, Ke.exports)), Ke.exports;
}
var Xe = { exports: {} }, yn, Xt;
function Er() {
  return Xt || (Xt = 1, yn = (a, e = process.argv) => {
    const n = a.startsWith("-") ? "" : a.length === 1 ? "-" : "--", t = e.indexOf(n + a), i = e.indexOf("--");
    return t !== -1 && (i === -1 || t < i);
  }), yn;
}
var wn, Yt;
function Rr() {
  if (Yt) return wn;
  Yt = 1;
  const a = bs, e = Si, n = Er(), { env: t } = process;
  let i;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? i = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (i = 1), "FORCE_COLOR" in t && (t.FORCE_COLOR === "true" ? i = 1 : t.FORCE_COLOR === "false" ? i = 0 : i = t.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(t.FORCE_COLOR, 10), 3));
  function o(c) {
    return c === 0 ? !1 : {
      level: c,
      hasBasic: !0,
      has256: c >= 2,
      has16m: c >= 3
    };
  }
  function s(c, u) {
    if (i === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (c && !u && i === void 0)
      return 0;
    const p = i || 0;
    if (t.TERM === "dumb")
      return p;
    if (process.platform === "win32") {
      const l = a.release().split(".");
      return Number(l[0]) >= 10 && Number(l[2]) >= 10586 ? Number(l[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in t)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((l) => l in t) || t.CI_NAME === "codeship" ? 1 : p;
    if ("TEAMCITY_VERSION" in t)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(t.TEAMCITY_VERSION) ? 1 : 0;
    if (t.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in t) {
      const l = parseInt((t.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (t.TERM_PROGRAM) {
        case "iTerm.app":
          return l >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(t.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(t.TERM) || "COLORTERM" in t ? 1 : p;
  }
  function r(c) {
    const u = s(c, c && c.isTTY);
    return o(u);
  }
  return wn = {
    supportsColor: r,
    stdout: o(s(!0, e.isatty(1))),
    stderr: o(s(!0, e.isatty(2)))
  }, wn;
}
var Zt;
function Tr() {
  return Zt || (Zt = 1, (function(a, e) {
    const n = Si, t = Te;
    e.init = p, e.log = r, e.formatArgs = o, e.save = c, e.load = u, e.useColors = i, e.destroy = t.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), e.colors = [6, 2, 3, 4, 5, 1];
    try {
      const m = Rr();
      m && (m.stderr || m).level >= 2 && (e.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    e.inspectOpts = Object.keys(process.env).filter((m) => /^debug_/i.test(m)).reduce((m, g) => {
      const f = g.substring(6).toLowerCase().replace(/_([a-z])/g, (x, v) => v.toUpperCase());
      let d = process.env[g];
      return /^(yes|on|true|enabled)$/i.test(d) ? d = !0 : /^(no|off|false|disabled)$/i.test(d) ? d = !1 : d === "null" ? d = null : d = Number(d), m[f] = d, m;
    }, {});
    function i() {
      return "colors" in e.inspectOpts ? !!e.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function o(m) {
      const { namespace: g, useColors: f } = this;
      if (f) {
        const d = this.color, x = "\x1B[3" + (d < 8 ? d : "8;5;" + d), v = `  ${x};1m${g} \x1B[0m`;
        m[0] = v + m[0].split(`
`).join(`
` + v), m.push(x + "m+" + a.exports.humanize(this.diff) + "\x1B[0m");
      } else
        m[0] = s() + g + " " + m[0];
    }
    function s() {
      return e.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function r(...m) {
      return process.stderr.write(t.formatWithOptions(e.inspectOpts, ...m) + `
`);
    }
    function c(m) {
      m ? process.env.DEBUG = m : delete process.env.DEBUG;
    }
    function u() {
      return process.env.DEBUG;
    }
    function p(m) {
      m.inspectOpts = {};
      const g = Object.keys(e.inspectOpts);
      for (let f = 0; f < g.length; f++)
        m.inspectOpts[g[f]] = e.inspectOpts[g[f]];
    }
    a.exports = es()(e);
    const { formatters: l } = a.exports;
    l.o = function(m) {
      return this.inspectOpts.colors = this.useColors, t.inspect(m, this.inspectOpts).split(`
`).map((g) => g.trim()).join(" ");
    }, l.O = function(m) {
      return this.inspectOpts.colors = this.useColors, t.inspect(m, this.inspectOpts);
    };
  })(Xe, Xe.exports)), Xe.exports;
}
var Qt;
function Sr() {
  return Qt || (Qt = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? Je.exports = wr() : Je.exports = Tr()), Je.exports;
}
var En, ei;
function Ar() {
  if (ei) return En;
  ei = 1;
  var a;
  return En = function() {
    if (!a) {
      try {
        a = Sr()("follow-redirects");
      } catch {
      }
      typeof a != "function" && (a = function() {
      });
    }
    a.apply(null, arguments);
  }, En;
}
var ai;
function _r() {
  if (ai) return Ve.exports;
  ai = 1;
  var a = ra, e = a.URL, n = kn, t = jn, i = ie.Writable, o = vs, s = Ar();
  (function() {
    var y = typeof process < "u", w = typeof window < "u" && typeof document < "u", N = J(Error.captureStackTrace);
    !y && (w || !N) && console.warn("The follow-redirects package should be excluded from browser builds.");
  })();
  var r = !1;
  try {
    o(new e(""));
  } catch (b) {
    r = b.code === "ERR_INVALID_URL";
  }
  var c = [
    "auth",
    "host",
    "hostname",
    "href",
    "path",
    "pathname",
    "port",
    "protocol",
    "query",
    "search",
    "hash"
  ], u = ["abort", "aborted", "connect", "error", "socket", "timeout"], p = /* @__PURE__ */ Object.create(null);
  u.forEach(function(b) {
    p[b] = function(y, w, N) {
      this._redirectable.emit(b, y, w, N);
    };
  });
  var l = V(
    "ERR_INVALID_URL",
    "Invalid URL",
    TypeError
  ), m = V(
    "ERR_FR_REDIRECTION_FAILURE",
    "Redirected request failed"
  ), g = V(
    "ERR_FR_TOO_MANY_REDIRECTS",
    "Maximum number of redirects exceeded",
    m
  ), f = V(
    "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
    "Request body larger than maxBodyLength limit"
  ), d = V(
    "ERR_STREAM_WRITE_AFTER_END",
    "write after end"
  ), x = i.prototype.destroy || A;
  function v(b, y) {
    i.call(this), this._sanitizeOptions(b), this._options = b, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], y && this.on("response", y);
    var w = this;
    this._onNativeResponse = function(N) {
      try {
        w._processResponse(N);
      } catch (S) {
        w.emit("error", S instanceof m ? S : new m({ cause: S }));
      }
    }, this._performRequest();
  }
  v.prototype = Object.create(i.prototype), v.prototype.abort = function() {
    Q(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
  }, v.prototype.destroy = function(b) {
    return Q(this._currentRequest, b), x.call(this, b), this;
  }, v.prototype.write = function(b, y, w) {
    if (this._ending)
      throw new d();
    if (!H(b) && !X(b))
      throw new TypeError("data should be a string, Buffer or Uint8Array");
    if (J(y) && (w = y, y = null), b.length === 0) {
      w && w();
      return;
    }
    this._requestBodyLength + b.length <= this._options.maxBodyLength ? (this._requestBodyLength += b.length, this._requestBodyBuffers.push({ data: b, encoding: y }), this._currentRequest.write(b, y, w)) : (this.emit("error", new f()), this.abort());
  }, v.prototype.end = function(b, y, w) {
    if (J(b) ? (w = b, b = y = null) : J(y) && (w = y, y = null), !b)
      this._ended = this._ending = !0, this._currentRequest.end(null, null, w);
    else {
      var N = this, S = this._currentRequest;
      this.write(b, y, function() {
        N._ended = !0, S.end(null, null, w);
      }), this._ending = !0;
    }
  }, v.prototype.setHeader = function(b, y) {
    this._options.headers[b] = y, this._currentRequest.setHeader(b, y);
  }, v.prototype.removeHeader = function(b) {
    delete this._options.headers[b], this._currentRequest.removeHeader(b);
  }, v.prototype.setTimeout = function(b, y) {
    var w = this;
    function N(P) {
      P.setTimeout(b), P.removeListener("timeout", P.destroy), P.addListener("timeout", P.destroy);
    }
    function S(P) {
      w._timeout && clearTimeout(w._timeout), w._timeout = setTimeout(function() {
        w.emit("timeout"), T();
      }, b), N(P);
    }
    function T() {
      w._timeout && (clearTimeout(w._timeout), w._timeout = null), w.removeListener("abort", T), w.removeListener("error", T), w.removeListener("response", T), w.removeListener("close", T), y && w.removeListener("timeout", y), w.socket || w._currentRequest.removeListener("socket", S);
    }
    return y && this.on("timeout", y), this.socket ? S(this.socket) : this._currentRequest.once("socket", S), this.on("socket", N), this.on("abort", T), this.on("error", T), this.on("response", T), this.on("close", T), this;
  }, [
    "flushHeaders",
    "getHeader",
    "setNoDelay",
    "setSocketKeepAlive"
  ].forEach(function(b) {
    v.prototype[b] = function(y, w) {
      return this._currentRequest[b](y, w);
    };
  }), ["aborted", "connection", "socket"].forEach(function(b) {
    Object.defineProperty(v.prototype, b, {
      get: function() {
        return this._currentRequest[b];
      }
    });
  }), v.prototype._sanitizeOptions = function(b) {
    if (b.headers || (b.headers = {}), b.host && (b.hostname || (b.hostname = b.host), delete b.host), !b.pathname && b.path) {
      var y = b.path.indexOf("?");
      y < 0 ? b.pathname = b.path : (b.pathname = b.path.substring(0, y), b.search = b.path.substring(y));
    }
  }, v.prototype._performRequest = function() {
    var b = this._options.protocol, y = this._options.nativeProtocols[b];
    if (!y)
      throw new TypeError("Unsupported protocol " + b);
    if (this._options.agents) {
      var w = b.slice(0, -1);
      this._options.agent = this._options.agents[w];
    }
    var N = this._currentRequest = y.request(this._options, this._onNativeResponse);
    N._redirectable = this;
    for (var S of u)
      N.on(S, p[S]);
    if (this._currentUrl = /^\//.test(this._options.path) ? a.format(this._options) : (
      // When making a request to a proxy, […]
      // a client MUST send the target URI in absolute-form […].
      this._options.path
    ), this._isRedirect) {
      var T = 0, P = this, $ = this._requestBodyBuffers;
      (function F(U) {
        if (N === P._currentRequest)
          if (U)
            P.emit("error", U);
          else if (T < $.length) {
            var D = $[T++];
            N.finished || N.write(D.data, D.encoding, F);
          } else P._ended && N.end();
      })();
    }
  }, v.prototype._processResponse = function(b) {
    var y = b.statusCode;
    this._options.trackRedirects && this._redirects.push({
      url: this._currentUrl,
      headers: b.headers,
      statusCode: y
    });
    var w = b.headers.location;
    if (!w || this._options.followRedirects === !1 || y < 300 || y >= 400) {
      b.responseUrl = this._currentUrl, b.redirects = this._redirects, this.emit("response", b), this._requestBodyBuffers = [];
      return;
    }
    if (Q(this._currentRequest), b.destroy(), ++this._redirectCount > this._options.maxRedirects)
      throw new g();
    var N, S = this._options.beforeRedirect;
    S && (N = Object.assign({
      // The Host header was set by nativeProtocol.request
      Host: b.req.getHeader("host")
    }, this._options.headers));
    var T = this._options.method;
    ((y === 301 || y === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
    // the server is redirecting the user agent to a different resource […]
    // A user agent can perform a retrieval request targeting that URI
    // (a GET or HEAD request if using HTTP) […]
    y === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], z(/^content-/i, this._options.headers));
    var P = z(/^host$/i, this._options.headers), $ = j(this._currentUrl), F = P || $.host, U = /^\w+:/.test(w) ? this._currentUrl : a.format(Object.assign($, { host: F })), D = L(w, U);
    if (s("redirecting to", D.href), this._isRedirect = !0, _(D, this._options), (D.protocol !== $.protocol && D.protocol !== "https:" || D.host !== F && !ee(D.host, F)) && z(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers), J(S)) {
      var W = {
        headers: b.headers,
        statusCode: y
      }, pe = {
        url: U,
        method: T,
        headers: N
      };
      S(this._options, W, pe), this._sanitizeOptions(this._options);
    }
    this._performRequest();
  };
  function E(b) {
    var y = {
      maxRedirects: 21,
      maxBodyLength: 10485760
    }, w = {};
    return Object.keys(b).forEach(function(N) {
      var S = N + ":", T = w[S] = b[N], P = y[N] = Object.create(T);
      function $(U, D, W) {
        return re(U) ? U = _(U) : H(U) ? U = _(j(U)) : (W = D, D = k(U), U = { protocol: S }), J(D) && (W = D, D = null), D = Object.assign({
          maxRedirects: y.maxRedirects,
          maxBodyLength: y.maxBodyLength
        }, U, D), D.nativeProtocols = w, !H(D.host) && !H(D.hostname) && (D.hostname = "::1"), o.equal(D.protocol, S, "protocol mismatch"), s("options", D), new v(D, W);
      }
      function F(U, D, W) {
        var pe = P.request(U, D, W);
        return pe.end(), pe;
      }
      Object.defineProperties(P, {
        request: { value: $, configurable: !0, enumerable: !0, writable: !0 },
        get: { value: F, configurable: !0, enumerable: !0, writable: !0 }
      });
    }), y;
  }
  function A() {
  }
  function j(b) {
    var y;
    if (r)
      y = new e(b);
    else if (y = k(a.parse(b)), !H(y.protocol))
      throw new l({ input: b });
    return y;
  }
  function L(b, y) {
    return r ? new e(b, y) : j(a.resolve(y, b));
  }
  function k(b) {
    if (/^\[/.test(b.hostname) && !/^\[[:0-9a-f]+\]$/i.test(b.hostname))
      throw new l({ input: b.href || b });
    if (/^\[/.test(b.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(b.host))
      throw new l({ input: b.href || b });
    return b;
  }
  function _(b, y) {
    var w = y || {};
    for (var N of c)
      w[N] = b[N];
    return w.hostname.startsWith("[") && (w.hostname = w.hostname.slice(1, -1)), w.port !== "" && (w.port = Number(w.port)), w.path = w.search ? w.pathname + w.search : w.pathname, w;
  }
  function z(b, y) {
    var w;
    for (var N in y)
      b.test(N) && (w = y[N], delete y[N]);
    return w === null || typeof w > "u" ? void 0 : String(w).trim();
  }
  function V(b, y, w) {
    function N(S) {
      J(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, S || {}), this.code = b, this.message = this.cause ? y + ": " + this.cause.message : y;
    }
    return N.prototype = new (w || Error)(), Object.defineProperties(N.prototype, {
      constructor: {
        value: N,
        enumerable: !1
      },
      name: {
        value: "Error [" + b + "]",
        enumerable: !1
      }
    }), N;
  }
  function Q(b, y) {
    for (var w of u)
      b.removeListener(w, p[w]);
    b.on("error", A), b.destroy(y);
  }
  function ee(b, y) {
    o(H(b) && H(y));
    var w = b.length - y.length - 1;
    return w > 0 && b[w] === "." && b.endsWith(y);
  }
  function H(b) {
    return typeof b == "string" || b instanceof String;
  }
  function J(b) {
    return typeof b == "function";
  }
  function X(b) {
    return typeof b == "object" && "length" in b;
  }
  function re(b) {
    return e && b instanceof e;
  }
  return Ve.exports = E({ http: n, https: t }), Ve.exports.wrap = E, Ve.exports;
}
var Cr = _r();
const Or = /* @__PURE__ */ Pn(Cr), aa = "1.13.5";
function as(a) {
  const e = /^([-+\w]{1,25})(:?\/\/|:)/.exec(a);
  return e && e[1] || "";
}
const kr = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function jr(a, e, n) {
  const t = n && n.Blob || G.classes.Blob, i = as(a);
  if (e === void 0 && t && (e = !0), i === "data") {
    a = i.length ? a.slice(i.length + 1) : a;
    const o = kr.exec(a);
    if (!o)
      throw new R("Invalid URL", R.ERR_INVALID_URL);
    const s = o[1], r = o[2], c = o[3], u = Buffer.from(decodeURIComponent(c), r ? "base64" : "utf8");
    if (e) {
      if (!t)
        throw new R("Blob is not supported", R.ERR_NOT_SUPPORT);
      return new t([u], { type: s });
    }
    return u;
  }
  throw new R("Unsupported protocol " + i, R.ERR_NOT_SUPPORT);
}
const Rn = /* @__PURE__ */ Symbol("internals");
class ni extends ie.Transform {
  constructor(e) {
    e = h.toFlatObject(e, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (t, i) => !h.isUndefined(i[t])), super({
      readableHighWaterMark: e.chunkSize
    });
    const n = this[Rn] = {
      timeWindow: e.timeWindow,
      chunkSize: e.chunkSize,
      maxRate: e.maxRate,
      minChunkSize: e.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (t) => {
      t === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(e) {
    const n = this[Rn];
    return n.onReadCallback && n.onReadCallback(), super._read(e);
  }
  _transform(e, n, t) {
    const i = this[Rn], o = i.maxRate, s = this.readableHighWaterMark, r = i.timeWindow, c = 1e3 / r, u = o / c, p = i.minChunkSize !== !1 ? Math.max(i.minChunkSize, u * 0.01) : 0, l = (g, f) => {
      const d = Buffer.byteLength(g);
      i.bytesSeen += d, i.bytes += d, i.isCaptured && this.emit("progress", i.bytesSeen), this.push(g) ? process.nextTick(f) : i.onReadCallback = () => {
        i.onReadCallback = null, process.nextTick(f);
      };
    }, m = (g, f) => {
      const d = Buffer.byteLength(g);
      let x = null, v = s, E, A = 0;
      if (o) {
        const j = Date.now();
        (!i.ts || (A = j - i.ts) >= r) && (i.ts = j, E = u - i.bytes, i.bytes = E < 0 ? -E : 0, A = 0), E = u - i.bytes;
      }
      if (o) {
        if (E <= 0)
          return setTimeout(() => {
            f(null, g);
          }, r - A);
        E < v && (v = E);
      }
      v && d > v && d - v > p && (x = g.subarray(v), g = g.subarray(0, v)), l(g, x ? () => {
        process.nextTick(f, null, x);
      } : f);
    };
    m(e, function g(f, d) {
      if (f)
        return t(f);
      d ? m(d, g) : t(null);
    });
  }
}
const { asyncIterator: ti } = Symbol, ns = async function* (a) {
  a.stream ? yield* a.stream() : a.arrayBuffer ? yield await a.arrayBuffer() : a[ti] ? yield* a[ti]() : yield a;
}, Nr = G.ALPHABET.ALPHA_DIGIT + "-_", Le = typeof TextEncoder == "function" ? new TextEncoder() : new Te.TextEncoder(), ye = `\r
`, Pr = Le.encode(ye), Ir = 2;
class Lr {
  constructor(e, n) {
    const { escapeName: t } = this.constructor, i = h.isString(n);
    let o = `Content-Disposition: form-data; name="${t(e)}"${!i && n.name ? `; filename="${t(n.name)}"` : ""}${ye}`;
    i ? n = Le.encode(String(n).replace(/\r?\n|\r\n?/g, ye)) : o += `Content-Type: ${n.type || "application/octet-stream"}${ye}`, this.headers = Le.encode(o + ye), this.contentLength = i ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + Ir, this.name = e, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: e } = this;
    h.isTypedArray(e) ? yield e : yield* ns(e), yield Pr;
  }
  static escapeName(e) {
    return String(e).replace(/[\r\n"]/g, (n) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[n]);
  }
}
const Dr = (a, e, n) => {
  const {
    tag: t = "form-data-boundary",
    size: i = 25,
    boundary: o = t + "-" + G.generateString(i, Nr)
  } = n || {};
  if (!h.isFormData(a))
    throw TypeError("FormData instance required");
  if (o.length < 1 || o.length > 70)
    throw Error("boundary must be 10-70 characters long");
  const s = Le.encode("--" + o + ye), r = Le.encode("--" + o + "--" + ye);
  let c = r.byteLength;
  const u = Array.from(a.entries()).map(([l, m]) => {
    const g = new Lr(l, m);
    return c += g.size, g;
  });
  c += s.byteLength * u.length, c = h.toFiniteNumber(c);
  const p = {
    "Content-Type": `multipart/form-data; boundary=${o}`
  };
  return Number.isFinite(c) && (p["Content-Length"] = c), e && e(p), xs.from((async function* () {
    for (const l of u)
      yield s, yield* l.encode();
    yield r;
  })());
};
class Fr extends ie.Transform {
  __transform(e, n, t) {
    this.push(e), t();
  }
  _transform(e, n, t) {
    if (e.length !== 0 && (this._transform = this.__transform, e[0] !== 120)) {
      const i = Buffer.alloc(2);
      i[0] = 120, i[1] = 156, this.push(i, n);
    }
    this.__transform(e, n, t);
  }
}
const Ur = (a, e) => h.isAsyncFn(a) ? function(...n) {
  const t = n.pop();
  a.apply(this, n).then((i) => {
    try {
      e ? t(null, ...e(i)) : t(null, i);
    } catch (o) {
      t(o);
    }
  }, t);
} : a;
function qr(a, e) {
  a = a || 10;
  const n = new Array(a), t = new Array(a);
  let i = 0, o = 0, s;
  return e = e !== void 0 ? e : 1e3, function(c) {
    const u = Date.now(), p = t[o];
    s || (s = u), n[i] = c, t[i] = u;
    let l = o, m = 0;
    for (; l !== i; )
      m += n[l++], l = l % a;
    if (i = (i + 1) % a, i === o && (o = (o + 1) % a), u - s < e)
      return;
    const g = p && u - p;
    return g ? Math.round(m * 1e3 / g) : void 0;
  };
}
function Br(a, e) {
  let n = 0, t = 1e3 / e, i, o;
  const s = (u, p = Date.now()) => {
    n = p, i = null, o && (clearTimeout(o), o = null), a(...u);
  };
  return [(...u) => {
    const p = Date.now(), l = p - n;
    l >= t ? s(u, p) : (i = u, o || (o = setTimeout(() => {
      o = null, s(i);
    }, t - l)));
  }, () => i && s(i)];
}
const Oe = (a, e, n = 3) => {
  let t = 0;
  const i = qr(50, 250);
  return Br((o) => {
    const s = o.loaded, r = o.lengthComputable ? o.total : void 0, c = s - t, u = i(c), p = s <= r;
    t = s;
    const l = {
      loaded: s,
      total: r,
      progress: r ? s / r : void 0,
      bytes: c,
      rate: u || void 0,
      estimated: u && r && p ? (r - s) / u : void 0,
      event: o,
      lengthComputable: r != null,
      [e ? "download" : "upload"]: !0
    };
    a(l);
  }, n);
}, na = (a, e) => {
  const n = a != null;
  return [(t) => e[0]({
    lengthComputable: n,
    total: a,
    loaded: t
  }), e[1]];
}, ta = (a) => (...e) => h.asap(() => a(...e));
function Mr(a) {
  if (!a || typeof a != "string" || !a.startsWith("data:")) return 0;
  const e = a.indexOf(",");
  if (e < 0) return 0;
  const n = a.slice(5, e), t = a.slice(e + 1);
  if (/;base64/i.test(n)) {
    let o = t.length;
    const s = t.length;
    for (let m = 0; m < s; m++)
      if (t.charCodeAt(m) === 37 && m + 2 < s) {
        const g = t.charCodeAt(m + 1), f = t.charCodeAt(m + 2);
        (g >= 48 && g <= 57 || g >= 65 && g <= 70 || g >= 97 && g <= 102) && (f >= 48 && f <= 57 || f >= 65 && f <= 70 || f >= 97 && f <= 102) && (o -= 2, m += 2);
      }
    let r = 0, c = s - 1;
    const u = (m) => m >= 2 && t.charCodeAt(m - 2) === 37 && // '%'
    t.charCodeAt(m - 1) === 51 && // '3'
    (t.charCodeAt(m) === 68 || t.charCodeAt(m) === 100);
    c >= 0 && (t.charCodeAt(c) === 61 ? (r++, c--) : u(c) && (r++, c -= 3)), r === 1 && c >= 0 && (t.charCodeAt(c) === 61 || u(c)) && r++;
    const l = Math.floor(o / 4) * 3 - (r || 0);
    return l > 0 ? l : 0;
  }
  return Buffer.byteLength(t, "utf8");
}
const ii = {
  flush: be.constants.Z_SYNC_FLUSH,
  finishFlush: be.constants.Z_SYNC_FLUSH
}, zr = {
  flush: be.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: be.constants.BROTLI_OPERATION_FLUSH
}, si = h.isFunction(be.createBrotliDecompress), { http: $r, https: Hr } = Or, Wr = /https:?/, oi = G.protocols.map((a) => a + ":"), ri = (a, [e, n]) => (a.on("end", n).on("error", n), e);
class Gr {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(e, n) {
    n = Object.assign({
      sessionTimeout: 1e3
    }, n);
    let t = this.sessions[e];
    if (t) {
      let p = t.length;
      for (let l = 0; l < p; l++) {
        const [m, g] = t[l];
        if (!m.destroyed && !m.closed && Te.isDeepStrictEqual(g, n))
          return m;
      }
    }
    const i = Ti.connect(e, n);
    let o;
    const s = () => {
      if (o)
        return;
      o = !0;
      let p = t, l = p.length, m = l;
      for (; m--; )
        if (p[m][0] === i) {
          l === 1 ? delete this.sessions[e] : p.splice(m, 1);
          return;
        }
    }, r = i.request, { sessionTimeout: c } = n;
    if (c != null) {
      let p, l = 0;
      i.request = function() {
        const m = r.apply(this, arguments);
        return l++, p && (clearTimeout(p), p = null), m.once("close", () => {
          --l || (p = setTimeout(() => {
            p = null, s();
          }, c));
        }), m;
      };
    }
    i.once("close", s);
    let u = [
      i,
      n
    ];
    return t ? t.push(u) : t = this.sessions[e] = [u], i;
  }
}
const Vr = new Gr();
function Jr(a, e) {
  a.beforeRedirects.proxy && a.beforeRedirects.proxy(a), a.beforeRedirects.config && a.beforeRedirects.config(a, e);
}
function ts(a, e, n) {
  let t = e;
  if (!t && t !== !1) {
    const i = gr.getProxyForUrl(n);
    i && (t = new URL(i));
  }
  if (t) {
    if (t.username && (t.auth = (t.username || "") + ":" + (t.password || "")), t.auth) {
      if (!!(t.auth.username || t.auth.password))
        t.auth = (t.auth.username || "") + ":" + (t.auth.password || "");
      else if (typeof t.auth == "object")
        throw new R("Invalid proxy authorization", R.ERR_BAD_OPTION, { proxy: t });
      const s = Buffer.from(t.auth, "utf8").toString("base64");
      a.headers["Proxy-Authorization"] = "Basic " + s;
    }
    a.headers.host = a.hostname + (a.port ? ":" + a.port : "");
    const i = t.hostname || t.host;
    a.hostname = i, a.host = i, a.port = t.port, a.path = n, t.protocol && (a.protocol = t.protocol.includes(":") ? t.protocol : `${t.protocol}:`);
  }
  a.beforeRedirects.proxy = function(o) {
    ts(o, e, o.href);
  };
}
const Kr = typeof process < "u" && h.kindOf(process) === "process", Xr = (a) => new Promise((e, n) => {
  let t, i;
  const o = (c, u) => {
    i || (i = !0, t && t(c, u));
  }, s = (c) => {
    o(c), e(c);
  }, r = (c) => {
    o(c, !0), n(c);
  };
  a(s, r, (c) => t = c).catch(r);
}), Yr = ({ address: a, family: e }) => {
  if (!h.isString(a))
    throw TypeError("address must be a string");
  return {
    address: a,
    family: e || (a.indexOf(".") < 0 ? 6 : 4)
  };
}, ci = (a, e) => Yr(h.isObject(a) ? a : { address: a, family: e }), Zr = {
  request(a, e) {
    const n = a.protocol + "//" + a.hostname + ":" + (a.port || (a.protocol === "https:" ? 443 : 80)), { http2Options: t, headers: i } = a, o = Vr.getSession(n, t), {
      HTTP2_HEADER_SCHEME: s,
      HTTP2_HEADER_METHOD: r,
      HTTP2_HEADER_PATH: c,
      HTTP2_HEADER_STATUS: u
    } = Ti.constants, p = {
      [s]: a.protocol.replace(":", ""),
      [r]: a.method,
      [c]: a.path
    };
    h.forEach(i, (m, g) => {
      g.charAt(0) !== ":" && (p[g] = m);
    });
    const l = o.request(p);
    return l.once("response", (m) => {
      const g = l;
      m = Object.assign({}, m);
      const f = m[u];
      delete m[u], g.headers = m, g.statusCode = +f, e(g);
    }), l;
  }
}, Qr = Kr && function(e) {
  return Xr(async function(t, i, o) {
    let { data: s, lookup: r, family: c, httpVersion: u = 1, http2Options: p } = e;
    const { responseType: l, responseEncoding: m } = e, g = e.method.toUpperCase();
    let f, d = !1, x;
    if (u = +u, Number.isNaN(u))
      throw TypeError(`Invalid protocol version: '${e.httpVersion}' is not a number`);
    if (u !== 1 && u !== 2)
      throw TypeError(`Unsupported protocol version '${u}'`);
    const v = u === 2;
    if (r) {
      const S = Ur(r, (T) => h.isArray(T) ? T : [T]);
      r = (T, P, $) => {
        S(T, P, (F, U, D) => {
          if (F)
            return $(F);
          const W = h.isArray(U) ? U.map((pe) => ci(pe)) : [ci(U, D)];
          P.all ? $(F, W) : $(F, W[0].address, W[0].family);
        });
      };
    }
    const E = new gs();
    function A(S) {
      try {
        E.emit("abort", !S || S.type ? new Ee(null, e, x) : S);
      } catch (T) {
        console.warn("emit error", T);
      }
    }
    E.once("abort", i);
    const j = () => {
      e.cancelToken && e.cancelToken.unsubscribe(A), e.signal && e.signal.removeEventListener("abort", A), E.removeAllListeners();
    };
    (e.cancelToken || e.signal) && (e.cancelToken && e.cancelToken.subscribe(A), e.signal && (e.signal.aborted ? A() : e.signal.addEventListener("abort", A))), o((S, T) => {
      if (f = !0, T) {
        d = !0, j();
        return;
      }
      const { data: P } = S;
      if (P instanceof ie.Readable || P instanceof ie.Duplex) {
        const $ = ie.finished(P, () => {
          $(), j();
        });
      } else
        j();
    });
    const L = qn(e.baseURL, e.url, e.allowAbsoluteUrls), k = new URL(L, G.hasBrowserEnv ? G.origin : void 0), _ = k.protocol || oi[0];
    if (_ === "data:") {
      if (e.maxContentLength > -1) {
        const T = String(e.url || L || "");
        if (Mr(T) > e.maxContentLength)
          return i(new R(
            "maxContentLength size of " + e.maxContentLength + " exceeded",
            R.ERR_BAD_RESPONSE,
            e
          ));
      }
      let S;
      if (g !== "GET")
        return _e(t, i, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: e
        });
      try {
        S = jr(e.url, l === "blob", {
          Blob: e.env && e.env.Blob
        });
      } catch (T) {
        throw R.from(T, R.ERR_BAD_REQUEST, e);
      }
      return l === "text" ? (S = S.toString(m), (!m || m === "utf8") && (S = h.stripBOM(S))) : l === "stream" && (S = ie.Readable.from(S)), _e(t, i, {
        data: S,
        status: 200,
        statusText: "OK",
        headers: new Y(),
        config: e
      });
    }
    if (oi.indexOf(_) === -1)
      return i(new R(
        "Unsupported protocol " + _,
        R.ERR_BAD_REQUEST,
        e
      ));
    const z = Y.from(e.headers).normalize();
    z.set("User-Agent", "axios/" + aa, !1);
    const { onUploadProgress: V, onDownloadProgress: Q } = e, ee = e.maxRate;
    let H, J;
    if (h.isSpecCompliantForm(s)) {
      const S = z.getContentType(/boundary=([-_\w\d]{10,70})/i);
      s = Dr(s, (T) => {
        z.set(T);
      }, {
        tag: `axios-${aa}-boundary`,
        boundary: S && S[1] || void 0
      });
    } else if (h.isFormData(s) && h.isFunction(s.getHeaders)) {
      if (z.set(s.getHeaders()), !z.hasContentLength())
        try {
          const S = await Te.promisify(s.getLength).call(s);
          Number.isFinite(S) && S >= 0 && z.setContentLength(S);
        } catch {
        }
    } else if (h.isBlob(s) || h.isFile(s))
      s.size && z.setContentType(s.type || "application/octet-stream"), z.setContentLength(s.size || 0), s = ie.Readable.from(ns(s));
    else if (s && !h.isStream(s)) {
      if (!Buffer.isBuffer(s)) if (h.isArrayBuffer(s))
        s = Buffer.from(new Uint8Array(s));
      else if (h.isString(s))
        s = Buffer.from(s, "utf-8");
      else
        return i(new R(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          R.ERR_BAD_REQUEST,
          e
        ));
      if (z.setContentLength(s.length, !1), e.maxBodyLength > -1 && s.length > e.maxBodyLength)
        return i(new R(
          "Request body larger than maxBodyLength limit",
          R.ERR_BAD_REQUEST,
          e
        ));
    }
    const X = h.toFiniteNumber(z.getContentLength());
    h.isArray(ee) ? (H = ee[0], J = ee[1]) : H = J = ee, s && (V || H) && (h.isStream(s) || (s = ie.Readable.from(s, { objectMode: !1 })), s = ie.pipeline([s, new ni({
      maxRate: h.toFiniteNumber(H)
    })], h.noop), V && s.on("progress", ri(
      s,
      na(
        X,
        Oe(ta(V), !1, 3)
      )
    )));
    let re;
    if (e.auth) {
      const S = e.auth.username || "", T = e.auth.password || "";
      re = S + ":" + T;
    }
    if (!re && k.username) {
      const S = k.username, T = k.password;
      re = S + ":" + T;
    }
    re && z.delete("authorization");
    let b;
    try {
      b = Fn(
        k.pathname + k.search,
        e.params,
        e.paramsSerializer
      ).replace(/^\?/, "");
    } catch (S) {
      const T = new Error(S.message);
      return T.config = e, T.url = e.url, T.exists = !0, i(T);
    }
    z.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (si ? ", br" : ""),
      !1
    );
    const y = {
      path: b,
      method: g,
      headers: z.toJSON(),
      agents: { http: e.httpAgent, https: e.httpsAgent },
      auth: re,
      protocol: _,
      family: c,
      beforeRedirect: Jr,
      beforeRedirects: {},
      http2Options: p
    };
    !h.isUndefined(r) && (y.lookup = r), e.socketPath ? y.socketPath = e.socketPath : (y.hostname = k.hostname.startsWith("[") ? k.hostname.slice(1, -1) : k.hostname, y.port = k.port, ts(y, e.proxy, _ + "//" + k.hostname + (k.port ? ":" + k.port : "") + y.path));
    let w;
    const N = Wr.test(y.protocol);
    if (y.agent = N ? e.httpsAgent : e.httpAgent, v ? w = Zr : e.transport ? w = e.transport : e.maxRedirects === 0 ? w = N ? jn : kn : (e.maxRedirects && (y.maxRedirects = e.maxRedirects), e.beforeRedirect && (y.beforeRedirects.config = e.beforeRedirect), w = N ? Hr : $r), e.maxBodyLength > -1 ? y.maxBodyLength = e.maxBodyLength : y.maxBodyLength = 1 / 0, e.insecureHTTPParser && (y.insecureHTTPParser = e.insecureHTTPParser), x = w.request(y, function(T) {
      if (x.destroyed) return;
      const P = [T], $ = h.toFiniteNumber(T.headers["content-length"]);
      if (Q || J) {
        const W = new ni({
          maxRate: h.toFiniteNumber(J)
        });
        Q && W.on("progress", ri(
          W,
          na(
            $,
            Oe(ta(Q), !0, 3)
          )
        )), P.push(W);
      }
      let F = T;
      const U = T.req || x;
      if (e.decompress !== !1 && T.headers["content-encoding"])
        switch ((g === "HEAD" || T.statusCode === 204) && delete T.headers["content-encoding"], (T.headers["content-encoding"] || "").toLowerCase()) {
          /*eslint default-case:0*/
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            P.push(be.createUnzip(ii)), delete T.headers["content-encoding"];
            break;
          case "deflate":
            P.push(new Fr()), P.push(be.createUnzip(ii)), delete T.headers["content-encoding"];
            break;
          case "br":
            si && (P.push(be.createBrotliDecompress(zr)), delete T.headers["content-encoding"]);
        }
      F = P.length > 1 ? ie.pipeline(P, h.noop) : P[0];
      const D = {
        status: T.statusCode,
        statusText: T.statusMessage,
        headers: new Y(T.headers),
        config: e,
        request: U
      };
      if (l === "stream")
        D.data = F, _e(t, i, D);
      else {
        const W = [];
        let pe = 0;
        F.on("data", function(I) {
          W.push(I), pe += I.length, e.maxContentLength > -1 && pe > e.maxContentLength && (d = !0, F.destroy(), A(new R(
            "maxContentLength size of " + e.maxContentLength + " exceeded",
            R.ERR_BAD_RESPONSE,
            e,
            U
          )));
        }), F.on("aborted", function() {
          if (d)
            return;
          const I = new R(
            "stream has been aborted",
            R.ERR_BAD_RESPONSE,
            e,
            U
          );
          F.destroy(I), i(I);
        }), F.on("error", function(I) {
          x.destroyed || i(R.from(I, null, e, U));
        }), F.on("end", function() {
          try {
            let I = W.length === 1 ? W[0] : Buffer.concat(W);
            l !== "arraybuffer" && (I = I.toString(m), (!m || m === "utf8") && (I = h.stripBOM(I))), D.data = I;
          } catch (I) {
            return i(R.from(I, null, e, D.request, D));
          }
          _e(t, i, D);
        });
      }
      E.once("abort", (W) => {
        F.destroyed || (F.emit("error", W), F.destroy());
      });
    }), E.once("abort", (S) => {
      x.close ? x.close() : x.destroy(S);
    }), x.on("error", function(T) {
      i(R.from(T, null, e, x));
    }), x.on("socket", function(T) {
      T.setKeepAlive(!0, 1e3 * 60);
    }), e.timeout) {
      const S = parseInt(e.timeout, 10);
      if (Number.isNaN(S)) {
        A(new R(
          "error trying to parse `config.timeout` to int",
          R.ERR_BAD_OPTION_VALUE,
          e,
          x
        ));
        return;
      }
      x.setTimeout(S, function() {
        if (f) return;
        let P = e.timeout ? "timeout of " + e.timeout + "ms exceeded" : "timeout exceeded";
        const $ = e.transitional || ma;
        e.timeoutErrorMessage && (P = e.timeoutErrorMessage), A(new R(
          P,
          $.clarifyTimeoutError ? R.ETIMEDOUT : R.ECONNABORTED,
          e,
          x
        ));
      });
    } else
      x.setTimeout(0);
    if (h.isStream(s)) {
      let S = !1, T = !1;
      s.on("end", () => {
        S = !0;
      }), s.once("error", (P) => {
        T = !0, x.destroy(P);
      }), s.on("close", () => {
        !S && !T && A(new Ee("Request stream has been aborted", e, x));
      }), s.pipe(x);
    } else
      s && x.write(s), x.end();
  });
}, ec = G.hasStandardBrowserEnv ? /* @__PURE__ */ ((a, e) => (n) => (n = new URL(n, G.origin), a.protocol === n.protocol && a.host === n.host && (e || a.port === n.port)))(
  new URL(G.origin),
  G.navigator && /(msie|trident)/i.test(G.navigator.userAgent)
) : () => !0, ac = G.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(a, e, n, t, i, o, s) {
      if (typeof document > "u") return;
      const r = [`${a}=${encodeURIComponent(e)}`];
      h.isNumber(n) && r.push(`expires=${new Date(n).toUTCString()}`), h.isString(t) && r.push(`path=${t}`), h.isString(i) && r.push(`domain=${i}`), o === !0 && r.push("secure"), h.isString(s) && r.push(`SameSite=${s}`), document.cookie = r.join("; ");
    },
    read(a) {
      if (typeof document > "u") return null;
      const e = document.cookie.match(new RegExp("(?:^|; )" + a + "=([^;]*)"));
      return e ? decodeURIComponent(e[1]) : null;
    },
    remove(a) {
      this.write(a, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
), pi = (a) => a instanceof Y ? { ...a } : a;
function Re(a, e) {
  e = e || {};
  const n = {};
  function t(u, p, l, m) {
    return h.isPlainObject(u) && h.isPlainObject(p) ? h.merge.call({ caseless: m }, u, p) : h.isPlainObject(p) ? h.merge({}, p) : h.isArray(p) ? p.slice() : p;
  }
  function i(u, p, l, m) {
    if (h.isUndefined(p)) {
      if (!h.isUndefined(u))
        return t(void 0, u, l, m);
    } else return t(u, p, l, m);
  }
  function o(u, p) {
    if (!h.isUndefined(p))
      return t(void 0, p);
  }
  function s(u, p) {
    if (h.isUndefined(p)) {
      if (!h.isUndefined(u))
        return t(void 0, u);
    } else return t(void 0, p);
  }
  function r(u, p, l) {
    if (l in e)
      return t(u, p);
    if (l in a)
      return t(void 0, u);
  }
  const c = {
    url: o,
    method: o,
    data: o,
    baseURL: s,
    transformRequest: s,
    transformResponse: s,
    paramsSerializer: s,
    timeout: s,
    timeoutMessage: s,
    withCredentials: s,
    withXSRFToken: s,
    adapter: s,
    responseType: s,
    xsrfCookieName: s,
    xsrfHeaderName: s,
    onUploadProgress: s,
    onDownloadProgress: s,
    decompress: s,
    maxContentLength: s,
    maxBodyLength: s,
    beforeRedirect: s,
    transport: s,
    httpAgent: s,
    httpsAgent: s,
    cancelToken: s,
    socketPath: s,
    responseEncoding: s,
    validateStatus: r,
    headers: (u, p, l) => i(pi(u), pi(p), l, !0)
  };
  return h.forEach(
    Object.keys({ ...a, ...e }),
    function(p) {
      if (p === "__proto__" || p === "constructor" || p === "prototype")
        return;
      const l = h.hasOwnProp(c, p) ? c[p] : i, m = l(a[p], e[p], p);
      h.isUndefined(m) && l !== r || (n[p] = m);
    }
  ), n;
}
const is = (a) => {
  const e = Re({}, a);
  let { data: n, withXSRFToken: t, xsrfHeaderName: i, xsrfCookieName: o, headers: s, auth: r } = e;
  if (e.headers = s = Y.from(s), e.url = Fn(qn(e.baseURL, e.url, e.allowAbsoluteUrls), a.params, a.paramsSerializer), r && s.set(
    "Authorization",
    "Basic " + btoa((r.username || "") + ":" + (r.password ? unescape(encodeURIComponent(r.password)) : ""))
  ), h.isFormData(n)) {
    if (G.hasStandardBrowserEnv || G.hasStandardBrowserWebWorkerEnv)
      s.setContentType(void 0);
    else if (h.isFunction(n.getHeaders)) {
      const c = n.getHeaders(), u = ["content-type", "content-length"];
      Object.entries(c).forEach(([p, l]) => {
        u.includes(p.toLowerCase()) && s.set(p, l);
      });
    }
  }
  if (G.hasStandardBrowserEnv && (t && h.isFunction(t) && (t = t(e)), t || t !== !1 && ec(e.url))) {
    const c = i && o && ac.read(o);
    c && s.set(i, c);
  }
  return e;
}, nc = typeof XMLHttpRequest < "u", tc = nc && function(a) {
  return new Promise(function(n, t) {
    const i = is(a);
    let o = i.data;
    const s = Y.from(i.headers).normalize();
    let { responseType: r, onUploadProgress: c, onDownloadProgress: u } = i, p, l, m, g, f;
    function d() {
      g && g(), f && f(), i.cancelToken && i.cancelToken.unsubscribe(p), i.signal && i.signal.removeEventListener("abort", p);
    }
    let x = new XMLHttpRequest();
    x.open(i.method.toUpperCase(), i.url, !0), x.timeout = i.timeout;
    function v() {
      if (!x)
        return;
      const A = Y.from(
        "getAllResponseHeaders" in x && x.getAllResponseHeaders()
      ), L = {
        data: !r || r === "text" || r === "json" ? x.responseText : x.response,
        status: x.status,
        statusText: x.statusText,
        headers: A,
        config: a,
        request: x
      };
      _e(function(_) {
        n(_), d();
      }, function(_) {
        t(_), d();
      }, L), x = null;
    }
    "onloadend" in x ? x.onloadend = v : x.onreadystatechange = function() {
      !x || x.readyState !== 4 || x.status === 0 && !(x.responseURL && x.responseURL.indexOf("file:") === 0) || setTimeout(v);
    }, x.onabort = function() {
      x && (t(new R("Request aborted", R.ECONNABORTED, a, x)), x = null);
    }, x.onerror = function(j) {
      const L = j && j.message ? j.message : "Network Error", k = new R(L, R.ERR_NETWORK, a, x);
      k.event = j || null, t(k), x = null;
    }, x.ontimeout = function() {
      let j = i.timeout ? "timeout of " + i.timeout + "ms exceeded" : "timeout exceeded";
      const L = i.transitional || ma;
      i.timeoutErrorMessage && (j = i.timeoutErrorMessage), t(new R(
        j,
        L.clarifyTimeoutError ? R.ETIMEDOUT : R.ECONNABORTED,
        a,
        x
      )), x = null;
    }, o === void 0 && s.setContentType(null), "setRequestHeader" in x && h.forEach(s.toJSON(), function(j, L) {
      x.setRequestHeader(L, j);
    }), h.isUndefined(i.withCredentials) || (x.withCredentials = !!i.withCredentials), r && r !== "json" && (x.responseType = i.responseType), u && ([m, f] = Oe(u, !0), x.addEventListener("progress", m)), c && x.upload && ([l, g] = Oe(c), x.upload.addEventListener("progress", l), x.upload.addEventListener("loadend", g)), (i.cancelToken || i.signal) && (p = (A) => {
      x && (t(!A || A.type ? new Ee(null, a, x) : A), x.abort(), x = null);
    }, i.cancelToken && i.cancelToken.subscribe(p), i.signal && (i.signal.aborted ? p() : i.signal.addEventListener("abort", p)));
    const E = as(i.url);
    if (E && G.protocols.indexOf(E) === -1) {
      t(new R("Unsupported protocol " + E + ":", R.ERR_BAD_REQUEST, a));
      return;
    }
    x.send(o || null);
  });
}, ic = (a, e) => {
  const { length: n } = a = a ? a.filter(Boolean) : [];
  if (e || n) {
    let t = new AbortController(), i;
    const o = function(u) {
      if (!i) {
        i = !0, r();
        const p = u instanceof Error ? u : this.reason;
        t.abort(p instanceof R ? p : new Ee(p instanceof Error ? p.message : p));
      }
    };
    let s = e && setTimeout(() => {
      s = null, o(new R(`timeout of ${e}ms exceeded`, R.ETIMEDOUT));
    }, e);
    const r = () => {
      a && (s && clearTimeout(s), s = null, a.forEach((u) => {
        u.unsubscribe ? u.unsubscribe(o) : u.removeEventListener("abort", o);
      }), a = null);
    };
    a.forEach((u) => u.addEventListener("abort", o));
    const { signal: c } = t;
    return c.unsubscribe = () => h.asap(r), c;
  }
}, sc = function* (a, e) {
  let n = a.byteLength;
  if (n < e) {
    yield a;
    return;
  }
  let t = 0, i;
  for (; t < n; )
    i = t + e, yield a.slice(t, i), t = i;
}, oc = async function* (a, e) {
  for await (const n of rc(a))
    yield* sc(n, e);
}, rc = async function* (a) {
  if (a[Symbol.asyncIterator]) {
    yield* a;
    return;
  }
  const e = a.getReader();
  try {
    for (; ; ) {
      const { done: n, value: t } = await e.read();
      if (n)
        break;
      yield t;
    }
  } finally {
    await e.cancel();
  }
}, li = (a, e, n, t) => {
  const i = oc(a, e);
  let o = 0, s, r = (c) => {
    s || (s = !0, t && t(c));
  };
  return new ReadableStream({
    async pull(c) {
      try {
        const { done: u, value: p } = await i.next();
        if (u) {
          r(), c.close();
          return;
        }
        let l = p.byteLength;
        if (n) {
          let m = o += l;
          n(m);
        }
        c.enqueue(new Uint8Array(p));
      } catch (u) {
        throw r(u), u;
      }
    },
    cancel(c) {
      return r(c), i.return();
    }
  }, {
    highWaterMark: 2
  });
}, ui = 64 * 1024, { isFunction: Ye } = h, cc = (({ Request: a, Response: e }) => ({
  Request: a,
  Response: e
}))(h.global), {
  ReadableStream: di,
  TextEncoder: mi
} = h.global, fi = (a, ...e) => {
  try {
    return !!a(...e);
  } catch {
    return !1;
  }
}, pc = (a) => {
  a = h.merge.call({
    skipUndefined: !0
  }, cc, a);
  const { fetch: e, Request: n, Response: t } = a, i = e ? Ye(e) : typeof fetch == "function", o = Ye(n), s = Ye(t);
  if (!i)
    return !1;
  const r = i && Ye(di), c = i && (typeof mi == "function" ? /* @__PURE__ */ ((f) => (d) => f.encode(d))(new mi()) : async (f) => new Uint8Array(await new n(f).arrayBuffer())), u = o && r && fi(() => {
    let f = !1;
    const d = new n(G.origin, {
      body: new di(),
      method: "POST",
      get duplex() {
        return f = !0, "half";
      }
    }).headers.has("Content-Type");
    return f && !d;
  }), p = s && r && fi(() => h.isReadableStream(new t("").body)), l = {
    stream: p && ((f) => f.body)
  };
  i && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((f) => {
    !l[f] && (l[f] = (d, x) => {
      let v = d && d[f];
      if (v)
        return v.call(d);
      throw new R(`Response type '${f}' is not supported`, R.ERR_NOT_SUPPORT, x);
    });
  });
  const m = async (f) => {
    if (f == null)
      return 0;
    if (h.isBlob(f))
      return f.size;
    if (h.isSpecCompliantForm(f))
      return (await new n(G.origin, {
        method: "POST",
        body: f
      }).arrayBuffer()).byteLength;
    if (h.isArrayBufferView(f) || h.isArrayBuffer(f))
      return f.byteLength;
    if (h.isURLSearchParams(f) && (f = f + ""), h.isString(f))
      return (await c(f)).byteLength;
  }, g = async (f, d) => {
    const x = h.toFiniteNumber(f.getContentLength());
    return x ?? m(d);
  };
  return async (f) => {
    let {
      url: d,
      method: x,
      data: v,
      signal: E,
      cancelToken: A,
      timeout: j,
      onDownloadProgress: L,
      onUploadProgress: k,
      responseType: _,
      headers: z,
      withCredentials: V = "same-origin",
      fetchOptions: Q
    } = is(f), ee = e || fetch;
    _ = _ ? (_ + "").toLowerCase() : "text";
    let H = ic([E, A && A.toAbortSignal()], j), J = null;
    const X = H && H.unsubscribe && (() => {
      H.unsubscribe();
    });
    let re;
    try {
      if (k && u && x !== "get" && x !== "head" && (re = await g(z, v)) !== 0) {
        let T = new n(d, {
          method: "POST",
          body: v,
          duplex: "half"
        }), P;
        if (h.isFormData(v) && (P = T.headers.get("content-type")) && z.setContentType(P), T.body) {
          const [$, F] = na(
            re,
            Oe(ta(k))
          );
          v = li(T.body, ui, $, F);
        }
      }
      h.isString(V) || (V = V ? "include" : "omit");
      const b = o && "credentials" in n.prototype, y = {
        ...Q,
        signal: H,
        method: x.toUpperCase(),
        headers: z.normalize().toJSON(),
        body: v,
        duplex: "half",
        credentials: b ? V : void 0
      };
      J = o && new n(d, y);
      let w = await (o ? ee(J, Q) : ee(d, y));
      const N = p && (_ === "stream" || _ === "response");
      if (p && (L || N && X)) {
        const T = {};
        ["status", "statusText", "headers"].forEach((U) => {
          T[U] = w[U];
        });
        const P = h.toFiniteNumber(w.headers.get("content-length")), [$, F] = L && na(
          P,
          Oe(ta(L), !0)
        ) || [];
        w = new t(
          li(w.body, ui, $, () => {
            F && F(), X && X();
          }),
          T
        );
      }
      _ = _ || "text";
      let S = await l[h.findKey(l, _) || "text"](w, f);
      return !N && X && X(), await new Promise((T, P) => {
        _e(T, P, {
          data: S,
          headers: Y.from(w.headers),
          status: w.status,
          statusText: w.statusText,
          config: f,
          request: J
        });
      });
    } catch (b) {
      throw X && X(), b && b.name === "TypeError" && /Load failed|fetch/i.test(b.message) ? Object.assign(
        new R("Network Error", R.ERR_NETWORK, f, J, b && b.response),
        {
          cause: b.cause || b
        }
      ) : R.from(b, b && b.code, f, J, b && b.response);
    }
  };
}, lc = /* @__PURE__ */ new Map(), ss = (a) => {
  let e = a && a.env || {};
  const { fetch: n, Request: t, Response: i } = e, o = [
    t,
    i,
    n
  ];
  let s = o.length, r = s, c, u, p = lc;
  for (; r--; )
    c = o[r], u = p.get(c), u === void 0 && p.set(c, u = r ? /* @__PURE__ */ new Map() : pc(e)), p = u;
  return u;
};
ss();
const Bn = {
  http: Qr,
  xhr: tc,
  fetch: {
    get: ss
  }
};
h.forEach(Bn, (a, e) => {
  if (a) {
    try {
      Object.defineProperty(a, "name", { value: e });
    } catch {
    }
    Object.defineProperty(a, "adapterName", { value: e });
  }
});
const xi = (a) => `- ${a}`, uc = (a) => h.isFunction(a) || a === null || a === !1;
function dc(a, e) {
  a = h.isArray(a) ? a : [a];
  const { length: n } = a;
  let t, i;
  const o = {};
  for (let s = 0; s < n; s++) {
    t = a[s];
    let r;
    if (i = t, !uc(t) && (i = Bn[(r = String(t)).toLowerCase()], i === void 0))
      throw new R(`Unknown adapter '${r}'`);
    if (i && (h.isFunction(i) || (i = i.get(e))))
      break;
    o[r || "#" + s] = i;
  }
  if (!i) {
    const s = Object.entries(o).map(
      ([c, u]) => `adapter ${c} ` + (u === !1 ? "is not supported by the environment" : "is not available in the build")
    );
    let r = n ? s.length > 1 ? `since :
` + s.map(xi).join(`
`) : " " + xi(s[0]) : "as no adapter specified";
    throw new R(
      "There is no suitable adapter to dispatch the request " + r,
      "ERR_NOT_SUPPORT"
    );
  }
  return i;
}
const os = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: dc,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: Bn
};
function Tn(a) {
  if (a.cancelToken && a.cancelToken.throwIfRequested(), a.signal && a.signal.aborted)
    throw new Ee(null, a);
}
function hi(a) {
  return Tn(a), a.headers = Y.from(a.headers), a.data = hn.call(
    a,
    a.transformRequest
  ), ["post", "put", "patch"].indexOf(a.method) !== -1 && a.headers.setContentType("application/x-www-form-urlencoded", !1), os.getAdapter(a.adapter || Be.adapter, a)(a).then(function(t) {
    return Tn(a), t.data = hn.call(
      a,
      a.transformResponse,
      t
    ), t.headers = Y.from(t.headers), t;
  }, function(t) {
    return Qi(t) || (Tn(a), t && t.response && (t.response.data = hn.call(
      a,
      a.transformResponse,
      t.response
    ), t.response.headers = Y.from(t.response.headers))), Promise.reject(t);
  });
}
const fa = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((a, e) => {
  fa[a] = function(t) {
    return typeof t === a || "a" + (e < 1 ? "n " : " ") + a;
  };
});
const vi = {};
fa.transitional = function(e, n, t) {
  function i(o, s) {
    return "[Axios v" + aa + "] Transitional option '" + o + "'" + s + (t ? ". " + t : "");
  }
  return (o, s, r) => {
    if (e === !1)
      throw new R(
        i(s, " has been removed" + (n ? " in " + n : "")),
        R.ERR_DEPRECATED
      );
    return n && !vi[s] && (vi[s] = !0, console.warn(
      i(
        s,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), e ? e(o, s, r) : !0;
  };
};
fa.spelling = function(e) {
  return (n, t) => (console.warn(`${t} is likely a misspelling of ${e}`), !0);
};
function mc(a, e, n) {
  if (typeof a != "object")
    throw new R("options must be an object", R.ERR_BAD_OPTION_VALUE);
  const t = Object.keys(a);
  let i = t.length;
  for (; i-- > 0; ) {
    const o = t[i], s = e[o];
    if (s) {
      const r = a[o], c = r === void 0 || s(r, o, a);
      if (c !== !0)
        throw new R("option " + o + " must be " + c, R.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (n !== !0)
      throw new R("Unknown option " + o, R.ERR_BAD_OPTION);
  }
}
const ea = {
  assertOptions: mc,
  validators: fa
}, ce = ea.validators;
let we = class {
  constructor(e) {
    this.defaults = e || {}, this.interceptors = {
      request: new $t(),
      response: new $t()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(e, n) {
    try {
      return await this._request(e, n);
    } catch (t) {
      if (t instanceof Error) {
        let i = {};
        Error.captureStackTrace ? Error.captureStackTrace(i) : i = new Error();
        const o = i.stack ? i.stack.replace(/^.+\n/, "") : "";
        try {
          t.stack ? o && !String(t.stack).endsWith(o.replace(/^.+\n.+\n/, "")) && (t.stack += `
` + o) : t.stack = o;
        } catch {
        }
      }
      throw t;
    }
  }
  _request(e, n) {
    typeof e == "string" ? (n = n || {}, n.url = e) : n = e || {}, n = Re(this.defaults, n);
    const { transitional: t, paramsSerializer: i, headers: o } = n;
    t !== void 0 && ea.assertOptions(t, {
      silentJSONParsing: ce.transitional(ce.boolean),
      forcedJSONParsing: ce.transitional(ce.boolean),
      clarifyTimeoutError: ce.transitional(ce.boolean),
      legacyInterceptorReqResOrdering: ce.transitional(ce.boolean)
    }, !1), i != null && (h.isFunction(i) ? n.paramsSerializer = {
      serialize: i
    } : ea.assertOptions(i, {
      encode: ce.function,
      serialize: ce.function
    }, !0)), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), ea.assertOptions(n, {
      baseUrl: ce.spelling("baseURL"),
      withXsrfToken: ce.spelling("withXSRFToken")
    }, !0), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let s = o && h.merge(
      o.common,
      o[n.method]
    );
    o && h.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (f) => {
        delete o[f];
      }
    ), n.headers = Y.concat(s, o);
    const r = [];
    let c = !0;
    this.interceptors.request.forEach(function(d) {
      if (typeof d.runWhen == "function" && d.runWhen(n) === !1)
        return;
      c = c && d.synchronous;
      const x = n.transitional || ma;
      x && x.legacyInterceptorReqResOrdering ? r.unshift(d.fulfilled, d.rejected) : r.push(d.fulfilled, d.rejected);
    });
    const u = [];
    this.interceptors.response.forEach(function(d) {
      u.push(d.fulfilled, d.rejected);
    });
    let p, l = 0, m;
    if (!c) {
      const f = [hi.bind(this), void 0];
      for (f.unshift(...r), f.push(...u), m = f.length, p = Promise.resolve(n); l < m; )
        p = p.then(f[l++], f[l++]);
      return p;
    }
    m = r.length;
    let g = n;
    for (; l < m; ) {
      const f = r[l++], d = r[l++];
      try {
        g = f(g);
      } catch (x) {
        d.call(this, x);
        break;
      }
    }
    try {
      p = hi.call(this, g);
    } catch (f) {
      return Promise.reject(f);
    }
    for (l = 0, m = u.length; l < m; )
      p = p.then(u[l++], u[l++]);
    return p;
  }
  getUri(e) {
    e = Re(this.defaults, e);
    const n = qn(e.baseURL, e.url, e.allowAbsoluteUrls);
    return Fn(n, e.params, e.paramsSerializer);
  }
};
h.forEach(["delete", "get", "head", "options"], function(e) {
  we.prototype[e] = function(n, t) {
    return this.request(Re(t || {}, {
      method: e,
      url: n,
      data: (t || {}).data
    }));
  };
});
h.forEach(["post", "put", "patch"], function(e) {
  function n(t) {
    return function(o, s, r) {
      return this.request(Re(r || {}, {
        method: e,
        headers: t ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: o,
        data: s
      }));
    };
  }
  we.prototype[e] = n(), we.prototype[e + "Form"] = n(!0);
});
let fc = class rs {
  constructor(e) {
    if (typeof e != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(o) {
      n = o;
    });
    const t = this;
    this.promise.then((i) => {
      if (!t._listeners) return;
      let o = t._listeners.length;
      for (; o-- > 0; )
        t._listeners[o](i);
      t._listeners = null;
    }), this.promise.then = (i) => {
      let o;
      const s = new Promise((r) => {
        t.subscribe(r), o = r;
      }).then(i);
      return s.cancel = function() {
        t.unsubscribe(o);
      }, s;
    }, e(function(o, s, r) {
      t.reason || (t.reason = new Ee(o, s, r), n(t.reason));
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason)
      throw this.reason;
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(e) {
    if (this.reason) {
      e(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(e) : this._listeners = [e];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(e) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(e);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const e = new AbortController(), n = (t) => {
      e.abort(t);
    };
    return this.subscribe(n), e.signal.unsubscribe = () => this.unsubscribe(n), e.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let e;
    return {
      token: new rs(function(i) {
        e = i;
      }),
      cancel: e
    };
  }
};
function xc(a) {
  return function(n) {
    return a.apply(null, n);
  };
}
function hc(a) {
  return h.isObject(a) && a.isAxiosError === !0;
}
const Cn = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(Cn).forEach(([a, e]) => {
  Cn[e] = a;
});
function cs(a) {
  const e = new we(a), n = Ai(we.prototype.request, e);
  return h.extend(n, we.prototype, e, { allOwnKeys: !0 }), h.extend(n, e, null, { allOwnKeys: !0 }), n.create = function(i) {
    return cs(Re(a, i));
  }, n;
}
const q = cs(Be);
q.Axios = we;
q.CanceledError = Ee;
q.CancelToken = fc;
q.isCancel = Qi;
q.VERSION = aa;
q.toFormData = da;
q.AxiosError = R;
q.Cancel = q.CanceledError;
q.all = function(e) {
  return Promise.all(e);
};
q.spread = xc;
q.isAxiosError = hc;
q.mergeConfig = Re;
q.AxiosHeaders = Y;
q.formToJSON = (a) => Zi(h.isHTMLForm(a) ? new FormData(a) : a);
q.getAdapter = os.getAdapter;
q.HttpStatusCode = Cn;
q.default = q;
const {
  Axios: ep,
  AxiosError: ap,
  CanceledError: np,
  isCancel: tp,
  CancelToken: ip,
  VERSION: sp,
  all: op,
  Cancel: rp,
  isAxiosError: cp,
  spread: pp,
  toFormData: lp,
  AxiosHeaders: up,
  HttpStatusCode: dp,
  formToJSON: mp,
  getAdapter: fp,
  mergeConfig: xp
} = q;
class vc {
  /**
   * Sends a JSON configuration command to a WLED device.
   * @param command WledCommand object containing the device IP and state parameters.
   */
  async sendWledCommand(e) {
    const { ip: n, ...t } = e, i = `http://${n}/json/state`;
    try {
      console.log(`Sending WLED command to ${n}:`, JSON.stringify(t)), await q.post(i, t, { timeout: 1e3 });
    } catch (o) {
      console.error(`WLED command failed for ${n}:`, o.message);
    }
  }
  /**
   * Sends a command to a WiZ light using the WiZ UDP protocol.
   * @param ip The IP address of the WiZ device.
   * @param method The WiZ method to call (e.g., 'setPilot', 'getPilot').
   * @param params The parameters associated with the method.
   * @returns A promise resolving to the device response or a success indicator.
   */
  async sendWizCommand(e, n, t) {
    return new Promise((i, o) => {
      const s = Ie.createSocket("udp4"), r = JSON.stringify({ method: n, params: t });
      s.send(r, 38899, e, (c) => {
        if (c) {
          s.close(), o(c);
          return;
        }
        n === "getPilot" ? (s.on("message", (u) => {
          try {
            const p = JSON.parse(u.toString());
            s.close(), i(p);
          } catch (p) {
            s.close(), o(p);
          }
        }), setTimeout(() => {
          try {
            s.close();
          } catch {
          }
          i({ error: "timeout" });
        }, 2e3)) : (s.close(), i({ success: !0 }));
      });
    });
  }
  /**
   * Retrieves the current state and device information from a WLED instance.
   * @param ip The IP address of the WLED device.
   * @returns An object containing 'info' and 'state' data, or null if unreachable.
   */
  async getWledInfo(e) {
    try {
      const n = await q.get(`http://${e}/json/info`, { timeout: 2e3 }), t = await q.get(`http://${e}/json/state`, { timeout: 2e3 });
      return { info: n.data, state: t.data };
    } catch (n) {
      return console.error(`Failed to get WLED info from ${e}:`, n.message), null;
    }
  }
  /**
   * Fetches the list of available lighting effects from a WLED device.
   * @param ip The IP address of the WLED device.
   * @returns An array of strings representing effect names.
   */
  async getWledEffects(e) {
    try {
      return (await q.get(`http://${e}/json/eff`, { timeout: 2e3 })).data;
    } catch (n) {
      return console.error(`Failed to get WLED effects from ${e}:`, n.message), [];
    }
  }
  /**
   * Fetches the list of available color palettes from a WLED device.
   * @param ip The IP address of the WLED device.
   * @returns An array of strings representing palette names.
   */
  async getWledPalettes(e) {
    try {
      return (await q.get(`http://${e}/json/pal`, { timeout: 2e3 })).data;
    } catch (n) {
      return console.error(`Failed to get WLED palettes from ${e}:`, n.message), [];
    }
  }
  /**
   * Processes a show event and translates it into physical hardware commands.
   * Handles color conversion, device lookup, and protocol selection.
   * @param event The ShowEvent to execute.
   */
  processEvent(e) {
    if (e.type?.toLowerCase() === "light" && e.fixture) {
      const n = {
        "Beuk Cour": "192.168.0.10",
        "Beuk Jardin": "192.168.0.11",
        "WIZ Lamp": "192.168.0.119"
      }, i = (O.getDevices("GLOBAL") || []).find((s) => s.name === e.fixture), o = i?.ip || n[e.fixture];
      if (o)
        if (i?.type === "wiz")
          this.sendWizCommand(o, "setPilot", {
            r: this.hexToRgb(e.color1)[0],
            g: this.hexToRgb(e.color1)[1],
            b: this.hexToRgb(e.color1)[2],
            dimming: e.brightness !== void 0 ? Math.round(e.brightness / 2.55) : 100
          });
        else {
          const s = {
            on: !0,
            bri: e.brightness,
            seg: []
          }, r = {
            fx: e.effectId !== void 0 ? e.effectId : 0,
            pal: e.paletteId !== void 0 ? e.paletteId : 0,
            col: [
              this.hexToRgb(e.color1),
              this.hexToRgb(e.color2),
              this.hexToRgb(e.color3)
            ],
            sx: e.speed,
            ix: e.intensity
          };
          (async () => {
            try {
              const u = i?.id ? O.getWledSegments(i.id) : null, p = await this.getWledInfo(o);
              if (u && p && p.state) {
                const l = p.state.seg || [];
                (l.length !== u.length || u.some((g, f) => {
                  const d = l[f];
                  return !d || d.start !== g.start || d.stop !== g.stop;
                })) && (console.log(`[NetworkManager] Restoring segments for WLED ${o}...`), await this.sendWledCommand({ ip: o, seg: u }));
              }
              if (e.segmentId !== void 0 && e.segmentId >= 0)
                s.seg.push({ id: e.segmentId, ...r }), this.sendWledCommand({ ip: o, ...s });
              else {
                const l = await this.getWledInfo(o);
                l && l.state && l.state.seg ? (s.seg = l.state.seg.map((m) => ({ id: m.id, ...r })), this.sendWledCommand({ ip: o, ...s })) : (s.seg.push({ id: 0, ...r }), this.sendWledCommand({ ip: o, ...s }));
              }
            } catch (u) {
              console.error(`[NetworkManager] WLED segment handling failed for ${o}:`, u.message), s.seg.push({ id: 0, ...r }), this.sendWledCommand({ ip: o, ...s });
            }
          })();
        }
    }
  }
  /**
   * Executes a visual test sequence on a device (Red -> Green -> Blue).
   * Used for identifying physical fixtures during setup.
   * @param device The device object to test.
   */
  async testDevice(e) {
    if (console.log("Testing device:", e.name, e.ip, e.type), e.type === "wled") {
      const n = `http://${e.ip}/json/state`;
      try {
        await q.post(n, { on: !0, bri: 255, seg: [{ id: 0, col: [[255, 0, 0]] }] }, { timeout: 1e3 }), setTimeout(() => q.post(n, { seg: [{ id: 0, col: [[0, 255, 0]] }] }).catch(() => {
        }), 500), setTimeout(() => q.post(n, { seg: [{ id: 0, col: [[0, 0, 255]] }] }).catch(() => {
        }), 1e3);
      } catch (t) {
        console.error(`Test WLED failed: ${t.message}`);
      }
    } else if (e.type === "wiz") {
      const n = Ie.createSocket("udp4"), t = JSON.stringify({ method: "setPilot", params: { r: 255, g: 0, b: 0, dimming: 100 } });
      n.send(t, 38899, e.ip, (i) => {
        i && console.error("WiZ test failed:", i), setTimeout(() => {
          const o = JSON.stringify({ method: "setPilot", params: { r: 0, g: 255, b: 0, dimming: 100 } });
          n.send(o, 38899, e.ip);
        }, 500), setTimeout(() => {
          const o = JSON.stringify({ method: "setPilot", params: { r: 0, g: 0, b: 255, dimming: 100 } });
          n.send(o, 38899, e.ip, () => n.close());
        }, 1e3);
      });
    }
  }
  /**
   * Helper to convert a CSS-style HEX string to an RGB array.
   * @param hex The hex string (e.g. "#FF8800").
   * @returns An array [red, green, blue].
   */
  hexToRgb(e) {
    if (!e || e === "Black" || !e.startsWith("#")) return [0, 0, 0];
    const n = parseInt(e.slice(1, 3), 16) || 0, t = parseInt(e.slice(3, 5), 16) || 0, i = parseInt(e.slice(5, 7), 16) || 0;
    return [n, t, i];
  }
}
const ve = new vc();
class bc {
  /**
   * Initializes the scanner by detecting available network interfaces.
   */
  constructor() {
    this.interfaces = [], this.detectInterfaces();
  }
  /**
   * Scans the system's network interfaces for active IPv4 subnets.
   * Identifies subnets, broadcast addresses, and local IP addresses.
   */
  detectInterfaces() {
    const e = ys.networkInterfaces();
    this.interfaces = [];
    for (const n of Object.keys(e))
      for (const t of e[n] || [])
        if (t.family === "IPv4" && !t.internal) {
          const i = t.address.split(".");
          i.pop();
          const o = i.join(".");
          this.interfaces.push({
            subnet: o,
            broadcast: `${o}.255`,
            address: t.address
          });
        }
    console.log("Detected interfaces:", this.interfaces);
  }
  /**
   * Performs a full network scan to find WLED, WiZ, and VideoWall Agent devices.
   * Starts with UDP discovery, followed by an HTTP sweep for WLED devices.
   * @param onProgress Callback function to report scan status and progress percentage.
   * @returns A promise resolving to an array of found devices.
   */
  async scan(e) {
    if (this.detectInterfaces(), this.interfaces.length === 0)
      return e && e("No Network Interfaces Found", 100, 0), [];
    const n = [], t = /* @__PURE__ */ new Set();
    e && e("Scanning via UDP...", 5, 0), (await this.scanUdp()).forEach((c) => {
      t.has(c.ip) || (t.add(c.ip), n.push(c));
    }), e && e("Scanning via HTTP...", 10, n.length);
    const o = [];
    for (const c of this.interfaces)
      for (let u = 1; u < 255; u++) {
        const p = `${c.subnet}.${u}`;
        t.has(p) || o.push(p);
      }
    const s = 40, r = o.length;
    for (let c = 0; c < r; c += s) {
      const u = o.slice(c, c + s);
      if (e) {
        const l = 10 + Math.round(c / r * 90);
        e(`Scanning ${u[0]}...`, l, n.length);
      }
      (await Promise.all(u.map((l) => this.checkWled(l)))).filter(Boolean).forEach((l) => {
        l && !t.has(l.ip) && (t.add(l.ip), n.push(l));
      });
    }
    return e && e("Complete", 100, n.length), n;
  }
  /**
   * Checks if a specific IP belongs to a WLED device by querying its JSON API.
   * @param ip The IP address to check.
   * @returns ScanResult if WLED is detected, otherwise null.
   */
  async checkWled(e) {
    try {
      const n = await q.get(`http://${e}/json/info`, { timeout: 1500 });
      if (n.data && n.data.ver && n.data.leds)
        return {
          ip: e,
          mac: n.data.mac,
          type: "wled",
          name: n.data.name || "WLED Device",
          details: n.data
        };
    } catch {
    }
    return null;
  }
  /**
   * Discovers WiZ and VideoWall Agent devices via UDP broadcasting.
   * Sends discovery payloads to both global and interface-specific broadcast addresses.
   * @returns A promise resolving to an array of found devices.
   */
  scanUdp() {
    return new Promise((e) => {
      const n = Ie.createSocket("udp4"), t = [];
      n.bind(() => {
        n.setBroadcast(!0);
        const i = JSON.stringify({ method: "getPilot", params: {} }), o = JSON.stringify({ action: "discover_agent" });
        try {
          n.send(i, 38899, "255.255.255.255"), n.send(o, 5566, "255.255.255.255");
        } catch (s) {
          console.error("UDP Global Broadcast failed", s);
        }
        for (const s of this.interfaces)
          try {
            n.send(i, 38899, s.broadcast), n.send(o, 5566, s.broadcast), console.log(`Sending UDP to ${s.broadcast}`);
          } catch (r) {
            console.error(`UDP Broadcast to ${s.broadcast} failed`, r);
          }
      }), n.on("message", (i, o) => {
        try {
          const s = i.toString(), r = JSON.parse(s);
          r.result && r.result.mac && t.push({
            ip: o.address,
            mac: r.result.mac,
            type: "wiz",
            name: `WiZ Light (${r.result.mac})`,
            details: r
          }), r.type === "VideoWall_agent_response" && (console.log(`[Scanner] Found VideoWall Agent at ${o.address}:`, r), t.push({
            ip: o.address,
            mac: r.mac,
            type: "VideoWall_agent",
            name: r.name || "VideoWall Agent",
            version: r.version || "1.0.0",
            // Capture version
            details: r
          }));
        } catch {
        }
      }), setTimeout(() => {
        try {
          n.close();
        } catch {
        }
        e(t);
      }, 2500);
    });
  }
  /**
   * Lightweight scan that only discovers VideoWall Agents via UDP.
   * Completes in ~2.5 seconds. Used by the setup wizard for fast polling.
   */
  async scanAgentsOnly() {
    return this.detectInterfaces(), this.interfaces.length === 0 ? [] : (await this.scanUdp()).filter((n) => n.type === "VideoWall_agent");
  }
}
const ps = new bc();
async function gc(a, e) {
  console.log(`[Backend] Attempting to parse PDF: ${a} (AI Mode: ${!!e})`);
  const n = ws.readFileSync(a);
  try {
    const { createRequire: t } = await import("node:module"), o = t(import.meta.url)("pdf-parse");
    let s;
    if (typeof o == "function" ? s = o : o && typeof o.default == "function" && (s = o.default), typeof s != "function")
      throw console.error("[Backend] pdf-parse NOT a function. Module type:", typeof o, "Keys:", Object.keys(o || {})), new Error("PDF parser bibliotheek kon niet als functie worden geladen.");
    const c = (await s(n)).text;
    if (console.log(`[Backend] PDF text extracted, length: ${c?.length || 0}`), e && e.trim().length > 10)
      try {
        return await yc(c, e);
      } catch (u) {
        return console.error("[Backend] AI parsing failed, falling back to regex:", u), bi(c);
      }
    return bi(c);
  } catch (t) {
    throw console.error("[Backend] Error in parsePdfScript:", t), t;
  }
}
async function yc(a, e) {
  const { GoogleGenerativeAI: n } = await import("./index-C45_meK_.js"), i = new n(e).getGenerativeModel({ model: "gemini-1.5-flash" }), o = `
    Je bent een expert in het analyseren van theater-scripts voor een show-control systeem.
    Analyseer het volgende script en extraheer de structuur in JSON formaat.
    
    RICHTLIJNEN:
    1. Identificeer Akten (bijv. "AKTE 1", "AKTE 2").
    2. Identificeer Scenes binnen elke akte. Let op: er is vaak een hiërarchie tussen locaties (SCENE 1: ...) en muzieknummers/acties (1: Opening, 4a: Reprise).
    3. Extraheer voor elke regel:
       - title: De titel van de scene of het nummer (bijv. "SCENE 1: Park" of "4a: In mijn droom").
       - description: Een korte sfeeromschrijving of regie-aanwijzing indien direct beschikbaar onder de titel.
    4. Sla de inhoudsopgave (Table of Contents) over.
    5. Geef ALLEEN de JSON terug, geen extra tekst.
    
    JSON SCHEMA:
    {
      "acts": [
        {
          "name": "AKTE EEN",
          "scenes": [
            { "id": 1, "title": "SCENE 1: PALEIS", "description": "1906. Een kleine slaapkamer." },
            { "id": 2, "title": "2: Ooit In Winterse Dagen", "description": "Lied Keizerin-moeder" }
          ]
        }
      ]
    }

    SCRIPT TEKST:
    ${a.substring(0, 5e4)} 
    `, u = (await (await i.generateContent(o)).response).text().replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(u);
}
function bi(a) {
  const e = a.split(`
`).map((f) => f.trim()).filter((f) => f.length > 0), n = { acts: [] };
  let t = null, i = null;
  const o = /^(?:ACT|AKTE)\s+(?:(\d+)|([IVXLCDM]+)|(EEN|TWEE|DRIE|VIER|VIJF|ZES|ZEVEN|ACHT|NEGEN|TIEN))\b|^(EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE)\s+AKTE/i, s = /^(?:SCENE|SCÈNE)\s+(\d+)\s*[:.-]\s*(.+)$/i, r = /^(\d{1,2}[a-z]?)\s*[:.-]\s*(.+)$/i, c = /^\d{4}$/, u = /^EINDE\s+(?:EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE|LAATSTE)\s+AKTE/i, p = /^(ANASTASIA\s*\/\s*\d+|©\s+|Repetitiescript|Auteursbureau|Tel:|E-mail:|www\.)/i;
  let l = !1, m = !1, g = 1;
  console.log(`[Parser] Starting parse of ${e.length} lines`);
  for (let f = 0; f < e.length; f++) {
    const d = e[f];
    if (p.test(d)) continue;
    if (d.toUpperCase().includes("MUZIKALE NUMMERS") || d.toUpperCase().includes("INHOUD")) {
      l = !0;
      continue;
    }
    if (l || !m) {
      if (o.test(d))
        l = !1, m = !0;
      else if (!m)
        continue;
    }
    if (u.test(d)) {
      console.log(`[Parser] Match End Act: ${d}`), t = null, i = null;
      continue;
    }
    if (d.match(o)) {
      console.log(`[Parser] Match Act: ${d}`), t = {
        name: d.toUpperCase(),
        scenes: []
      }, n.acts.push(t), i = null, g = 1;
      continue;
    }
    const v = d.match(s), E = d.match(r), A = v || E;
    if (A && !c.test(A[1])) {
      const j = A[1], L = A[2].trim();
      if (j.length > 3 && /^\d+$/.test(j)) continue;
      let k = L;
      if (L.length > 80) {
        const _ = L.split(/\s+[\(\/]/);
        _[0].length < 80 && (k = _[0].trim());
      }
      if (k.length < 200) {
        t || (t = { name: "AKTE 1", scenes: [] }, n.acts.push(t));
        const _ = v ? `SCENE ${j}: ${k}` : `${j}: ${k}`;
        console.log(`[Parser] Match Item (${j}): ${_}`), i = {
          id: g++,
          title: _,
          description: L !== k ? L : ""
        }, t.scenes.push(i);
        continue;
      }
    }
    if (i) {
      if (/^[A-Z]{2,}(?:\s+[A-Z]{2,})*\s*:/.test(d)) {
        i = null;
        continue;
      }
      i.description.length < 1500 && (i.description.length > 0 && (i.description += " "), i.description += d), d.startsWith("(") && d.endsWith(")");
    }
  }
  return console.log(`[Parser] Finished. Found ${n.acts.length} acts.`), n.acts.forEach((f) => console.log(` - Act ${f.name}: ${f.scenes.length} items`)), n;
}
class wc {
  // Local cache of device statuses
  /**
   * @param io The Socket.io server instance.
   */
  constructor(e) {
    this.interval = null, this.statuses = {}, this.io = e;
  }
  /**
   * Starts the periodic status checking process.
   * @param intervalMs How often to check all devices (default: 10 seconds).
   */
  start(e = 1e4) {
    this.checkAll(), this.interval = setInterval(() => this.checkAll(), e);
  }
  /**
   * Stops the periodic status checking process.
   */
  stop() {
    this.interval && (clearInterval(this.interval), this.interval = null);
  }
  /**
   * Internal method to trigger availability checks for all enabled devices.
   */
  async checkAll() {
    const e = O.getDevices("GLOBAL").filter((i) => i.enabled);
    e.length === 0 && console.log("[StatusManager] No enabled devices found in GLOBAL table.");
    const n = e.map((i) => this.checkDevice(i));
    await Promise.all(n);
    const t = fs.getAllDisplays().length;
    e.forEach((i) => {
      if (i.type === "local_monitor") {
        const o = i.monitorId, s = o >= 0 && o < t;
        this.updateStatus(i.id, s ? "online" : "offline");
      }
    }), Object.entries(this.statuses).filter(([i, o]) => o.status === "online").map(([i, o]) => i), this.broadcast();
  }
  /**
   * Logic to determine the availability of a single device based on its type.
   * @param device The device configuration object.
   */
  async checkDevice(e) {
    if (e.type === "wled")
      try {
        await q.get(`http://${e.ip}/json/info`, { timeout: 2e3 }), this.updateStatus(e.id, "online");
      } catch {
        this.updateStatus(e.id, "offline");
      }
    else if (e.type === "wiz") {
      const n = await this.pingWiz(e.ip);
      this.updateStatus(e.id, n ? "online" : "offline");
    } else if (e.type === "remote_VideoWall" || e.type === "videowall_agent") {
      const n = await this.pingAgent(e.ip, 5566);
      this.updateStatus(e.id, n ? "online" : "offline");
    }
  }
  /**
   * Updates the status of a specific device in the internal cache.
   * @param id The device identifier.
   * @param status The new status value.
   */
  updateStatus(e, n) {
    this.statuses[e] = {
      id: e,
      status: n,
      lastSeen: Date.now()
    };
  }
  /**
   * Emits the current statuses of all devices to all connected Socket.io clients.
   */
  broadcast() {
    this.io.emit("execute", {
      type: "DEVICE_STATUS_UPDATE",
      statuses: this.statuses
    });
  }
  /**
   * Pings a WiZ device over UDP to check if it's responsive.
   * @param ip The IP address of the WiZ light.
   * @returns A promise resolving to true if a response is received, false otherwise.
   */
  pingWiz(e) {
    return new Promise((n) => {
      const t = Ie.createSocket("udp4"), i = JSON.stringify({ method: "getPilot", params: {} });
      t.send(i, 38899, e, (s) => {
        s && (t.close(), n(!1));
      });
      const o = setTimeout(() => {
        t.close(), n(!1);
      }, 1500);
      t.on("message", () => {
        clearTimeout(o), t.close(), n(!0);
      });
    });
  }
  /**
   * Pings a custom VideoWall agent using a UDP discovery packet.
   * @param ip The IP address of the agent.
   * @param port The UDP port to ping (default: 5566).
   * @returns A promise resolving to true if the agent responds.
   */
  async pingAgent(e, n) {
    try {
      return new Promise((t) => {
        const i = Ie.createSocket("udp4"), o = JSON.stringify({ action: "discover_agent" });
        i.send(o, n, e, (r) => {
          r && (t(!1), i.close());
        });
        const s = setTimeout(() => {
          t(!1), i.close();
        }, 1500);
        i.on("message", () => {
          clearTimeout(s), t(!0), i.close();
        });
      });
    } catch {
      return !1;
    }
  }
}
const oe = yi(import.meta.url), { app: me, BrowserWindow: Se, ipcMain: C, dialog: Me, protocol: Ec, screen: ia, net: Rc } = oe("electron"), ls = oe("http"), { Server: Tc } = oe("socket.io"), B = oe("node:fs"), Sc = oe("node:os"), Ac = oe("axios"), xe = M.dirname(wi(import.meta.url)), _c = O.getAppSettings(), sa = _c?.serverPort || 3001, On = sa + 1, Mn = ls.createServer((a, e) => {
  if (!a.url) {
    e.writeHead(400), e.end();
    return;
  }
  let n;
  try {
    n = new URL(a.url, "http://localhost");
  } catch {
    e.writeHead(400), e.end("Bad request");
    return;
  }
  if (n.pathname === "/script") {
    const t = n.searchParams.get("path");
    t && B.existsSync(t) ? (e.writeHead(200, { "Content-Type": "application/pdf", "Access-Control-Allow-Origin": "*" }), B.createReadStream(t).pipe(e)) : (console.warn("[Main] /script not found:", t), e.writeHead(404), e.end("Not found"));
    return;
  }
  e.writeHead(404), e.end();
}), le = new Tc(Mn, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
}), Cc = new wc(le);
Cc.start(5e3);
const Oc = ls.createServer((a, e) => {
  if (!a.url) {
    e.writeHead(400), e.end();
    return;
  }
  let n;
  try {
    n = new URL(a.url, "http://localhost");
  } catch {
    e.writeHead(400), e.end("Bad request");
    return;
  }
  if (n.pathname === "/logo") {
    const t = M.join(me.getPath("userData"), "assets", "logo.png");
    B.existsSync(t) ? (e.writeHead(200, { "Content-Type": "image/png", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }), B.createReadStream(t).pipe(e)) : (e.writeHead(404), e.end("No logo"));
    return;
  }
  if (n.pathname === "/script") {
    const t = n.searchParams.get("path");
    t && B.existsSync(t) ? (e.writeHead(200, { "Content-Type": "application/pdf", "Access-Control-Allow-Origin": "*" }), B.createReadStream(t).pipe(e)) : (e.writeHead(404), e.end("Not found"));
    return;
  }
  if (n.pathname === "/setup") {
    let t = M.join(xe, "./setup-portal.html");
    B.existsSync(t) || (t = M.join(xe, "../electron/setup-portal.html")), B.existsSync(t) ? (e.writeHead(200, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" }), B.createReadStream(t).pipe(e)) : (console.error("[Main] Setup portal not found at:", t), e.writeHead(404), e.end("Setup portal not found"));
    return;
  }
  if (n.pathname === "/agent-package") {
    let t = M.join(xe, "./VideoWall-agent-v1.1.0.zip");
    B.existsSync(t) || (t = M.join(xe, "../electron/VideoWall-agent-v1.1.0.zip")), B.existsSync(t) ? (e.writeHead(200, {
      "Content-Type": "application/zip",
      "Access-Control-Allow-Origin": "*",
      "Content-Disposition": 'attachment; filename="VideoWall-agent-v1.1.0.zip"'
    }), B.createReadStream(t).pipe(e)) : (console.error("[Main] Agent package not found at:", t), e.writeHead(404), e.end("Agent package not found"));
    return;
  }
  if (n.pathname.startsWith("/wled/effects/")) {
    const t = n.pathname.split("/").pop()?.replace(".gif", "");
    if (t) {
      const i = t.padStart(3, "0"), o = M.join(xe, "../../"), r = [
        M.join(o, "database", "Effects", `FX_${t}.gif`),
        M.join(o, "database", "Effects", `FX_${i}.gif`),
        M.join(o, "database", "Effects", `FX_${t.padStart(2, "0")}.gif`)
      ].find((c) => B.existsSync(c));
      if (r) {
        e.writeHead(200, { "Content-Type": "image/gif", "Access-Control-Allow-Origin": "*" }), B.createReadStream(r).pipe(e);
        return;
      }
    }
    e.writeHead(404), e.end("Effect preview not found");
    return;
  }
  if (n.pathname.startsWith("/wled/palettes/")) {
    const t = n.pathname.split("/").pop()?.replace(".gif", "");
    if (t) {
      const i = t.padStart(2, "0"), o = M.join(xe, "../../"), r = [
        M.join(o, "database", "Palettes", `PAL_${t}.gif`),
        M.join(o, "database", "Palettes", `PAL_${i}.gif`)
      ].find((c) => B.existsSync(c));
      if (r) {
        e.writeHead(200, { "Content-Type": "image/gif", "Access-Control-Allow-Origin": "*" }), B.createReadStream(r).pipe(e);
        return;
      }
    }
    e.writeHead(404), e.end("Palette preview not found");
    return;
  }
  if (n.pathname === "/media") {
    const t = n.searchParams.get("path");
    if (t && B.existsSync(t)) {
      const i = M.extname(t).toLowerCase(), s = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
        ".mov": "video/quicktime",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif"
      }[i] || "application/octet-stream";
      e.writeHead(200, {
        "Content-Type": s,
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes"
      }), B.createReadStream(t).pipe(e);
    } else
      e.writeHead(404), e.end("Not found");
    return;
  }
  e.writeHead(404), e.end("Not found");
});
le.on("connection", (a) => {
  console.log("Client connected to Antigravity Socket:", a.id), le.emit("execute", { type: "REQUEST_STATE" });
  const e = () => {
    const n = Array.from(le.sockets.sockets.values()).map((t) => {
      const i = t._clientUUID ? O.getRemoteClient(t._clientUUID) : null;
      return {
        id: t.id,
        uuid: t._clientUUID || null,
        friendlyName: i?.friendlyName || (t._clientUUID ? "Workstation" : null),
        isLocked: !!i?.isLocked,
        isAuthorized: !!t._isAuthorized,
        type: i?.type || "REMOTE"
      };
    });
    le.emit("execute", { type: "CLIENTS_UPDATE", clients: n });
  };
  e(), a.on("disconnect", () => {
    console.log("Client disconnected:", a.id), e();
  }), a.on("command", (n) => {
    n.type !== "CAMERA_FRAME" && console.log("Command received:", n);
    const t = ["REGISTER_CLIENT", "VERIFY_HOST_PIN", "COMPLETE_REGISTRATION", "VERIFY_CLIENT_PIN"];
    if (!(!a._isAuthorized && !t.includes(n.type))) {
      if (n.type === "EVENT_TRIGGER" && ve.processEvent(n.event), n.type === "STATE_SYNC") {
        for (const i of le.sockets.sockets.values())
          i._isAuthorized && i.id !== a.id && i.emit("execute", n);
        return;
      }
      if (n.type === "REGISTER_CLIENT") {
        const i = n.clientUUID;
        if (a._clientUUID = i, console.log(`--- NETWORK: Registering client ${a.id} with UUID: ${i}`), (a.handshake.address === "127.0.0.1" || a.handshake.address === "::1" || a.handshake.address.includes("localhost") || a.handshake.address.includes("127.0.0.1")) && n.isHost) {
          console.log(`--- NETWORK: Authorizing local Electron host ${a.id}`);
          const c = Array.from(le.sockets.sockets.values()).find((p) => p._clientUUID === i && p._isAuthorized && p.id !== a.id);
          c && (console.log(`--- NETWORK: Host ${i} already connected on ${c.id}. Disconnecting old socket.`), c.disconnect()), a._isAuthorized = !0;
          let u = O.getRemoteClient(i);
          u || (console.log("--- NETWORK: Creating initial DB entry for Host station"), O.upsertRemoteClient({
            id: i,
            friendlyName: "Show Controller (Host)",
            pinCode: "",
            type: "HOST"
          }), u = O.getRemoteClient(i)), a.emit("execute", { type: "AUTHORIZED", friendlyName: u?.friendlyName || "Show Controller" }), e();
          return;
        }
        console.log(`--- NETWORK: Client ${i} is a REMOTE connection (isHost: ${n.isHost}, address: ${a.handshake.address})`);
        const s = O.getRemoteClient(i), r = O.getRemoteClients().filter((c) => c.type !== "HOST");
        s ? (console.log(`--- NETWORK: Client ${i} found in DB as '${s.friendlyName}'. Sending REGISTRATION_REQUIRED (WAITING_PIN).`), a.emit("execute", {
          type: "REGISTRATION_REQUIRED",
          status: "WAITING_PIN",
          friendlyName: s.friendlyName
        })) : (console.log(`--- NETWORK: Client ${i} NOT found in DB. Sending REGISTRATION_REQUIRED (NOT_FOUND).`), a.emit("execute", {
          type: "REGISTRATION_REQUIRED",
          status: "NOT_FOUND",
          existingClients: r.map((c) => ({ id: c.id, friendlyName: c.friendlyName }))
        })), e();
        return;
      }
      if (n.type === "VERIFY_HOST_PIN") {
        const i = O.getAppSettings();
        n.pin === i.accessPin || i.accessPin === "" ? a.emit("execute", { type: "HOST_PIN_CORRECT" }) : a.emit("execute", { type: "HOST_PIN_INCORRECT" });
        return;
      }
      if (n.type === "COMPLETE_REGISTRATION") {
        console.log(`--- NETWORK: Completing registration for ${a._clientUUID} as '${n.friendlyName}'`), O.upsertRemoteClient({
          id: a._clientUUID,
          friendlyName: n.friendlyName,
          pinCode: n.pinCode,
          type: "REMOTE"
        }), a._isAuthorized = !0, a.emit("execute", { type: "AUTHORIZED", friendlyName: n.friendlyName }), e();
        return;
      }
      if (n.type === "VERIFY_CLIENT_PIN") {
        const i = O.getRemoteClient(a._clientUUID), o = O.getAppSettings() || { accessPin: "" }, s = String(n.pin || "").trim(), r = String(o.accessPin || "").trim(), c = String(i?.pinCode || "").trim();
        console.log(`--- NETWORK: PIN Auth for ${a._clientUUID} (${i?.friendlyName || "Unknown"})`), console.log(`--- NETWORK: [${s}] vs Client:[${c}] vs Master:[${r}]`);
        const u = c !== "" && s === c, p = r !== "" && s === r;
        if (u || p) {
          console.log(`--- NETWORK: Auth SUCCESS via ${p ? "MASTER PIN" : "CLIENT PIN"}`);
          const l = Array.from(le.sockets.sockets.values()).find((m) => m._clientUUID === a._clientUUID && m._isAuthorized && m.id !== a.id);
          l && (console.log("--- NETWORK: Active session found for this UUID. Disconnecting old socket."), l.disconnect()), a._isAuthorized = !0, a.emit("execute", { type: "AUTHORIZED", friendlyName: i?.friendlyName || "Show Controller" }), O.updateRemoteClientStatus(a._clientUUID, { lastConnected: /* @__PURE__ */ new Date(), isLocked: !1 }), e();
        } else
          console.log("--- NETWORK: Auth FAILED. Invalid PIN."), a.emit("execute", { type: "CLIENT_PIN_INCORRECT" });
        return;
      }
      if (n.type === "SET_LOCKED") {
        a._clientUUID && (O.updateRemoteClientStatus(a._clientUUID, { isLocked: n.locked }), e());
        return;
      }
      if (n.type === "CAMERA_FRAME") {
        a._cameraFrameCount || (a._cameraFrameCount = 0), a._cameraFrameCount++, a._cameraFrameCount % 50 === 1 && console.log(`[Server] CAMERA_FRAME #${a._cameraFrameCount} from ${a.id} (${a._clientUUID}), broadcasting to ${le.sockets.sockets.size - 1} other clients`), a.broadcast.emit("execute", n);
        return;
      }
      if (n.type === "CAMERA_STOPPED") {
        a.broadcast.emit("execute", n);
        return;
      }
      le.emit("execute", n);
    }
  });
});
C.handle("select-directory", async (a, e) => await Me.showOpenDialog(Se.getFocusedWindow(), {
  ...e,
  properties: ["openDirectory", "createDirectory"]
}));
C.handle("select-file", async (a, e) => await Me.showOpenDialog(Se.getFocusedWindow(), e));
C.handle("save-file-dialog", async (a, e) => await Me.showSaveDialog(Se.getFocusedWindow(), e));
C.handle("db:save-logo", async (a, { arrayBuffer: e }) => {
  const n = Buffer.from(e), t = M.join(me.getPath("userData"), "assets");
  B.existsSync(t) || B.mkdirSync(t, { recursive: !0 });
  const i = M.join(t, "logo.png");
  return B.writeFileSync(i, n), `http://localhost:${On}/logo`;
});
C.handle("db:get-app-settings", () => O.getAppSettings());
C.handle("db:update-app-settings", (a, e) => O.updateAppSettings(e));
C.handle("db:get-shows", () => O.getShows());
C.handle("db:create-show", (a, e) => O.createShow(e));
C.handle("db:update-show", (a, { id: e, partial: n }) => O.updateShow(e, n));
C.handle("db:delete-show", (a, e) => O.deleteShow(e));
C.handle("db:archive-show", (a, { id: e, archived: n }) => O.archiveShow(e, n));
C.handle("db:debug-dump", () => O.debugDump());
C.handle("db:get-tables", () => O.getTables());
C.handle("db:get-table-data", (a, e) => O.getTableData(e));
C.handle("db:update-row", (a, { tableName: e, id: n, data: t }) => O.updateRow(e, n, t));
C.handle("db:delete-row", (a, { tableName: e, id: n }) => O.deleteRow(e, n));
C.handle("db:parse-script", async (a, e) => {
  const n = O.getAppSettings();
  return gc(e, n?.geminiApiKey);
});
C.handle("db:get-devices", (a, e) => {
  const n = O.getDevices(e);
  return console.log(`--- DB: get-devices for ${e}, found ${n.length} devices. IDs: ${n.map((t) => t.id).join(", ")}`), n;
});
C.handle("db:save-devices", (a, { showId: e, devices: n }) => O.saveDevices(e, n));
C.handle("db:get-sequences", (a, e) => O.getSequences(e));
C.handle("db:save-sequences", (a, { showId: e, events: n }) => O.saveSequences(e, n));
C.handle("db:get-remote-clients", () => O.getRemoteClients());
C.handle("db:get-remote-client", (a, e) => O.getRemoteClient(e));
C.handle("db:upsert-remote-client", (a, e) => O.upsertRemoteClient(e));
C.handle("db:update-remote-client-status", (a, { id: e, updates: n }) => O.updateRemoteClientStatus(e, n));
C.handle("db:get-keyboard-bindings", () => O.getKeyboardBindings());
C.handle("db:save-keyboard-bindings", (a, e) => O.saveKeyboardBindings(e));
C.handle("db:cleanup", () => O.cleanupDatabase());
C.handle("get-ip-address", () => {
  const e = oe("os").networkInterfaces(), n = ["wi-fi", "wifi", "ethernet", "lan", "wlan", "en0", "eth0"];
  let t = "127.0.0.1", i = [];
  for (const o of Object.keys(e)) {
    const s = o.toLowerCase();
    if (!(s.includes("vpn") || s.includes("nordlynx") || s.includes("tunnel") || s.includes("virtual") || s.includes("docker") || s.includes("pseudo"))) {
      for (const r of e[o])
        if (r.family === "IPv4" && !r.internal) {
          if (n.some((c) => s.includes(c)))
            return r.address;
          i.push({ name: s, ip: r.address });
        }
    }
  }
  return i.length > 0 ? i[0].ip : t;
});
C.handle("scan-devices", (a) => ps.scan((e, n, t) => {
  try {
    a.sender.isDestroyed() || a.sender.send("scan-progress", { status: e, progress: n, found: t });
  } catch {
  }
}));
C.handle("scan-agents-only", () => ps.scanAgentsOnly());
const us = () => {
  let e = O.getAppSettings()?.testVideoPath;
  return (!e || !B.existsSync(e)) && (e = M.join(xe, "../../Resources/TestBeeld en Audio.mp4"), B.existsSync(e) || (e = M.join(process.resourcesPath, "Resources/TestBeeld en Audio.mp4"))), B.existsSync(e) ? oe("url").pathToFileURL(e).href : null;
};
C.handle("get-test-video-path", () => us());
C.handle("test-device", (a, e) => {
  if (e.type === "local_monitor") {
    const n = ds(e.id, e.monitorId !== void 0 ? e.monitorId : 1), t = us();
    return t && (console.log("[Main] Playing test video from:", t), setTimeout(() => {
      n && !n.isDestroyed() && n.webContents.send("media-play", {
        url: t,
        loop: !0,
        volume: 100,
        mute: !1
      });
    }, 1500)), !0;
  }
  return ve.testDevice(e);
});
C.handle("wled:get-info", (a, e) => ve.getWledInfo(e));
C.handle("wled:get-effects", (a, e) => ve.getWledEffects(e));
C.handle("wled:get-palettes", (a, e) => ve.getWledPalettes(e));
C.handle("wled:read-config", async (a, { ip: e, deviceId: n }) => {
  const t = await ve.getWledInfo(e);
  return t && t.state && t.state.seg ? (O.saveWledSegments(n, t.state.seg), { success: !0, segments: t.state.seg }) : { success: !1, error: "Kon geen segmenten van apparaat lezen" };
});
C.handle("wled:get-stored-config", (a, e) => O.getWledSegments(e));
C.handle("wled:send-command", (a, { ip: e, payload: n }) => ve.sendWledCommand({ ip: e, ...n }));
C.handle("wiz:get-pilot", (a, e) => ve.sendWizCommand(e, "getPilot", {}));
C.handle("db:get-clipboard", () => O.getClipboard());
C.handle("db:add-to-clipboard", (a, { type: e, data: n }) => O.addToClipboard(e, n));
C.handle("db:remove-from-clipboard", (a, e) => O.removeFromClipboard(e));
C.handle("db:clear-clipboard", () => O.clearClipboard());
C.on("app-quit", () => {
  me.quit();
});
C.on("projection-error", (a, e) => {
  const t = Se.getAllWindows().find((i) => i.title === "KLT LedShow Host");
  t && t.webContents.send("flash-message", { type: "error", message: `Projection Error: ${e}` });
});
C.on("test-flash", (a) => {
  a.sender.isDestroyed() || a.sender.send("flash-message", { type: "info", message: "Dit is een test bericht van het systeem." });
});
C.handle("get-displays", () => {
  const a = ia.getAllDisplays(), e = ia.getPrimaryDisplay().id;
  return a.map((n, t) => ({
    id: n.id,
    index: t,
    isPrimary: n.id === e,
    label: `${t + 1}: ${n.size.width}x${n.size.height}${n.id === e ? " (Hoofdscherm)" : ""}`,
    bounds: n.bounds
  }));
});
const he = /* @__PURE__ */ new Map(), De = /* @__PURE__ */ new Map();
function ds(a, e) {
  if (he.has(a)) {
    const o = he.get(a);
    if (!o.isDestroyed())
      return o.focus(), o;
    he.delete(a);
  }
  const n = ia.getAllDisplays(), t = n[e] || n[0], i = new Se({
    x: t.bounds.x,
    y: t.bounds.y,
    width: t.bounds.width,
    height: t.bounds.height,
    fullscreen: !0,
    frame: !1,
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1,
      webSecurity: !1,
      backgroundThrottling: !1,
      autoplayPolicy: "no-user-gesture-required"
    },
    title: `Projection - Device ${a}`
  });
  return process.env.VITE_DEV_SERVER_URL ? i.loadURL(`${process.env.VITE_DEV_SERVER_URL}#projection?deviceId=${a}`) : i.loadFile(M.join(xe, "../dist/index.html"), { hash: `projection?deviceId=${a}` }), he.set(a, i), i.webContents.on("did-finish-load", () => {
    i.webContents.executeJavaScript(`window.projectionDeviceId = "${a}";`), console.log(`[Main] Projection window for ${a} loaded.`);
  }), i.on("closed", () => {
    he.delete(a);
  }), i;
}
C.handle("start-projection", (a, { deviceId: e, monitorIndex: n }) => (ds(e, n), !0));
C.handle("close-projection", (a, e) => {
  const n = he.get(e);
  n && !n.isDestroyed() && n.close(), he.delete(e);
});
C.on("projection-ready", (a, e) => {
  let n = e;
  if (!n) {
    for (const [t, i] of he.entries())
      if (i.webContents === a.sender) {
        n = t;
        break;
      }
  }
  if (n) {
    console.log(`[Main] Projection window ready for device ${n}. Syncing state...`);
    const t = De.get(n);
    t && a.sender.send(`media-${t.command}`, t.payload);
  }
});
C.on("media-ended", (a, { deviceId: e, src: n }) => {
  console.log(`[Main] Media ended on device ${e}: ${n}`), le.emit("execute", {
    type: "MEDIA_FINISHED",
    deviceId: e,
    src: n,
    timestamp: Date.now()
  });
});
C.on("media-status-update", (a, { deviceId: e, status: n }) => {
  if (!e) return;
  const t = De.get(e);
  if (t) {
    t.payload = {
      ...t.payload,
      ...n,
      playing: n.playing
    };
    try {
      O.updateDeviceMediaState(e, t);
    } catch {
    }
  }
});
C.on("media-command", (a, { deviceId: e, command: n, payload: t }) => {
  console.log(`[Main] Media command: ${n} for device ${e}`, t);
  const i = De.get(e) || { command: "stop", payload: {} };
  let o;
  n === "play" ? o = {
    command: "play",
    payload: {
      ...t,
      startTime: Date.now()
    }
  } : n === "stop" ? o = { command: "stop", payload: { fadeOutTime: t?.fadeOutTime || 0 } } : n === "update" ? o = {
    command: i.command,
    payload: { ...i.payload, ...t }
  } : n === "volume" ? o = {
    command: i.command,
    payload: { ...i.payload, volume: t.volume, mute: t.mute }
  } : o = { command: n, payload: t }, De.set(e, o);
  try {
    O.updateDeviceMediaState(e, o);
  } catch (r) {
    console.error("Failed to persist media state to DB:", r);
  }
  const s = he.get(e);
  s && !s.isDestroyed() ? s.webContents.send(`media-${n}`, t) : console.log(`[Main] No window found for device ${e}, command saved for when it opens.`);
});
C.handle("wiz-command", async (a, { ip: e, method: n, params: t }) => await ve.sendWizCommand(e, n, t));
C.handle("upload-to-agent", async (a, { url: e, filePath: n, deviceId: t, fieldName: i }) => {
  console.log(`[Main] Uploading ${n} to ${e} (field: ${i || "video"})...`);
  try {
    const o = oe("form-data"), s = new o(), c = B.statSync(n).size;
    s.append(i || "video", B.createReadStream(n));
    const u = await Ac.post(e, s, {
      headers: {
        ...s.getHeaders()
      },
      maxBodyLength: 1 / 0,
      maxContentLength: 1 / 0,
      onUploadProgress: (p) => {
        const l = c > 0 ? Math.round(p.loaded / c * 100) : 0;
        try {
          a.sender.send("upload-progress", {
            deviceId: t || "unknown",
            filename: M.basename(n),
            percent: l,
            loaded: p.loaded,
            total: c
          });
        } catch {
        }
      }
    });
    return { success: u.status === 200 || u.status === 201 };
  } catch (o) {
    console.error("[Main] Upload failed:", o.message);
    const s = o.response?.data?.error || o.response?.data || o.message || "Onbekende fout";
    return { success: !1, error: typeof s == "object" ? JSON.stringify(s) : String(s) };
  }
});
C.handle("compute-file-checksum", async (a, { filePath: e }) => {
  try {
    const t = oe("node:crypto").createHash("md5"), i = B.createReadStream(e);
    return new Promise((o, s) => {
      i.on("data", (r) => t.update(r)), i.on("end", () => o(t.digest("hex"))), i.on("error", s);
    });
  } catch (n) {
    throw console.error("[Main] Checksum computation failed:", n), n;
  }
});
C.handle("get-latest-agent-version", async () => {
  try {
    const a = M.join("c:", "Antigravity", "Projects", "ShowController", "VideoWall Agent", "package.json");
    if (B.existsSync(a))
      return JSON.parse(B.readFileSync(a, "utf-8")).version || "1.0.0";
  } catch (a) {
    console.error("[Main] Failed to read agent version:", a);
  }
  return "1.0.0";
});
C.handle("prepare-agent-update", async () => {
  try {
    const a = M.join("c:", "Antigravity", "Projects", "ShowController", "VideoWall Agent"), e = M.join(a, "dist"), n = M.join(Sc.tmpdir(), `agent_update_${Date.now()}.zip`), t = oe("node:child_process"), i = `powershell -Command "cd '${e}'; Compress-Archive -Path '*' -DestinationPath '${n}' -Force"`;
    return t.execSync(i), n;
  } catch (a) {
    throw console.error("[Main] Failed to prepare agent update:", a), a;
  }
});
Mn.listen(sa, () => {
  console.log(`Socket.io server running on port ${sa}`);
});
Mn.on("error", (a) => {
  a.code === "EADDRINUSE" && (console.error("Socket Port in use"), Me.showErrorBox("Applicatie is al actief", `Er draait al een instantie van de applicatie op poort ${sa}.
Controleer of de app al open staat en sluit deze eerst af.`), me.quit());
});
Oc.listen(On, () => {
  console.log(`File server running on port ${On} (logo, PDFs)`);
});
const oa = M.join(xe, "../dist");
me.isPackaged || M.join(oa, "../public");
function gi() {
  const e = O.getAppSettings()?.controllerMonitorIndex || 0, n = ia.getAllDisplays(), t = n[e] || n[0], i = new Se({
    x: t.bounds.x,
    y: t.bounds.y,
    width: Math.min(1200, t.bounds.width),
    height: Math.min(800, t.bounds.height),
    fullscreen: !0,
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1,
      webSecurity: !1,
      // Allow loading local resources (file://) and prevent CORS issues
      allowRunningInsecureContent: !0
    },
    title: "KLT LedShow Host"
  });
  if (i.webContents.on("did-fail-load", (o, s, r) => {
    console.error("Failed to load window:", s, r), Me.showErrorBox("Failed to load application", `Error: ${s} - ${r}
Path: ${M.join(oa, "index.html")}`);
  }), process.env.VITE_DEV_SERVER_URL)
    i.loadURL(process.env.VITE_DEV_SERVER_URL);
  else {
    const o = oe("url").pathToFileURL(M.join(oa, "index.html")).href;
    console.log("Loading URL:", o), i.loadURL(o);
  }
}
me ? (me.whenReady().then(() => {
  Ec.handle("ledshow-file", (a) => {
    try {
      let e = a.url.replace("ledshow-file://", "file://");
      const n = new URL(e), t = wi(n), i = oe("url").pathToFileURL(t).href;
      return Rc.fetch(i);
    } catch (e) {
      return console.error("Protocol handler failed:", e, a.url), new Response("File not found", { status: 404 });
    }
  });
  try {
    const a = O.getAllMediaStates();
    for (const { id: e, mediaState: n } of a)
      n && De.set(e, n);
    console.log(`[Main] Restored media state for ${a.length} devices.`);
  } catch (a) {
    console.error("Failed to restore media states from DB:", a);
  }
  gi();
}), me.on("window-all-closed", () => {
  process.platform !== "darwin" && me.quit();
}), me.on("activate", () => {
  Se.getAllWindows().length === 0 && gi();
})) : console.error("Electron app is still undefined. Running in Node instead of Electron?");
