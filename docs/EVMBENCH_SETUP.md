# evmbench Self-Hosted Setup (BugChainIndexer Integration)

## Status

evmbench is configured and running on this server as a git submodule (paradigmxyz/evmbench).

## Quick Commands

```bash
# Start evmbench (from BugChainIndexer root)
cd /home/claude/BugChainIndexer/evmbench-main/backend
docker compose up -d

# Stop evmbench
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps
```

## Configuration

- **evmbench API**: http://127.0.0.1:1337
- **Auth**: Disabled (AUTH_BACKEND=) for BugChainIndexer server-to-server calls
- **BugChainIndexer**: `EVMBENCH_API_URL=http://127.0.0.1:1337` in `server/backend/.env`

## After Server Reboot

With systemd installed: evmbench starts automatically before bugchain-backend.

Manual: `cd BugChainIndexer/evmbench-main/backend && docker compose up -d`

## Data Persistence

- Postgres data: `evmbench-main/backend/.data/postgres`
- RabbitMQ data: `evmbench-main/backend/.data/rabbitmq`
- Secrets: `evmbench-main/backend/.data/secrets`
