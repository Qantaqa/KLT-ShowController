# LedShow Master Documentation

This document serves as the high-level technical overview of the LedShow project. It is managed by the Central Orchestrator.

## 🏗️ System Architecture

### 1. Host Application (Windows 11)
- **Framework**: Electron + React + Vite.
- **Role**: Central controller, UI for show management, and server for remote devices.
- **Networking**: 
  - UDP Discovery on port `5566`.
  - HTTP/WebSocket for control commands.
- **Data Storage**: SQLite (via `better-sqlite3`).

### 2. Remote Devices (Windows / Raspberry Pi)
- **Component**: `ledshow-agent`.
- **Media Player**: MPV Player (controlled via JSON-IPC).
- **Communication**: Responds to commands from the Host (Play, Stop, Sync).

### 3. Database Layer
- **File**: `ledshow.db` (located in `%APPDATA%\ledshow-app\`).
- **Engines**: `DbManager.ts` in the Electron layer handles all CRUD operations.

## 🕸️ Integration Flow

1. **Discovery**: Host scans the local network for Agents.
2. **Setup**: Agents are added to the Host database; Host generates a `start.bat` for distribution.
3. **Execution**: Host triggers media playback on specific Agents based on the Show Sequence.

## 🛠️ Testing & Verification
- **Network Connectivity**: Verify UDP port `5566` is open.
- **Media Playback**: Ensure MPV is accessible in the system path of the Remote Device.
- **Database Consistency**: Check `%APPDATA%` for the sqlite file.
