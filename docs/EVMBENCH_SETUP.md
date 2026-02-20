# evmbench Self-Hosted Setup (BugChainIndexer Integration)

## Status

evmbench is configured and running on this server.

## Quick Commands

```bash
# Start evmbench (from evmbench-main/backend)
cd /home/claude/evmbench-main/backend
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

1. Start evmbench: `cd evmbench-main/backend && docker compose up -d`
2. BugChainIndexer backend will connect automatically when it runs

## Data Persistence

- Postgres data: `evmbench-main/backend/.data/postgres`
- RabbitMQ data: `evmbench-main/backend/.data/rabbitmq`
- Secrets: `evmbench-main/backend/.data/secrets`
