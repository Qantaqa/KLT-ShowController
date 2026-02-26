# LedShow Configuration Registry

This registry tracks all critical configuration files, paths, and environment settings across the system.

## ⚙️ Core Configuration Files

### 1. Host (Electron/React)
- **File**: `ledshow-app/package.json`
  - Versioning, dependencies (Electron, Vite, Better-SQLite3).
- **File**: `ledshow-app/vite.config.ts`
  - Build settings, dev server configuration.
- **Database**: `%APPDATA%\ledshow-app\ledshow.db`
  - The SQLite database containing all app state.

### 2. Agent (Node.js)
- **File**: `ledshow-agent/package.json`
  - Dependencies (Socket.io, MPV-specific libs).
- **File**: `ledshow-agent/start.bat`
  - Auto-generated startup script for agents.

### 3. Legacy / Bridge
- **File**: `App.config` (Root)
  - Legacy VB.NET application configuration (mostly deprecated by the new Electron system).

## 📡 Network Configuration

| Service | Port | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **UDP Discovery** | 5566 | UDP | Agent broadcast and Host scanning |
| **API Server** | 3001 | TCP/HTTP | Host server for API requests |
| **Socket.io** | 3001 | TCP/WS | Real-time communication between Host and Agent |
| **Vite Dev** | 5173 | TCP/HTTP | Development server UI |

## 📂 Data Paths
- **Logs**: `%APPDATA%\ledshow-app\logs\`
- **Media Assets**: `%APPDATA%\ledshow-app\assets\`
- **Build Output**: `ledshow-app/dist/`
