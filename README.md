# Watch party

Monorepo: **React (Vite)** UI, **Spring Boot** backend with **WebSocket** rooms, optional **Node** middleware.

## Features

- **Rooms** – same UUID for everyone in the watch party.
- **Screen share** – WebRTC (with STUN); signaling and chat go through the server WebSocket at `/ws`.
- **Synced playback** – shared play / pause / seek and “load this URL for everyone” for direct video files (e.g. MP4).
- **Chat** – messages broadcast to everyone in the room.
- **Google sign-in (optional)** – save room ids under your account; **Reconnect** from the lobby. Data is stored in a local **H2** database on the server (`backend/data/`) and sessions use a signed **JWT**.

## Prerequisites

- Node.js 20+ (`frontend`, `middleware`)
- Java 21 (`backend`)

## Google sign-in setup (saved rooms)

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth **Web application** client.
2. **Authorized JavaScript origins**: `http://localhost:5173` (and your production UI origin later).
3. Copy the **Client ID** string.

**Backend** – set the same client id and a long random JWT secret (32+ characters):

```bash
set GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
set JWT_SECRET=replace-with-a-long-random-secret-at-least-32-chars
```

Linux/macOS: `export GOOGLE_CLIENT_ID=...` and `export JWT_SECRET=...`

**Frontend** – `frontend/.env.development`:

```
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

Restart Vite and Spring after changing env vars.

Without these variables, the app works as before; the lobby explains that Google save is disabled.

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
