# Going Live – app.visualisa.xyz

## Production Deployment (app.visualisa.xyz)

### Step 1: DNS (Do this first)

In your domain registrar (where visualisa.xyz is managed), add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | 91.98.235.181 | 300 |

Result: `app.visualisa.xyz` → your VM IP.

Verify: `dig app.visualisa.xyz +short` (should return 91.98.235.181)

### Step 2: Hetzner Firewall

In **Hetzner Cloud Console** → Your project → Firewalls:

- Add firewall rule: **Allow TCP 80** (HTTP)
- Add firewall rule: **Allow TCP 443** (HTTPS)

### Step 3: Run Production Setup

```bash
cd /home/claude/BugChainIndexer/deploy
sudo ./setup-production.sh
```

This installs nginx, configures the proxy, obtains SSL, and restarts services.

### Step 4: Open in Browser

**https://app.visualisa.xyz**

---

## If Setup Fails

### Manual nginx + certbot

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp /home/claude/BugChainIndexer/deploy/nginx-app.visualisa.xyz.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/app.visualisa.xyz /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.visualisa.xyz
```

### Ensure services are running

```bash
cd /home/claude/BugChainIndexer
./run-local-ui.sh restart
cd evmbench-main/backend && docker compose up -d
```

### Use systemd (survives reboot)

```bash
sudo /home/claude/BugChainIndexer/server/services/install-systemd.sh
systemctl start evmbench bugchain-backend bugchain-frontend
```

---

## Architecture

| Component | Port | URL |
|-----------|------|-----|
| nginx | 80, 443 | https://app.visualisa.xyz |
| Frontend (Next.js) | 3000 | proxied by nginx |
| Backend (Express) | 8000 | proxied via frontend rewrites |
| evmbench | 1337 | internal only |
