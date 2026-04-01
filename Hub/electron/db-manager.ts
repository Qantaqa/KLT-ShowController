import path from 'node:path';
import { app } from 'electron';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

/**
 * Manages the SQLite database for the application, handling schema initialization,
 * migrations, and data persistence for settings, shows, devices, and sequences.
 */
class DbManager {
    private db: any;

    /**
     * Initializes the database connection and runs initial schema setup.
     */
    constructor() {
        // Construct the path to the database file in the user's data directory
        const dbPath = path.join(app.getPath('userData'), 'ledshow.db');
        console.log('--- Initializing Database at:', dbPath);

        // Create a new database connection
        this.db = new Database(dbPath);

        // Initialize tables and run migrations
        this.init();
    }

    /**
     * Internal method to initialize database tables and apply schema migrations.
     * Checks for existing columns before adding them to maintain compatibility.
     */
    private init() {
        // Create the application settings table if it doesn't exist
        // The check (id = 1) ensures only a single row of settings exists
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

        // Migration: Attempt to add testVideoPath for older database versions
        try {
            this.db.exec('ALTER TABLE app_settings ADD COLUMN testVideoPath TEXT');
        } catch (e) {
            // If the column already exists, SQLite will throw an error which we safely ignore
        }

        // Migration: Attempt to add geminiApiKey for older database versions
        try {
            this.db.exec('ALTER TABLE app_settings ADD COLUMN geminiApiKey TEXT');
        } catch (e) {
            // Safely ignore if the column is already present
        }

        // Migration: Ensure 'shows' table has the 'archived' column
        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN archived INTEGER DEFAULT 0');
        } catch (e) { /* ignore if column exists */ }

