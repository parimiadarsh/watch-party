# Watch party

Monorepo: **React (Vite)** UI, **Spring Boot** backend with **WebSocket** rooms, optional **Node** middleware.

## Features

- **Rooms** – same UUID for everyone in the watch party.
- **Screen share** – WebRTC (with STUN); signaling and chat go through the server WebSocket at `/ws`.
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
5. Under **Authorized JavaScript origins**, add **exactly** (no path, no trailing slash):

   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```

   Use the same host you open in the browser. If the address bar says `http://127.0.0.1:5173`, that origin must be listed (and vice versa for `localhost`).

6. Under **Authorized redirect URIs** (optional but helps some flows), you can also add:

   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```

7. Save, then copy the **Client ID** (ends with `.apps.googleusercontent.com`).

### 2. This repo

**Frontend** — `frontend/.env.development`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Backend** — copy `backend/application-local.properties.example` to `backend/application-local.properties` and set the **same** client id, or set `GOOGLE_CLIENT_ID` when starting Spring.

Restart **both** `npm run dev` and `spring-boot:run` after changing env files.

### Troubleshooting: `no registered origin` / `401 invalid_client`

| Symptom | Fix |
|--------|-----|
| **no registered origin** | The URL in your browser is not in **Authorized JavaScript origins**. Open the app at [http://localhost:5173](http://localhost:5173) (Vite is pinned to port **5173**), add that origin in Google Console, wait 1–2 minutes, hard-refresh. |
| **invalid_client** | Wrong client id, wrong client **type** (must be Web), or id from a different GCP project. Client id in `.env.development` must match Credentials exactly. |
| Still failing | Confirm you did not create a “Chrome extension” or “Desktop” client. Delete old clients and create a new **Web application** client if unsure. |

Without Google env vars, the app still works as a guest; only saved rooms need sign-in.

## Run

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

## Layout

| Folder        | Role |
|---------------|------|
| `frontend/`   | React app |
| `backend/`    | REST (`/api`) + WebSocket room relay (`/ws`); H2 file DB for saved rooms |
| `middleware/` | Express proxy (`/api`, `/ws` upgrade) |
