# Game Server Auto-Restarter

A lightweight Docker-based monitoring tool that automatically restarts game server containers when they enter an invalid state (empty or broken maps).

## Features

- **Automatic Health Monitoring**: Periodically checks game server status using GameDig
- **Smart Restart Logic**: Triggers container restart after consecutive invalid map detections
- **Cooldown Period**: Pauses checks after restart to allow proper server initialization
- **Docker Integration**: Directly controls Docker containers via Docker socket
- **Configurable**: All parameters controlled via environment variables

## How It Works

1. Queries the game server at regular intervals
2. Detects invalid map states (null, empty, or "<empty>")
3. Counts consecutive invalid states
4. Restarts the target Docker container when threshold is reached
5. Enters cooldown period to allow server recovery

## Requirements

- Docker
- Node.js 18+
- Access to Docker socket (`/var/run/docker.sock`)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd server-restarter
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Start with Docker Compose:

```bash
docker compose up -d --build
```

## Configuration

Edit `.env` with your server details:

| Variable                | Description                                  | Default         |
| ----------------------- | -------------------------------------------- | --------------- |
| `SERVER_HOST`           | Game server IP or hostname                   | Required        |
| `SERVER_PORT`           | Game server port                             | `27015`         |
| `SERVER_TYPE`           | GameDig server type (e.g., `csgo`)           | `csgo`          |
| `UPDATE_INTERVAL`       | Time between checks in milliseconds          | `60000` (60s)   |
| `MAX_BAD_MAP_STREAK`    | Consecutive invalid states before restart    | `3`             |
| `TARGET_CONTAINER_NAME` | Docker container name to restart             | Required        |
| `RESTART_COOLDOWN`      | Pause duration after restart in milliseconds | `300000` (5min) |

## Example

```env
SERVER_HOST=192.168.0.50
SERVER_PORT=27015
SERVER_TYPE=csgo
UPDATE_INTERVAL=60000
MAX_BAD_MAP_STREAK=3
TARGET_CONTAINER_NAME=csgo-server
RESTART_COOLDOWN=300000
```

## Supported Games

Any game supported by [GameDig](https://www.npmjs.com/package/gamedig), including:

- Counter-Strike 2 (`csgo`)
- And many more...

## License

MIT License - see LICENSE file for details
