# Watch party

Monorepo: **React (Vite)** UI, **Spring Boot** backend with **WebSocket** rooms, optional **Node** middleware.

## Features

- **Rooms** – same UUID for everyone in the watch party.
- **Screen share** –  (with STUN); signaling and chat go through the server WebSocWebRTCket at `/ws`.
- **Synced playback** – **Streaming sync** for Netflix, Prime, Disney+, etc. (everyone watches on their own account; the room relays play / pause / seek cues with the same control rules as direct video). **Direct video** mode loads a shared MP4 URL in the browser.
- **Chat** – messages broadcast to everyone in the room.
- **Google sign-in (optional)** – save room ids under your account; **Reconnect** from the lobby. Data is stored in a local **H2** database on the server (`backend/data/`) and sessions use a signed **JWT**.

## Prerequisites

- Node.js 20+ (`frontend`, `middleware`)
- Java 21 (`backend`)

## Google sign-in setup (saved rooms)

### 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → pick the **same project** that owns your client id.
2. **APIs & Services** → **OAuth consent screen** — finish setup (External is fine; add yourself as a **Test user** while in “Testing”).
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type must be **Web application** (not Desktop, Android, or iOS).
5. Under **Authorized JavaScript origins**, add **exactly** (no path, no trailing slash) every URL you use in the browser:

   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```

   **Tailscale / teammates** — copy the origin from the address bar when you open the app (scheme + host, no path). With Tailscale Serve on HTTPS that is usually:

   ```
   https://your-machine.tailXXXXX.ts.net
   ```

   Example: `https://msi.tailfdef97.ts.net` (not `http://`, no `:5173` if Serve uses port 443).

   If you share `http://100.x.y.z:5173` instead, add that exact origin too.

6. Under **Authorized redirect URIs** (optional but helps some flows), add the same origins as above (localhost, 127.0.0.1, and your Tailscale HTTPS URL).

7. Save, then copy the **Client ID** (ends with `.apps.googleusercontent.com`).

### 2. This repo

**Frontend** — `frontend/.env.development`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Backend** — copy `backend/application-local.properties.example` to `backend/application-local.properties` and set the **same** client id, or set `GOOGLE_CLIENT_ID` when starting Spring.

Restart **both** `npm run dev` and `spring-boot:run` after changing env files.

### Troubleshooting: Google sign-in

| Symptom | Fix |
|--------|-----|
| **origin_mismatch** / **no registered origin** | The **exact** page origin is missing from **Authorized JavaScript origins**. For Tailscale, add `https://<your-machine>.ts.net` (see address bar). Wait 1–2 minutes after saving, then hard-refresh (Ctrl+Shift+R). |
| **invalid_client** | Wrong client id, wrong client **type** (must be Web), or id from a different GCP project. Client id in `.env.development` must match Credentials exactly. |
| **Access blocked** (Testing) | OAuth consent screen → add each teammate’s Gmail under **Test users** while the app is in Testing mode. |
| Still failing | Confirm you did not create a “Chrome extension” or “Desktop” client. Use **Continue as guest** to test rooms without Google. |

Without Google env vars, the app still works as a guest; only saved rooms need sign-in.

## Deploy on one VM (Docker Compose)

Two containers (backend + nginx/frontend), **one port** for users (default **80**). The frontend proxies `/api` and `/ws` to the backend — no Vite, no middleware, no second public port.

### Prerequisites

- Docker Engine + Docker Compose v2 on the VM
- (Optional) Tailscale or firewall rule allowing inbound **80**

### Steps

1. Clone the repo on the VM and go to the repo root.

2. Create env file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   - Set **`JWT_SECRET`** to a long random string.
   - Set **`GOOGLE_CLIENT_ID`** and **`VITE_GOOGLE_CLIENT_ID`** to the same Web client id (or leave empty for guest-only).
   - Change **`HTTP_PORT`** if 80 is already in use (e.g. `8080:80` → set `HTTP_PORT=8080`).

3. Build and start:

   ```bash
   docker compose up -d --build
   ```

4. Open the app:

   - `http://<vm-public-ip>` or `http://<vm-tailscale-ip>`
   - With Tailscale Serve: `tailscale serve --bg --https=443 http://127.0.0.1:80` then use `https://<machine>.ts.net`

5. Google OAuth: add the **exact** browser origin to **Authorized JavaScript origins** (e.g. `http://100.x.y.z` or `https://your-machine.ts.net`).

