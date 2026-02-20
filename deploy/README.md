# Production Deployment – app.visualisa.xyz

## Before You Start

### 1. DNS (Required)

Add an A record for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | 91.98.235.181 | 600 |

Result: `app.visualisa.xyz` → your VM IP

Verify: `dig app.visualisa.xyz +short` (should return the IP)

### 2. Hetzner Firewall (Required – Certbot fails without this)

In **Hetzner Cloud Console** → Your project → **Firewalls**:

1. Select the firewall attached to your server (or create one)
2. **Inbound rules** – add:
   - **TCP 80** (HTTP) – required for Let's Encrypt verification
   - **TCP 443** (HTTPS)
3. Apply the firewall to your server

If port 80 is blocked, Certbot will fail with "Timeout during connect (likely firewall problem)".

### 3. Services Running

Ensure backend, frontend, and evmbench are running:

```bash
cd /home/claude/BugChainIndexer
./run-local-ui.sh status
cd evmbench-main/backend && docker compose ps
```

---

## Run Setup

```bash
cd /home/claude/BugChainIndexer/deploy
sudo ./setup-production.sh
```

This will:
1. Install nginx and certbot
2. Configure nginx to proxy app.visualisa.xyz → port 3000
3. Obtain Let's Encrypt SSL certificate
4. Restart BugChainIndexer services

---

## Certbot Failed? "Timeout during connect (likely firewall problem)"

**Cause:** Port 80 is blocked. Two places can block it:
1. **Hetzner Cloud Firewall** – add inbound rules for TCP 80, TCP 443
2. **UFW on the server** – Ubuntu's firewall blocks by default

**Fix UFW (run on the VM):**
```bash
cd /home/claude/BugChainIndexer/deploy
sudo ./fix-ufw-ports.sh
```

Then re-run certbot: `sudo certbot --nginx -d app.visualisa.xyz`

---

## Manual Steps (if script fails)

```bash
# Install
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Copy config
sudo cp deploy/nginx-app.visualisa.xyz.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/app.visualisa.xyz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d app.visualisa.xyz
```

---

## After Deployment

- **URL**: https://app.visualisa.xyz
- API calls are proxied through the frontend (no separate API domain needed)
- **systemd**: Services auto-start on reboot via `install-systemd.sh`
