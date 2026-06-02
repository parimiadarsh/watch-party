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

## Deploy on a VM (DuckDNS + nginx)

If **https://fermiwatch.duckdns.org** shows **“Welcome to nginx!”**, the default site is still enabled — not your app. See **`docs/nginx-fermiwatch.example.conf`** and run on the VM:

1. Build frontend (`npm run build`), run backend on port **8080**.
2. Copy the example to `/etc/nginx/sites-available/fermiwatch`, set `root` to your `frontend/dist` path.
3. `sudo rm -f /etc/nginx/sites-enabled/default` then `sudo nginx -t && sudo systemctl reload nginx`.
4. HTTPS: `sudo certbot --nginx -d fermiwatch.duckdns.org`

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
| `frontend/`   | React app (Vite dev server; proxies `/api` and `/ws` to the backend) |
| `backend/`    | REST (`/api`) + WebSocket room relay (`/ws`); H2 file DB for saved rooms |
| `middleware/` | Optional Express proxy for local dev |