        // Migration: Ensure 'shows' table has the 'updated_at' timestamp
        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        } catch (e) { /* ignore if column exists */ }

        // Migration: Ensure 'shows' table has the 'viewState' JSON column
        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN viewState JSON');
        } catch (e) { /* ignore if column exists */ }

        // Migration: Ensure 'shows' table has the 'totalPages' column
        try {
            this.db.exec('ALTER TABLE shows ADD COLUMN totalPages INTEGER DEFAULT 0');
        } catch (e) { /* ignore if column exists */ }

        // Create the main shows table with all required fields
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

        // Create the devices table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                showId TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config JSON,
                mediaState JSON
            )
        `);

        // Seed a 'GLOBAL' entry in the shows table to allow for show-independent devices
        // This maintains relational integrity if foreign keys are enabled later
        try {
            this.db.prepare("INSERT OR IGNORE INTO shows (id, name) VALUES ('GLOBAL', 'System Devices')").run();
        } catch (e) { /* ignore */ }

        // Migration: Ensure 'devices' table has the 'mediaState' column for persistence
        try {
            this.db.exec('ALTER TABLE devices ADD COLUMN mediaState JSON');
        } catch (e) { /* ignore if column exists */ }

        // Create the sequences table which stores individual show events/actions
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
                -- Stop marker: if set on a media/light row, playback will auto-stop when entering this target group.
                stopAct TEXT,
                stopSceneId INTEGER,
                stopEventId INTEGER,
                FOREIGN KEY(showId) REFERENCES shows(id) ON DELETE CASCADE
            )
        `);

        // Create remote_clients table to track connected control stations
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

        // Get column information for sequences to perform conditional migrations
        const columns = this.db.pragma('table_info(sequences)').map((c: any) => c.name);

        // Test if 'duration' column is missing; if true, add it
        if (!columns.includes('duration')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN duration INTEGER');
        }

        // Test if 'filename' column is missing; if true, add it
        if (!columns.includes('filename')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN filename TEXT');
        }

        // Test if 'segmentId' column is missing; if true, add it
        if (!columns.includes('segmentId')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN segmentId INTEGER');
        }

        // Test if 'effectId' column is missing; if true, add it
        if (!columns.includes('effectId')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN effectId INTEGER');
        }

        // Test if 'paletteId' column is missing; if true, add it
        if (!columns.includes('paletteId')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN paletteId INTEGER');
        }

        // Stop marker columns (added later)
        if (!columns.includes('stopAct')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN stopAct TEXT');
        }
        if (!columns.includes('stopSceneId')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN stopSceneId INTEGER');
        }
        if (!columns.includes('stopEventId')) {
            this.db.exec('ALTER TABLE sequences ADD COLUMN stopEventId INTEGER');
        }

        // Create the clipboard table for copy/paste functionality between shows/events
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                data JSON,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if application settings exist
        const settings = this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get();

        // If settings record is missing (first run), insert default values
        if (!settings) {
            this.db.prepare("INSERT INTO app_settings (id, defaultLogo, accessPin, serverPort) VALUES (1, '', '', 3001)").run();
        }

        // Create wled_segments table to store segment configuration for WLED devices
        // Using 'id' as primary key for compatibility with generic DB handlers (DatabaseManager)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS wled_segments (
                id TEXT PRIMARY KEY,
                segments JSON NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Rename 'deviceId' to 'id' if needed
        const wledColumns = this.db.pragma('table_info(wled_segments)').map((c: any) => c.name);
        if (wledColumns.includes('deviceId') && !wledColumns.includes('id')) {
            this.db.exec('ALTER TABLE wled_segments RENAME COLUMN deviceId TO id');
        }

        // Create keyboard_bindings table for remote devices like Sayodevice
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS keyboard_bindings (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL,
                ctrl INTEGER DEFAULT 0,
                shift INTEGER DEFAULT 0,
                alt INTEGER DEFAULT 0,
                action TEXT NOT NULL,
                label TEXT
            )
        `);

        // Seed default bindings if table is empty
        const bindingCount = this.db.prepare('SELECT COUNT(*) as count FROM keyboard_bindings').get().count;
        if (bindingCount === 0) {
            const defaults = [
                { id: 'btn_1', key: 'F1', ctrl: 1, shift: 1, alt: 1, action: 'nextAct', label: 'Knop 1' },
                { id: 'btn_2', key: 'F2', ctrl: 1, shift: 1, alt: 1, action: 'stopAll', label: 'Knop 2' },
                { id: 'btn_3', key: 'F3', ctrl: 1, shift: 1, alt: 1, action: 'nextScene', label: 'Knop 3' },
                { id: 'btn_4', key: 'F4', ctrl: 1, shift: 1, alt: 1, action: 'nextAct', label: 'Knop 4' },
                { id: 'btn_5', key: 'F5', ctrl: 1, shift: 1, alt: 1, action: 'pageUp', label: 'Knop 5' },
                { id: 'btn_6', key: 'F6', ctrl: 1, shift: 1, alt: 1, action: 'pageDown', label: 'Knop 6' }
            ];
            const insert = this.db.prepare('INSERT INTO keyboard_bindings (id, key, ctrl, shift, alt, action, label) VALUES (?, ?, ?, ?, ?, ?, ?)');
            for (const b of defaults) {
                insert.run(b.id, b.key, b.ctrl, b.shift, b.alt, b.action, b.label);
            }
        }
    }

    /**
     * Retrieves the global application settings from the database.
     * @returns The application settings object, or undefined if not found.
     */
    getAppSettings() {
        return this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
    }

    /**
     * Updates the application settings. Merges the current settings with the provided updates.
     * @param settings Partial settings object containing the fields to update.
     */
    updateAppSettings(settings: any) {
        // Fetch current settings to ensure we don't lose values not provided in the 'settings' partial
        const current = this.getAppSettings();
        console.log('--- DB: updateAppSettings (Incoming partial):', settings);

        // Merge current settings with incoming updates
        const next = { ...current, ...settings };

        console.log('--- DB: updateAppSettings (Final merged):', {
            defaultLogo: next.defaultLogo,
            accessPin: next.accessPin ? 'SET (length:' + next.accessPin.length + ')' : 'EMPTY',
            serverPort: next.serverPort
        });

        // Persist the merged settings back to the database
        return this.db.prepare(`
            UPDATE app_settings 
            SET defaultLogo = ?, accessPin = ?, serverPort = ?, testVideoPath = ?, geminiApiKey = ?
            WHERE id = 1
        `).run(next.defaultLogo, next.accessPin, next.serverPort, next.testVideoPath || '', next.geminiApiKey || '');
    }

    /**
     * Retrieves all shows, excluding the system 'GLOBAL' entry.
     * @param includeArchived Whether to include archived shows in the result. Default is false.
     * @returns An array of show objects with parsed JSON fields.
     */
    getShows(includeArchived = false) {
        console.log('--- DB: getShows (includeArchived:', includeArchived, ') ---');

        // Statistics logging: get total and archived counts for debugging
        const totalCount = this.db.prepare('SELECT COUNT(*) as count FROM shows').get();
        const archivedCount = this.db.prepare('SELECT COUNT(*) as count FROM shows WHERE archived = 1').get();
        console.log('--- DB: Total shows in DB:', totalCount.count, ', Archived:', archivedCount.count, '---');

        let shows;
        // Verify if we should include archived items in the result set
        if (includeArchived) {
            // Fetch everything except the system GLOBAL show, ordered by most recently updated
            shows = this.db.prepare("SELECT * FROM shows WHERE id != 'GLOBAL' ORDER BY updated_at DESC").all();
        } else {
            // Fetch only non-archived shows, excluding GLOBAL
            shows = this.db.prepare("SELECT * FROM shows WHERE (archived = 0 OR archived IS NULL) AND id != 'GLOBAL' ORDER BY updated_at DESC").all();
        }

        console.log('--- DB: Raw shows from query:', shows.length, '---', shows.map((s: any) => ({ id: s.id, name: s.name, archived: s.archived })));

        // Iterate through shows to parse nested JSON fields into dynamic objects
        shows = shows.map((s: any) => {
            try {
                return {
                    ...s,
                    // Parse schedule if it exists, otherwise provide default empty object
                    schedule: s.schedule ? JSON.parse(s.schedule) : {},
                    // Parse viewState if it exists, otherwise provide default empty object
                    viewState: s.viewState ? JSON.parse(s.viewState) : {}
                }
            } catch (e) {
                // If JSON parsing fails (corruption or invalid format), log error and return safe defaults
                console.error('Failed to parse show JSON for', s.id, e);
                return { ...s, schedule: {}, viewState: {} };
            }
        });

        console.log('--- DB: found', shows.length, 'shows after filtering ---');
        return shows;
    }

    /**
     * Creates a new show in the database.
     * @param show The show object containing details like id, name, and settings.
     * @throws Error if the show name is empty.
     */
    createShow(show: any) {
        // Sanitize name by trimming whitespace
        const name = (show.name || '').trim();

        // Test if name is empty; if true, reject creation with an error
        if (!name) {
            throw new Error('Show naam mag niet leeg zijn');
        }

        console.log('--- DB: createShow ---', name);

        // Insert new show record with provided or default values
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

    /**
     * Updates specific fields of an existing show.
     * @param id The unique identifier of the show.
     * @param partial A subset of show fields to update.
     */
    updateShow(id: string, partial: any) {
        // Collect field names from the partial object keys
        const fields = Object.keys(partial);

        // Map values, ensuring complex objects are stringified for JSON columns
        const values = Object.values(partial).map(v => typeof v === 'object' ? JSON.stringify(v) : v);

        // Build dynamic SET clause for the SQL UPDATE statement
        const setClause = fields.map(f => `${f} = ?`).join(', ');

        // Execute update and update the updated_at timestamp
        return this.db.prepare(`
            UPDATE shows SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...values, id);
    }

    /**
     * Deletes a show permanently from the database.
     * @param id The unique identifier of the show.
     */
    deleteShow(id: string) {
        return this.db.prepare('DELETE FROM shows WHERE id = ?').run(id);
    }

    /**
     * Toggles a show's archived status.
     * @param id The unique identifier of the show.
     * @param archived True to archive, false to restore.
     */
    archiveShow(id: string, archived: boolean) {
        return this.db.prepare('UPDATE shows SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(archived ? 1 : 0, id);
    }

    /**
     * Dumps key tables for debugging purposes.
     * @returns An object containing the contents of settings, shows, and devices, plus a sequence count.
     */
    debugDump() {
        return {
            app_settings: this.db.prepare('SELECT * FROM app_settings').all(),
            shows: this.db.prepare('SELECT * FROM shows').all(),
            devices: this.db.prepare('SELECT * FROM devices').all(),
            sequencesCount: this.db.prepare('SELECT COUNT(*) as count FROM sequences').get().count
        };
    }

    /**
     * Retrieves a list of all user-defined table names in the database.
     * @returns An array of table names.
     */
    getTables() {
        return this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((t: any) => t.name);
    }

    /**
     * Fetches all rows from a specified table.
     * @param tableName The name of the table to query.
     * @returns An array of row objects.
     * @throws Error if the table name contains invalid characters.
     */
    getTableData(tableName: string) {
        // Basic validation to prevent SQL injection: only allow alphanumeric and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }
        return this.db.prepare(`SELECT * FROM ${tableName}`).all();
    }

    /**
     * Updates a specific row in a table.
     * @param tableName The table containing the row.
     * @param id The ID of the row to update.
     * @param data Object containing the fields and values to update.
     * @throws Error if the table name is invalid.
     */
    updateRow(tableName: string, id: any, data: any) {
        // Sanity check for the table name to prevent injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table');

        // Filter out 'id' from fields to be updated
        const keys = Object.keys(data).filter(k => k !== 'id');

        // Construct the SET clause dynamically
        const setClause = keys.map(k => `${k} = ?`).join(', ');

        // Prepare values, stringifying objects for storage as JSON
        const values = keys.map(k => {
            const val = data[k];
            return typeof val === 'object' ? JSON.stringify(val) : val;
        });

        return this.db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    /**
     * Deletes a specific row from a table.
     * @param tableName The table to delete from.
     * @param id The ID of the row to delete.
     * @throws Error if the table name is invalid.
     */
    deleteRow(tableName: string, id: any) {
        // Sanity check for the table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table');
        return this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
    }

    /**
     * Retrieves all devices associated with a specific show.
     * @param showId The ID of the show.
     * @returns An array of device objects with nested config and mediaState parsed.
     */
    getDevices(showId: string) {
        return this.db.prepare('SELECT * FROM devices WHERE showId = ?').all(showId).map((d: any) => {
            // Devices store their full object in 'config' as JSON
            const config = JSON.parse(d.config || '{}');

            // mediaState is tracked separately for easy updates
            const mediaState = d.mediaState ? JSON.parse(d.mediaState) : null;

            // Merge database fields with the parsed configuration
            return {
                ...d,
                ...config,
                mediaState
            };
        });
    }

    /**
     * Saves a list of devices for a show, replacing any existing devices.
     * Runs as a single atomic transaction.
     * @param showId The show to save devices for.
     * @param devices Array of device objects.
     */
    saveDevices(showId: string, devices: any[]) {
        const deleteStmt = this.db.prepare('DELETE FROM devices WHERE showId = ?');
        const insertStmt = this.db.prepare('INSERT INTO devices (id, showId, name, type, config, mediaState) VALUES (?, ?, ?, ?, ?, ?)');

        // Define the transaction to ensure all-or-nothing persistence
        const transaction = this.db.transaction((showId: string, devices: any[]) => {
            // First, remove all existing devices for this show
            deleteStmt.run(showId);

            // Then, insert each new device provided
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

        // Execute the transaction
        return transaction(showId, devices);
    }

    /**
     * Updates the persistent media state (e.g. current file, volume) of a device.
     * @param id The device identifier.
     * @param mediaState The new media state object.
     */
    updateDeviceMediaState(id: string, mediaState: any) {
        return this.db.prepare('UPDATE devices SET mediaState = ? WHERE id = ?').run(
            JSON.stringify(mediaState),
            id
        );
    }

    /**
     * Retrieves all non-null media states from all devices.
     * Useful for restoring state after a restart.
     * @returns An array of objects containing device ID and parsed mediaState.
     */
    getAllMediaStates() {
        return this.db.prepare('SELECT id, mediaState FROM devices WHERE mediaState IS NOT NULL').all().map((d: any) => ({
            id: d.id,
            mediaState: d.mediaState ? JSON.parse(d.mediaState) : null
        }));
    }

    /**
     * Retrieves all sequence events for a specific show, ordered by their creation/ID.
     * @param showId The ID of the show.
     * @returns Array of sequence event objects.
     */
    getSequences(showId: string) {
        return this.db.prepare('SELECT * FROM sequences WHERE showId = ? ORDER BY id ASC').all(showId).map((s: any) => ({
            ...s,
            // Convert integer (0/1) from SQLite to boolean for frontend consistency
            sound: !!s.sound
        }));
    }

    /**
     * Saves a list of sequence events (acts/scenes/events) for a show.
     * Deletes existing sequences for the show first within a transaction.
     * @param showId The show to save sequences for.
     * @param events Array of event objects.
     */
    saveSequences(showId: string, events: any[]) {
        const deleteStmt = this.db.prepare('DELETE FROM sequences WHERE showId = ?');
        const insertStmt = this.db.prepare(`
            INSERT INTO sequences 
            (showId, act, sceneId, eventId, type, cue, fixture, effect, palette, color1, color2, color3, brightness, speed, intensity, transition, sound, scriptPg, duration, filename, segmentId, effectId, paletteId, stopAct, stopSceneId, stopEventId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Perform the save as an atomic transaction to prevent partial show data
        const transaction = this.db.transaction((showId: string, events: any[]) => {
            // Remove old sequence data
            deleteStmt.run(showId);

            // Insert each event in the new list
            for (const e of events) {
                insertStmt.run(
                    showId, e.act, e.sceneId, e.eventId, e.type, e.cue,
                    e.fixture || '', e.effect || '', e.palette || '',
                    e.color1 || '', e.color2 || '', e.color3 || '',
                    e.brightness ?? 255, e.speed ?? 127, e.intensity ?? 127,
                    e.transition ?? 0, e.sound ? 1 : 0, e.scriptPg ?? 1,
                    e.duration ?? null, e.filename || '',
                    // Use segment/effect/palette IDs if present, otherwise null
                    e.segmentId !== undefined ? e.segmentId : null,
                    e.effectId !== undefined ? e.effectId : null,
                    e.paletteId !== undefined ? e.paletteId : null,
                    // Stop marker (optional)
                    e.stopAct || null,
                    e.stopSceneId !== undefined ? e.stopSceneId : null,
                    e.stopEventId !== undefined ? e.stopEventId : null
                );
            }
        });

        try {
            return transaction(showId, events);
        } catch (err: any) {
            // Log failure to save sequences for troubleshooting
            console.error('Failed to save sequences:', err);
            throw err;
        }
    }

    /**
     * Retrieves all registered remote clients (e.g. tablet controllers).
     * @returns Array of remote client objects.
     */
    getRemoteClients() {
        return this.db.prepare('SELECT * FROM remote_clients ORDER BY lastConnected DESC').all().map((c: any) => ({
            ...c,
            // Convert SQLite integers to booleans for the frontend
            isCameraActive: !!c.isCameraActive,
            isSelfPreviewVisible: !!c.isSelfPreviewVisible,
            isLocked: !!c.isLocked,
            // Parse selected camera views from JSON string
            selectedCameraClients: c.selectedCameraClients ? JSON.parse(c.selectedCameraClients) : []
        }));
    }

    /**
     * Retrieves a single remote client by ID.
     * @param id The client ID.
     * @returns The remote client object or null if not found.
     */
    getRemoteClient(id: string) {
        const c = this.db.prepare('SELECT * FROM remote_clients WHERE id = ?').get(id);

        // If client doesn't exist, return null
        if (!c) return null;

        return {
            ...c,
            isCameraActive: !!c.isCameraActive,
            isSelfPreviewVisible: !!c.isSelfPreviewVisible,
            isLocked: !!c.isLocked,
            selectedCameraClients: c.selectedCameraClients ? JSON.parse(c.selectedCameraClients) : []
        };
    }

    /**
     * Registers or updates a remote client's info (IDs, name, status).
     * @param client The client data object.
     */
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
            // Ensure visibility is default on (1) if not explicitly disabled
            client.isSelfPreviewVisible !== false ? 1 : 0,
            JSON.stringify(client.selectedCameraClients || []),
            client.isLocked ? 1 : 0
        );
    }

    /**
     * Updates specific status fields for a remote client (e.g. heartbeat/connection status).
     * @param id The client ID.
     * @param updates Object containing the fields to update.
     */
    updateRemoteClientStatus(id: string, updates: any) {
        const fields = Object.keys(updates);

        // Map updates to appropriate SQLite types (booleans to 0/1, objects to JSON)
        const values = Object.values(updates).map(v => {
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
            return v;
        });

        // Build dynamic SET clause
        const setClause = fields.map(f => `${f} = ?`).join(', ');

        return this.db.prepare(`
            UPDATE remote_clients SET ${setClause}, lastConnected = CURRENT_TIMESTAMP WHERE id = ?
        `).run(...values, id);
    }

    /**
     * Retrieves all items currently stored in the clipboard.
     * @returns Array of clipboard items with parsed data.
     */
    getClipboard() {
        return this.db.prepare("SELECT * FROM clipboard ORDER BY timestamp DESC").all().map((item: any) => ({
            ...item,
            // Parse the JSON data of the copied item
            data: JSON.parse(item.data)
        }));
    }

    /**
     * Adds an item to the clipboard.
     * @param type The type of data (e.g. 'EVENT', 'ACT').
     * @param data The data object to be copied.
     */
    addToClipboard(type: string, data: any) {
        return this.db.prepare("INSERT INTO clipboard (type, data) VALUES (?, ?)").run(type, JSON.stringify(data));
    }

    /**
     * Removes a specific item from the clipboard.
     * @param id The clipboard item ID.
     */
    removeFromClipboard(id: number) {
        return this.db.prepare("DELETE FROM clipboard WHERE id = ?").run(id);
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
        // Find all shows marked for archiving, excluding the system GLOBAL show
        const archivedShows = this.db.prepare("SELECT id FROM shows WHERE archived = 1 AND id != 'GLOBAL'").all();
        const showIds = archivedShows.map((s: any) => s.id);

        // Test if there are any shows to clean up; if false, exit early
        if (showIds.length === 0) {
            return { deletedCount: 0 };
        }

        const transaction = this.db.transaction(() => {
            // Build placeholders (?, ?, ...) for the IN clause
            const placeholders = showIds.map(() => '?').join(',');

            // Explicitly delete associated data (Sequences use ON DELETE CASCADE, but Devices might not)
            this.db.prepare(`DELETE FROM sequences WHERE showId IN (${placeholders})`).run(...showIds);
            this.db.prepare(`DELETE FROM devices WHERE showId IN (${placeholders})`).run(...showIds);

            // Cleanup orphaned WLED segments (segments whose device is no longer in the devices table)
            this.db.prepare("DELETE FROM wled_segments WHERE id NOT IN (SELECT id FROM devices)").run();

            // Finally, delete the show records themselves
            const result = this.db.prepare("DELETE FROM shows WHERE archived = 1 AND id != 'GLOBAL'").run();
            return { deletedCount: result.changes };
        });

        return transaction();
    }

    /**
     * Saves (overwrites) stored WLED segments for a specific device.
     * @param deviceId The unique ID of the device.
     * @param segments Array of segment objects.
     */
    saveWledSegments(deviceId: string, segments: any[]) {
        return this.db.prepare(`
            INSERT INTO wled_segments (id, segments, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                segments = excluded.segments,
                updated_at = CURRENT_TIMESTAMP
        `).run(deviceId, JSON.stringify(segments));
    }

    /**
     * Retrieves the stored WLED segments for a specific device.
     * @param deviceId The unique ID of the device.
     * @returns Array of segment objects or null if none are stored.
     */
    getWledSegments(deviceId: string) {
        const row = this.db.prepare('SELECT segments FROM wled_segments WHERE id = ?').get(deviceId);
        return row ? JSON.parse(row.segments) : null;
    }

    /**
     * Retrieves all keyboard bindings.
     */
    getKeyboardBindings() {
        return this.db.prepare('SELECT * FROM keyboard_bindings ORDER BY id ASC').all().map((b: any) => ({
            ...b,
            ctrl: !!b.ctrl,
            shift: !!b.shift,
            alt: !!b.alt
        }));
    }

    /**
     * Saves a list of keyboard bindings.
     */
    saveKeyboardBindings(bindings: any[]) {
        const deleteStmt = this.db.prepare('DELETE FROM keyboard_bindings');
        const insertStmt = this.db.prepare('INSERT INTO keyboard_bindings (id, key, ctrl, shift, alt, action, label) VALUES (?, ?, ?, ?, ?, ?, ?)');

        const transaction = this.db.transaction((bindings: any[]) => {
            deleteStmt.run();
            for (const b of bindings) {
                insertStmt.run(b.id, b.key, b.ctrl ? 1 : 0, b.shift ? 1 : 0, b.alt ? 1 : 0, b.action, b.label);
            }
        });

        return transaction(bindings);
    }
}

export const dbManager = new DbManager();
