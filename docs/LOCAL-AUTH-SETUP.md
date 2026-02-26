# Local GitHub OAuth Setup

Test the "Log in with GitHub" flow locally at `http://localhost:3001` (run-local-ui.sh uses 3001 so 3000 stays free for production).

## Quick Setup

### 1. Backend: Create `.env.local`

```bash
cd server/backend
cp .env.local.example .env.local
```

Edit `.env.local` and set:

```env
FRONTEND_URL=http://localhost:3001
```

If your main `.env` already has `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, you can **try using the same OAuth app** first. Some setups allow localhost.

### 2. GitHub OAuth: Add localhost callback

Go to [GitHub OAuth Apps](https://github.com/settings/developers) → your app → **Edit**.

**Option A – Same app (if supported):**  
Change the **Authorization callback URL** to:
```
http://localhost:3001/auth/github/callback
```
Use this when developing locally, then change it back for production.

**Option B – Separate dev app (recommended):**

1. Create a new OAuth App: [Create OAuth App](https://github.com/settings/applications/new)
2. **Application name:** `Visualisa Dev` (or similar)
3. **Homepage URL:** `http://localhost:3001`
4. **Authorization callback URL:** `http://localhost:3001/auth/github/callback`
5. Copy the **Client ID** and **Client secret**
6. In `server/backend/.env.local` add:
   ```env
   GITHUB_CLIENT_ID=your_dev_client_id
   GITHUB_CLIENT_SECRET=your_dev_client_secret
   AUTH_JWT_SECRET=local-dev-jwt-secret-32chars
   ```

### 3. Frontend: Local `.env.local`

```bash
cd server/frontend-next
```

Create or edit `.env.local`:

```env
# Local dev – same-origin (Next.js rewrites proxy to backend)
NEXT_PUBLIC_API_URL=

# App URL for OAuth redirects
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4. Run locally

```bash
# From repo root - use restart to free ports if something else is using 3001/8005
./run-local-ui.sh restart
```

Open http://localhost:3001 and click **Log in**.

**Important:** The script uses backend port **8005** (not 8000) to avoid conflicts with production/stray processes. Auth routes automatically use the local backend when the Host header contains `localhost`.

## Flow

1. Click **Log in** → backend redirects to GitHub
2. Authorize on GitHub → redirect to `http://localhost:3001/auth/github/callback`
3. Backend exchanges code, sets session cookie, redirects to `http://localhost:3001`
4. You should see your username in the header

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirects to app.visualisa.xyz instead of GitHub | Ensure you use `./run-local-ui.sh` (not manual `npm start`). Backend must load `.env.local` with dev credentials. |
| "Log in" still shown after auth | Clear cookies for `localhost:3001` and try again |
| Callback URL mismatch | Ensure GitHub callback is exactly `http://localhost:3001/auth/github/callback` |
| 404 on /auth/github | Backend not running or `.env.local` not loaded |
| Port 3001/8005 in use | Run `./run-local-ui.sh stop` then `./run-local-ui.sh start`. Or close other terminals running the app. |
| Cookie not set | Local uses HTTP; cookie is `Secure=false` by default |

## Switching between local and production

- **Local:** `server/backend/.env.local` with `FRONTEND_URL=http://localhost:3001` (or use run-local-ui.sh which sets this automatically)
- **Production:** No `.env.local` or remove it; `.env` uses `FRONTEND_URL=https://app.visualisa.xyz`

The backend loads `.env.local` after `.env`, so local values override production.