### Useful commands

```bash
docker compose ps
docker compose logs -f
docker compose down
docker compose up -d --build   # after code changes
```

Saved rooms (H2) persist in the Docker volume **`watchparty-data`**.

## Push images to Google Container Registry (GCR)

Build on your machine (or CI), push to **`gcr.io/PROJECT_ID`**, pull on the VM.

### One-time GCP setup

1. [Create or pick a GCP project](https://console.cloud.google.com/) and note the **Project ID**.
2. Enable the **Container Registry API** (or use Artifact Registry — see note below).
3. Authenticate Docker with GCR:

   ```powershell
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud auth configure-docker gcr.io
   ```

4. Grant push permission: your account needs **Storage Admin** on the project (GCR uses Cloud Storage).

### Build and push (Windows)

From the repo root, set env vars (or add to `.env`):

```powershell
$env:GCP_PROJECT_ID = "your-gcp-project-id"
$env:VITE_GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"   # optional
.\scripts\push-images-gcr.ps1
# Or with a version tag:
.\scripts\push-images-gcr.ps1 -Tag "1.0.0"
```

Linux/macOS:

```bash
chmod +x scripts/push-images-gcr.sh
GCP_PROJECT_ID=your-gcp-project-id VITE_GOOGLE_CLIENT_ID=... ./scripts/push-images-gcr.sh
```

Images pushed:

- `gcr.io/PROJECT_ID/watch-party-backend:TAG`
- `gcr.io/PROJECT_ID/watch-party-middleware:TAG`
- `gcr.io/PROJECT_ID/watch-party-frontend:TAG`

Also tags **`latest`** when `TAG` is not `latest`.

### Run on VM from GCR (no build on server)

On the VM, in `.env`:

```
GCP_PROJECT_ID=your-gcp-project-id
IMAGE_TAG=latest
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
```

Authenticate **before** `pull` (required — otherwise `Unauthenticated request` / `downloadArtifacts`):

**Windows (host or VM with gcloud):**

```powershell
$env:GCP_PROJECT_ID = "project-332623"
.\scripts\auth-docker-gcr.ps1
```

**Linux VM:**

```bash
export GCP_PROJECT_ID=project-332623
chmod +x scripts/auth-docker-gcr.sh
./scripts/auth-docker-gcr.sh
```

**Manual fallback** (if `docker-credential-gcloud` is not on PATH):

```powershell
gcloud auth login
gcloud config set project project-332623
gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://gcr.io
```

Then:

```bash
docker compose -f docker-compose.gcr.yml pull
docker compose -f docker-compose.gcr.yml up -d
```

**GCP VM:** attach a service account with **Artifact Registry Reader** (or **Storage Object Viewer** for legacy GCR), then run `gcloud auth configure-docker gcr.io` on the VM or use the metadata-based login that Compute Engine provides.

### GCR pull/push errors

| Error | Fix |
|--------|-----|
| **`Unauthenticated`** after `docker login` | Docker may still use **credHelpers `"gcr.io": "gcloud"`** → broken `docker-credential-gcloud`. Run **`.\scripts\auth-docker-gcr.ps1`** (it strips that) or edit `%USERPROFILE%\.docker\config.json` and remove `gcr.io` under `credHelpers`. Also log in to **both** `gcr.io` and **`us-docker.pkg.dev`** (script does both). |
| **WSL vs Windows** | Run `gcloud`, `docker login`, and `docker compose` in the **same** environment (all Windows or all WSL). |
| **Still unauthenticated** | Run `gcloud auth login` with an account that has **Artifact Registry Reader** on the project. In Console: **IAM** → grant `roles/artifactregistry.reader` (pull) or `roles/artifactregistry.writer` (push). |
| **`docker-credential-gcloud` not found** | Use `auth-docker-gcr.ps1` — it logs in with a token. Or add Cloud SDK `bin` to PATH and restart Docker Desktop. |
| **Service account on GCE** | Attach SA with **Artifact Registry Reader**, or: `gcloud auth activate-service-account --key-file=KEY.json` then run `auth-docker-gcr.sh`. |
| **Token expired (~1 h)** | Re-run `auth-docker-gcr.ps1` before `docker compose pull`. |
| **or it may not exist** | Wrong image repo name. Check GCR in Console: the path after `gcr.io/PROJECT/` must match `.env`. Short names: set `GCR_BACKEND_REPO=watchparty-back`, `GCR_MIDDLEWARE_REPO=watchparty-mid`, `GCR_FRONTEND_REPO=watchparty-front`. |

This starts **backend**, **middleware** (Node proxy), and **frontend** (nginx). Requests go: browser → nginx → middleware → Spring Boot.

**Two-container stack (no middleware):** set `BACKEND_URL=http://backend:8080` on the frontend service or use `docker-compose.yml` with a local build.

**Note:** Google recommends [Artifact Registry](https://cloud.google.com/artifact-registry) (`REGION-docker.pkg.dev/...`) for new projects. GCR (`gcr.io/...`) still works; to use Artifact Registry, change the registry prefix in the push scripts and `docker-compose.gcr.yml`.

## Run (local development)

**1. Backend (port 8080)**

```bash
cd backend
./mvnw spring-boot:run
```

Windows: `.\mvnw.cmd spring-boot:run`

**2. Frontend (port 5173)**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies **`/api`** and **`/ws`** to Spring Boot during development.

**3. Middleware (optional, port 3001)**

Proxies `/api` and WebSocket **`/ws`** to Java when you want Node in front.

```bash
cd middleware
npm install
npm start
```

Point the dev UI at the middleware by copying `frontend/.env.example` to `frontend/.env.development` and setting `VITE_DEV_API_PROXY=http://localhost:3001`.

## Test with teammates over Tailscale

**HTTP 502** from `https://your-machine.ts.net` almost always means **Tailscale Serve is forwarding to a port where nothing is listening**, or the dev servers are not running on the host machine.

### On the host (your PC)

1. Start **both** services (teammates only need the URL to your machine; Vite proxies API + WebSocket):

   ```powershell
   # Terminal 1
   cd backend
   .\mvnw.cmd spring-boot:run

   # Terminal 2
   cd frontend
   npm run dev
   ```

2. Confirm locally: open [http://localhost:5173](http://localhost:5173) with **no red “Backend not reachable” banner**. Also open [http://127.0.0.1:8080/api/hello](http://127.0.0.1:8080/api/hello) in the browser — you should see JSON, not a connection error. Teammates hit **your** Vite on 5173; Vite on your PC proxies `/api` to **your** Spring Boot on 8080. If only the frontend is running, everyone on Tailscale sees the red banner.

3. Confirm Vite is up on the port:

   ```powershell
   curl http://127.0.0.1:5173
   ```

4. Point **Tailscale Serve** at the **frontend** (port **5173**), not the Java port (8080):

   ```powershell
   tailscale serve reset
   tailscale serve --bg --https=443 http://127.0.0.1:5173
   tailscale serve status
   ```

   Share `https://<your-machine>.ts.net` (or the URL shown by `serve status`).

### Alternative: Tailscale IP (no Serve)

If everyone is on the same tailnet, teammates can open:

`http://<your-tailscale-ip>:5173`

(e.g. `http://100.x.y.z:5173` from `tailscale ip -4` on the host). Windows Firewall may need an inbound rule for port **5173**.

### After the page loads

| Issue | Fix |
|--------|-----|
| **502** | Backend or frontend not running; Serve aimed at wrong port; run `tailscale serve status` |
| **Connected but room/chat fails** | Restart backend; check host terminal for `ECONNREFUSED` on Vite proxy |
| **origin_mismatch** on sign-in | Google Console → Credentials → your Web client → **Authorized JavaScript origins** → add `https://msi.tailfdef97.ts.net` (your real `https://…ts.net` from the address bar). Save, wait 2 min, refresh. |
| **Screen share flaky** | WebRTC may need TURN on restrictive networks; same-room chat/sync still works |

## Layout

| Folder / file | Role |
|---------------|------|
| `docker-compose.yml` | Production: build locally, frontend port 80 |
| `docker-compose.gcr.yml` | Production from GCR: backend + middleware + frontend |
| `.env.example` | Compose / GCR env template (copy to `.env`) |
| `scripts/push-images-gcr.ps1` | Build + push to `gcr.io` (Windows) |
| `scripts/push-images-gcr.sh` | Same for Linux/macOS |
| `frontend/`   | React app; production image = nginx + static build |
| `backend/`    | REST (`/api`) + WebSocket room relay (`/ws`); H2 file DB for saved rooms |
| `middleware/` | Optional dev-only Express proxy (not used in Compose) |
