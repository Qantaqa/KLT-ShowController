import path from 'node:path';
import { app } from 'electron';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

class DbManager {
    private db: any;

    constructor() {
        const dbPath = path.join(app.getPath('userData'), 'ledshow.db');
        console.log('--- Initializing Database at:', dbPath);
        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        // App Settings
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

        // Migration: add testVideoPath for existing databases
        try {
            this.db.exec('ALTER TABLE app_settings ADD COLUMN testVideoPath TEXT');
        } catch (e) { /* ignore if column exists */ }

        try {
            this.db.exec('ALTER TABLE app_settings ADD COLUMN geminiApiKey TEXT');
        } catch (e) { /* ignore if column exists */ }

        // Shows
        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN archived INTEGER DEFAULT 0');
        } catch (e) { /* ignore if column exists */ }

        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        } catch (e) { /* ignore if column exists */ }

        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN viewState JSON');
        } catch (e) { /* ignore if column exists */ }

        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN totalPages INTEGER DEFAULT 0');
        } catch (e) { /* ignore if column exists */ }

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
        `);

        // Devices
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                showId TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config JSON,
                mediaState JSON
                -- Removed FK constraint for flexibility with GLOBAL devices
            )
        `);

        // Global devices are show-independent and stored with showId='GLOBAL'
        // We need this entry in the 'shows' table to satisfy FOREIGN KEY constraints
        // even though we hide it from the UI in getShows().
        try {
            this.db.prepare("INSERT OR IGNORE INTO shows (id, name) VALUES ('GLOBAL', 'System Devices')").run();
        } catch (e) { /* ignore */ }

        // Migration: add mediaState column for existing databases
        try {
            this.db.exec('ALTER TABLE devices ADD COLUMN mediaState JSON');
        } catch (e) { /* ignore if column exists */ }

        // Sequences (Events)
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
        `);

        // Remote Clients (Tracking connected stations)
        this.db.exec(`
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

        // Migration: ensure columns exist
        const columns = this.db.pragma('table_info(sequences)').map((c: any) => c.name);

        if (!columns.includes('duration')) this.db.exec('ALTER TABLE sequences ADD COLUMN duration INTEGER');
        if (!columns.includes('filename')) this.db.exec('ALTER TABLE sequences ADD COLUMN filename TEXT');
        if (!columns.includes('segmentId')) this.db.exec('ALTER TABLE sequences ADD COLUMN segmentId INTEGER');
        if (!columns.includes('effectId')) this.db.exec('ALTER TABLE sequences ADD COLUMN effectId INTEGER');
        if (!columns.includes('paletteId')) this.db.exec('ALTER TABLE sequences ADD COLUMN paletteId INTEGER');

        // Clipboard for copy-paste
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                data JSON,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed default settings if empty
        const settings = this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
        if (!settings) {
            this.db.prepare("INSERT INTO app_settings (id, defaultLogo, accessPin, serverPort) VALUES (1, '', '', 3001)").run();
        }
    }

    // App Settings
    getAppSettings() {
        return this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
    }

    updateAppSettings(settings: any) {
        const current = this.getAppSettings();
        console.log('--- DB: updateAppSettings (Incoming partial):', settings);
        const next = { ...current, ...settings };
        console.log('--- DB: updateAppSettings (Final merged):', {
            defaultLogo: next.defaultLogo,
            accessPin: next.accessPin ? 'SET (length:' + next.accessPin.length + ')' : 'EMPTY',
            serverPort: next.serverPort
        });
        return this.db.prepare(`
            UPDATE app_settings 
            SET defaultLogo = ?, accessPin = ?, serverPort = ?, testVideoPath = ?, geminiApiKey = ?
            WHERE id = 1
        `).run(next.defaultLogo, next.accessPin, next.serverPort, next.testVideoPath || '', next.geminiApiKey || '');
    }

    // Shows
    getShows(includeArchived = false) {
        console.log('--- DB: getShows (includeArchived:', includeArchived, ') ---');

        // First check total count regardless of archived filter
        const totalCount = this.db.prepare('SELECT COUNT(*) as count FROM shows').get();
        const archivedCount = this.db.prepare('SELECT COUNT(*) as count FROM shows WHERE archived = 1').get();
        console.log('--- DB: Total shows in DB:', totalCount.count, ', Archived:', archivedCount.count, '---');

        let shows;
        if (includeArchived) {
            shows = this.db.prepare("SELECT * FROM shows WHERE id != 'GLOBAL' ORDER BY updated_at DESC").all();
        } else {
            shows = this.db.prepare("SELECT * FROM shows WHERE (archived = 0 OR archived IS NULL) AND id != 'GLOBAL' ORDER BY updated_at DESC").all();
        }

        console.log('--- DB: Raw shows from query:', shows.length, '---', shows.map((s: any) => ({ id: s.id, name: s.name, archived: s.archived })));

        // Parse JSON fields
        shows = shows.map((s: any) => {
            try {
                return {
                    ...s,
                    schedule: s.schedule ? JSON.parse(s.schedule) : {},
                    viewState: s.viewState ? JSON.parse(s.viewState) : {}
                }
            } catch (e) {
                console.error('Failed to parse show JSON for', s.id, e);
                return { ...s, schedule: {}, viewState: {} };
            }
        });

        console.log('--- DB: found', shows.length, 'shows after filtering ---');
        return shows;
    }

    createShow(show: any) {
        const name = (show.name || '').trim();
        if (!name) {
            throw new Error('Show naam mag niet leeg zijn');
        }
        console.log('--- DB: createShow ---', name);
        return this.db.prepare(`
            INSERT INTO shows (id, name, pdfPath, totalPages, sidebarWidth, invertScriptColors, schedule, viewState)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            show.id,
            show.name,
            show.pdfPath || '',
            show.totalPages || 0,
            show.sidebarWidth || 500,
            show.invertScriptColors ? 1 : 0,
            JSON.stringify(show.schedule || {}),
            JSON.stringify(show.viewState || {})
        );
    }

    updateShow(id: string, partial: any) {
        const fields = Object.keys(partial);
        const values = Object.values(partial).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
        const setClause = fields.map(f => `${f} = ?`).join(', ');

        return this.db.prepare(`
            UPDATE shows SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...values, id);
    }

    deleteShow(id: string) {
        return this.db.prepare('DELETE FROM shows WHERE id = ?').run(id);
    }

    archiveShow(id: string, archived: boolean) {
        return this.db.prepare('UPDATE shows SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(archived ? 1 : 0, id);
    }

    debugDump() {
        return {
            app_settings: this.db.prepare('SELECT * FROM app_settings').all(),
            shows: this.db.prepare('SELECT * FROM shows').all(),
            devices: this.db.prepare('SELECT * FROM devices').all(),
            sequencesCount: this.db.prepare('SELECT COUNT(*) as count FROM sequences').get().count
        };
    }

    getTables() {
        return this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((t: any) => t.name);
    }

    getTableData(tableName: string) {
        // Basic validation to prevent SQL injection even if internal
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }
        return this.db.prepare(`SELECT * FROM ${tableName}`).all();
    }

    updateRow(tableName: string, id: any, data: any) {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table');

        const keys = Object.keys(data).filter(k => k !== 'id');
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => {
            const val = data[k];
            return typeof val === 'object' ? JSON.stringify(val) : val;
        });

        return this.db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    deleteRow(tableName: string, id: any) {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table');
        return this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
    }

    // Devices
    getDevices(showId: string) {
        return this.db.prepare('SELECT * FROM devices WHERE showId = ?').all(showId).map((d: any) => {
            const config = JSON.parse(d.config || '{}');
            const mediaState = d.mediaState ? JSON.parse(d.mediaState) : null;
            return {
                ...d,
                ...config,
                mediaState
            };
        });
    }

    saveDevices(showId: string, devices: any[]) {
        const deleteStmt = this.db.prepare('DELETE FROM devices WHERE showId = ?');
        const insertStmt = this.db.prepare('INSERT INTO devices (id, showId, name, type, config, mediaState) VALUES (?, ?, ?, ?, ?, ?)');

        const transaction = this.db.transaction((showId: string, devices: any[]) => {
            deleteStmt.run(showId);
            for (const device of devices) {
                insertStmt.run(
                    device.id,
                    showId,
                    device.name,
                    device.type,
                    JSON.stringify(device),
                    device.mediaState ? JSON.stringify(device.mediaState) : null
                );
            }
        });

        return transaction(showId, devices);
    }

    updateDeviceMediaState(id: string, mediaState: any) {
        return this.db.prepare('UPDATE devices SET mediaState = ? WHERE id = ?').run(
            JSON.stringify(mediaState),
            id
        );
    }

    getAllMediaStates() {
        return this.db.prepare('SELECT id, mediaState FROM devices WHERE mediaState IS NOT NULL').all().map((d: any) => ({
            id: d.id,
            mediaState: d.mediaState ? JSON.parse(d.mediaState) : null
        }));
    }

    // Sequences
    getSequences(showId: string) {
        return this.db.prepare('SELECT * FROM sequences WHERE showId = ? ORDER BY id ASC').all(showId).map((s: any) => ({
            ...s,
            sound: !!s.sound
        }));
    }

    saveSequences(showId: string, events: any[]) {
        const deleteStmt = this.db.prepare('DELETE FROM sequences WHERE showId = ?');
        const insertStmt = this.db.prepare(`
            INSERT INTO sequences 
            (showId, act, sceneId, eventId, type, cue, fixture, effect, palette, color1, color2, color3, brightness, speed, intensity, transition, sound, scriptPg, duration, filename, segmentId, effectId, paletteId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = this.db.transaction((showId: string, events: any[]) => {
            deleteStmt.run(showId);
            for (const e of events) {
                insertStmt.run(
                    showId, e.act, e.sceneId, e.eventId, e.type, e.cue,
                    e.fixture || '', e.effect || '', e.palette || '',
                    e.color1 || '', e.color2 || '', e.color3 || '',
                    e.brightness ?? 255, e.speed ?? 127, e.intensity ?? 127,
                    e.transition ?? 0, e.sound ? 1 : 0, e.scriptPg ?? 1,
                    e.duration ?? null, e.filename || '',
                    e.segmentId !== undefined ? e.segmentId : null,
                    e.effectId !== undefined ? e.effectId : null,
                    e.paletteId !== undefined ? e.paletteId : null
                );
            }
        });

        try {
            return transaction(showId, events);
        } catch (err: any) {
            console.error('Failed to save sequences:', err);
            throw err;
        }
    }

    // Remote Clients
    getRemoteClients() {
        return this.db.prepare('SELECT * FROM remote_clients ORDER BY lastConnected DESC').all().map((c: any) => ({
            ...c,
            isCameraActive: !!c.isCameraActive,
            isSelfPreviewVisible: !!c.isSelfPreviewVisible,
            isLocked: !!c.isLocked,
            selectedCameraClients: c.selectedCameraClients ? JSON.parse(c.selectedCameraClients) : []
        }));
    }

    getRemoteClient(id: string) {
        const c = this.db.prepare('SELECT * FROM remote_clients WHERE id = ?').get(id);
        if (!c) return null;
        return {
            ...c,
            isCameraActive: !!c.isCameraActive,
            isSelfPreviewVisible: !!c.isSelfPreviewVisible,
            isLocked: !!c.isLocked,
            selectedCameraClients: c.selectedCameraClients ? JSON.parse(c.selectedCameraClients) : []
        };
    }

    upsertRemoteClient(client: any) {
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
            client.id,
            client.friendlyName,
            client.pinCode,
            client.type || 'REMOTE',
            client.isCameraActive ? 1 : 0,
            client.isSelfPreviewVisible !== false ? 1 : 0,
            JSON.stringify(client.selectedCameraClients || []),
            client.isLocked ? 1 : 0
        );
    }

    updateRemoteClientStatus(id: string, updates: any) {
        const fields = Object.keys(updates);
        const values = Object.values(updates).map(v => {
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
            return v;
        });
        const setClause = fields.map(f => `${f} = ?`).join(', ');

        return this.db.prepare(`
            UPDATE remote_clients SET ${setClause}, lastConnected = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...values, id);
    }

    // Clipboard
    getClipboard() {
        return this.db.prepare("SELECT * FROM clipboard ORDER BY timestamp DESC").all().map((item: any) => ({
            ...item,
            data: JSON.parse(item.data)
        }));
    }

    addToClipboard(type: string, data: any) {
        return this.db.prepare("INSERT INTO clipboard (type, data) VALUES (?, ?)").run(type, JSON.stringify(data));
    }

    removeFromClipboard(id: number) {
        return this.db.prepare("DELETE FROM clipboard WHERE id = ?").run(id);
    }

    clearClipboard() {
        return this.db.prepare("DELETE FROM clipboard").run();
    }

    cleanupDatabase() {
        const archivedShows = this.db.prepare("SELECT id FROM shows WHERE archived = 1 AND id != 'GLOBAL'").all();
        const showIds = archivedShows.map((s: any) => s.id);

        if (showIds.length === 0) return { deletedCount: 0 };

        const transaction = this.db.transaction(() => {
            // Explicitly delete associated data (Devices don't have FK CASCADE in this schema yet)
            const placeholders = showIds.map(() => '?').join(',');

            this.db.prepare(`DELETE FROM sequences WHERE showId IN (${placeholders})`).run(...showIds);
            this.db.prepare(`DELETE FROM devices WHERE showId IN (${placeholders})`).run(...showIds);

            const result = this.db.prepare("DELETE FROM shows WHERE archived = 1 AND id != 'GLOBAL'").run();
            return { deletedCount: result.changes };
        });

        return transaction();
    }
}

export const dbManager = new DbManager();
