# LedShow VideoWall Agent Manual

This manual explains how to install, configure, and run the VideoWall Agent on a separate computer (Notebook, PC, or Raspberry Pi).

## Prerequisites

1.  **Node.js**: Install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/).
2.  **MPV Player**: The agent uses MPV for high-performance playback.
    *   **Windows**: Download and install from [mpv.io](https://mpv.io/). Ensure `mpv.exe` is in your system PATH.
    *   **Linux (Ubuntu/Pi)**: Run `sudo apt update && sudo apt install mpv`.

## Installation

1.  Copy the `ledshow-agent` folder to the target machine.
2.  Open a terminal (Command Prompt or PowerShell) inside the `ledshow-agent` folder.
3.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

The agent is configured using environment variables. You can set these in your terminal before starting the agent or create a `.env` file.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `AGENT_NAME` | Descriptive name for the agent | `VideoWall-Agent-<hostname>` |
| `AGENT_PORT` | HTTP/WebSocket API port | `3000` |
| `AGENT_MODEL` | VideoWall model (`4-screen` or `9-screen`) | `4-screen` |
| `AGENT_LAYOUT` | Hardware layout (e.g., `2x2`, `3x3`, `1x2`) | `2x2` |
| `AGENT_ORIENTATION` | Screen orientation (`landscape` or `portrait`) | `landscape` |
| `AGENT_SCREEN` | Target monitor index (0=primary, 1=secondary, etc) | `0` |

### Setting Environment Variables (Windows PowerShell)
```powershell
$env:AGENT_NAME="MijnVideoWall"; $env:AGENT_LAYOUT="2x2"; npm start
```

### Setting Environment Variables (Linux/macOS)
```bash
AGENT_NAME="MijnVideoWall" AGENT_LAYOUT="2x2" npm start
```

## Running the Agent

To start the agent:
```bash
npm start
```

The agent will:
1.  Initialize the MPV player (open a black fullscreen window).
2.  Start the HTTP server for media uploads.
3.  Start the WebSocket server for cues.
4.  Start the UDP Discovery service so the Host can find it.

## WebSocket Commands

The hub can control the agent via WebSocket (default port 3000). Commands are JSON objects.

| Action | Parameters | Description |
| :--- | :--- | :--- |
| `play` | `filename` | Play a video from the `media/` folder. |
| `stop` | - | Stop the current playback. |
| `sync` | `url`, `filename` | Download a video from a URL. |
| `volume` | `level` (0-100) | Set player volume. |

## Troubleshooting

*   **Discovery fails**: Ensure both the Host and Agent are on the same network subnet. Check if a firewall is blocking UDP port `5566`.
*   **Media not playing**: Ensure the `media/` folder exists in the agent directory and is writable.
*   **MPV not found**: Test if you can run `mpv --version` from your command line.
