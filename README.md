# Connect

> Real-time team chat that keeps people close.

Connect is a full-stack messaging app with live rooms, private direct messages, file sharing and presence, built with **React 18 + Vite** on the front end and **Spring Boot 3 (Java 17)** with WebSocket/STOMP on the back end.

## Features

- **Public rooms** with live room creation: new rooms appear for everyone instantly
- **Direct messages** between any two people, started from the People panel
- **Live presence**: see who is online right now, plus typing indicators
- **Edit and delete** your own messages
- **Image and file sharing** up to 5 MB
- **Unread badges** on every room and conversation
- **Auto-reconnect** if the connection drops
- **JWT authentication** for sign in and registration

## The interface

- **Sign in / Create account:** a floating network backdrop with a glass card and a one-tap switch between signing in and registering
- **Chat:** a three-column layout with rooms and DMs on the left, the conversation in the middle, and a live People panel on the right
- A dark theme with violet and coral accents, and the new Connect logo (two linked nodes forming a "C")

## Requirements (Windows)

- JDK 17+
- Maven 3.9+
- Node 18+

All three must be on your PATH.

## Run

```powershell
cd connect
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

Then open http://localhost:5173. To see it live, open two browser windows and sign in with two different accounts.

Or start the two servers yourself in separate windows:

```powershell
cd backend ; mvn spring-boot:run
cd frontend ; npm install ; npm run dev
```

| Part | Address |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:8080 |
| H2 console | http://localhost:8080/h2-console (`jdbc:h2:file:./data/pulse`, user `sa`) |

## API and protocol

**REST**

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/rooms`, `POST /api/rooms`, `GET /api/rooms/{id}/messages`
- `GET /api/online`, `GET /api/users`
- `POST /api/dm` with `{ "username": "..." }`
- `PUT /api/messages/{id}`, `DELETE /api/messages/{id}`
- `POST /api/upload` (multipart), `GET /api/files/{name}`

**STOMP** at `ws://localhost:8080/ws`, with the CONNECT header `Authorization: Bearer <jwt>`

- Send to `/app/chat/{roomId}` with `{ content }`, and to `/app/typing/{roomId}`
- Subscribe to `/topic/room.{id}`, `/topic/typing.{id}` and `/topic/presence`

Uploads are stored in `backend/uploads`.

## Before deploying

Change `app.jwt.secret` in `backend/src/main/resources/application.properties`.

## Deploying (Render + Neon)

The included `Dockerfile` builds the React app, bundles it into the Spring Boot jar and runs everything as one service, so you get a single URL (WebSockets included).

1. Push the project to GitHub.
2. Create a database (for example `connect`) in a free Neon Postgres project.
3. On Render, create a **Web Service** from the repo with **Language: Docker**, then set these environment variables:

| Name | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://<host>/connect?sslmode=require` |
| `DB_USERNAME` | your Neon username |
| `DB_PASSWORD` | your Neon password |
| `JWT_SECRET` | a random string of 40+ characters |

Notes: free Render services sleep after inactivity, and uploaded files are lost on restart (messages and users stay in Postgres).
