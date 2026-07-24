# Collaborative Whiteboard

A real-time, multi-room collaborative whiteboard built with the MERN-adjacent stack:
**React + Node.js + Express + MongoDB + Socket.IO + Passport.js (session auth)**.

---

## 1. Features

- Email/password auth via Passport.js **sessions** (no JWT) — register, login, logout, "remember me"
- Protected routes (frontend `ProtectedRoute`, backend `ensureAuthenticated` middleware)
- Real-time drawing: Pencil, Eraser, Rectangle, Circle, Line, **Text**
- Adjustable brush color and size
- **Text tool** — click to type, double-click any text (yours or a collaborator's) to edit
  it in place; edits sync live to everyone in the room
- **True responsive canvas** — all stroke and cursor coordinates are stored normalized
  (0-1 fractions of canvas width/height), so drawings stay correctly proportioned and
  in place across window resizes, orientation changes, and different device screen sizes
  (see "Responsive Design" below)
- **AI Whiteboard Summary** — click "✨ Generate AI Summary" to get an AI-generated
  summary of everything typed on the board (via Groq's `llama-3.1-8b-instant`), with
  copy, regenerate, and close actions in a modal
- **Multiple isolated rooms** via Socket.IO rooms — create a room, get a 6-character code, share it
- **Live cursors** — see everyone's mouse pointer with name + color, throttled to ~25 updates/sec
- **Undo / Redo** — per-user stack-based history
- **Export** whiteboard as PNG or JPG (via `canvas.toDataURL()`)
- **Online presence** — live user count, names, join times, per room
- **Drawing history** — new joiners see the full existing whiteboard immediately
- Light / dark mode, toast notifications, confirmation dialogs, responsive layout

---

## 2. Tech Stack & Why

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Fast dev server, simple functional-component setup, no framework bloat |
| Styling | Plain CSS + CSS variables | Full control over a distinctive look, no utility-class dependency |
| Backend | Node.js + Express | Minimal, unopinionated, huge ecosystem, easy to reason about |
| Real-time | Socket.IO | Automatic fallback transports, built-in **room** primitive for isolation, reconnection handling out of the box |
| Database | MongoDB + Mongoose | Flexible schema fits nested stroke/point data naturally; Mongoose gives validation + structure |
| Auth | Passport.js (Local Strategy) + `express-session` + `connect-mongo` | Session cookies are simpler to reason about than JWT for a same-origin app, are easy to revoke server-side (just delete the session doc), and `httpOnly` cookies aren't readable by JS (mitigates XSS token theft) |
| Architecture | MVC | Models (Mongoose schemas) / Controllers (business logic) / (implicit) Views = React frontend consuming a REST API |

---

## 3. Responsive Design

The canvas resizes automatically to fill its container on every window resize and mobile
orientation change (debounced to avoid redraw thrashing during a drag-resize). What makes
drawings survive that resize **without distortion or clipping** is that every stroke point
and every live cursor position is stored as a **normalized fraction (0-1) of canvas
width/height**, not a raw pixel coordinate — both in the database and over the socket wire.
A point drawn at the exact horizontal center of a 375px-wide phone screen is stored as
`x: 0.5`; when a 1500px-wide desktop opens that same room, it multiplies `0.5 * 1500` and
renders at the correct horizontal center there too. This means:
- Resizing the browser window keeps every shape in its correct relative position
- Rotating a phone between portrait/landscape re-renders the whole board correctly
- A drawing started on desktop looks correctly proportioned when opened later on mobile

Layout below the canvas also adapts: on tablet-width screens the toolbar and online-users
panel switch from side columns to horizontally scrollable bars above/below the canvas; on
phone-width screens, tool and color grids reflow into a more compact 6-column layout. The
canvas itself uses Pointer Events (`onPointerDown/Move/Up`) rather than separate mouse/touch
handlers, so drawing works identically with a mouse, a finger, or a stylus, with
`touch-action: none` preventing the page from scrolling while you draw on a touchscreen.

---

## 4. Folder Structure

```
CollaborativeWhiteboard/
├── backend/
│   ├── config/         # db.js, passport.js
│   ├── models/         # User.js, Room.js (strokes embedded here — see note below)
│   ├── controllers/     # authController.js, roomController.js
│   ├── routes/          # authRoutes.js, roomRoutes.js
│   ├── middleware/      # authMiddleware.js, errorMiddleware.js
│   ├── sockets/          # socketHandler.js — all real-time logic
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/axios.js
    │   ├── context/     # AuthContext, ThemeContext, ToastContext
    │   ├── components/  # Navbar, Canvas, Toolbar, OnlineUsers, RemoteCursors, ConfirmDialog, ProtectedRoute
    │   ├── pages/        # Login, Register, Dashboard, WhiteboardRoom
    │   ├── styles/        # theme.css, index.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

**Note on the "Drawing" model:** rather than a separate `Drawing` collection with a foreign
key back to `Room` (which would require an extra query on every room load), each `Room`
document embeds a `strokes` array directly. Since strokes are always read/written *in the
context of one room*, embedding avoids a join/populate and keeps "load room + its history"
to a single query. This is a deliberate MongoDB schema-design tradeoff (embedding vs.
referencing) — it would need revisiting if rooms could accumulate unbounded strokes (see
Future Improvements), but is the right call at this project's scale.

---

## 5. Setup — Step by Step

### Step 1: Prerequisites
Install Node.js (v18+) and have a MongoDB instance available (local `mongod` or a free
MongoDB Atlas cluster).

### Step 2: Backend setup
```bash
cd CollaborativeWhiteboard/backend
npm install
cp .env.example .env
```
Open `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `SESSION_SECRET` — any long random string (used to sign the session cookie)
- `CLIENT_URL` — leave as `http://localhost:5173` for local dev

Run it:
```bash
npm run dev
```
You should see `MongoDB Connected: ...` and `Server running ... on port 5000`.

### Step 3: Frontend setup
In a **new terminal**:
```bash
cd CollaborativeWhiteboard/frontend
npm install
npm run dev
```
Visit `http://localhost:5173`. The Vite dev server proxies `/api` and `/socket.io` calls
to the backend (see `vite.config.js`), so no CORS headaches locally.

### Step 4: Get a free Groq API key (for AI Whiteboard Summary)
1. Go to **console.groq.com** and sign up — email, or Google/GitHub login. No credit card required.
2. Once logged in, open the **API Keys** section from the console sidebar.
3. Click **Create API Key**, give it a name (e.g. `whiteboard-dev`), and click Create.
4. Copy the key immediately — Groq only shows it once.
5. Paste it into `backend/.env` as `GROQ_API_KEY=gsk_...`.
6. Free tier: no time limit, no card, generous per-model rate limits (the model this
   project uses, `llama-3.1-8b-instant`, gets roughly 30 requests/minute and thousands
   of requests/day on the free tier — far more than a single summary button needs).
7. **Never commit `.env` or paste this key into frontend code** — see the Security section below for why.
8. Verify it works: after starting the backend, open a room, add a couple of Text-tool
   notes, and click "✨ Generate AI Summary." A 500 error mentioning "not configured"
   means the key is missing or `.env` wasn't loaded; a 500 "rejected the configured API
   key" means the key itself is invalid — regenerate it in the console.

### Step 5: Try it
1. Register a new account.
2. Create a room — note the 6-character code.
3. Open the room URL in a second browser (or incognito window), log in as a different user,
   and join the same code.
4. Draw — you'll see strokes and cursors sync in real time.
5. Add a few notes with the Text tool, then click **✨ Generate AI Summary**.

---

## 6. Security Measures Implemented

- **Helmet** — sets protective HTTP headers
- **express-rate-limit** — 300 req/15min globally, 20 req/15min on auth routes (brute-force mitigation)
- **express-mongo-sanitize** — strips `$`/`.` operators from user input to prevent NoSQL injection
- **bcryptjs** — passwords hashed with 12 salt rounds, never stored or returned in plain text
- **httpOnly, sameSite, secure cookies** — session cookie can't be read by JS and is HTTPS-only in production
- **express-validator** — server-side validation on all auth/room inputs
- **CORS** — locked to a single configured client origin, credentials-only
- **CSRF** — with `sameSite: 'lax'/'none'` cookies and a same-site frontend/backend deployment,
  cross-site request forgery risk is reduced; for a public multi-origin deployment, add a
  dedicated CSRF token (e.g. `csurf` middleware) as a hardening step
- **AI key isolation** — `GROQ_API_KEY` only ever exists in `backend/.env` and is read by
  `aiService.js` on the server. The frontend never sees it, sends it, or has any code path
  that could leak it — the browser only ever calls our own `/api/ai/summarize` endpoint
- **AI-specific rate limiting** — `/api/ai` is capped at 10 requests/10min per IP, tighter
  than the general API limit, since each call costs a (free-tier) AI request and an
  unthrottled button is an easy abuse/cost vector
- **Prompt injection mitigation** — whiteboard text is user-controlled and untrusted, so the
  system prompt explicitly instructs the model to treat it as data to summarize, never as
  instructions to follow, even if someone types something like "ignore previous instructions"
  onto the board
- **Input validation on the AI route** — `express-validator` checks `roomCode` shape before
  any DB or AI call; whiteboard content itself is always re-fetched from MongoDB server-side
  (never trusted from the request body), so a client can't inject arbitrary text into the prompt

---

## 7. Deployment Notes

- Backend: deploy to Render/Railway/Fly.io. Set all `.env` variables in the platform's
  dashboard. Set `NODE_ENV=production` so cookies get `secure: true`.
- Frontend: `npm run build` produces a static `dist/` folder — deploy to Vercel/Netlify, or
  serve it from Express as static files for a single-service deployment.
- MongoDB: use MongoDB Atlas for a managed production database.
- Update `CLIENT_URL` in the backend `.env` to your deployed frontend URL, and update the
  frontend's socket/api calls to point at the deployed backend URL if not using the Vite proxy.

---

## 8. Manual Testing Checklist

- [ ] Register with a duplicate email → should reject with 409
- [ ] Login with wrong password → should reject with 401
- [ ] Visit `/dashboard` while logged out → redirected to `/login`
- [ ] Create room → code appears, room shows in "Your Rooms"
- [ ] Join room from a second browser session → both users see each other in Online Users
- [ ] Draw with each tool → verify shape renders correctly and syncs to the other browser
- [ ] Select Text tool, click canvas, type, press Enter → text appears and syncs to the other browser
- [ ] Double-click existing text (as either user) → edit box opens with current content; change it → both browsers show the update, not a duplicate
- [ ] Resize the browser window (or rotate a mobile device) → existing strokes and text stay in their correct relative position, nothing clips or shifts off-canvas
- [ ] Undo, then redo → stroke disappears then reappears on both browsers
- [ ] Clear canvas → confirmation dialog appears; confirming clears for both users
- [ ] Export PNG/JPG → file downloads with the current drawing
- [ ] Disconnect Wi-Fi briefly → "Reconnecting..." badge shows, then reconnects and re-syncs history
- [ ] Restart backend server while two clients connected → both reconnect automatically (Socket.IO default), history reloads from MongoDB (unaffected by restart since it's persisted, not in-memory)
- [ ] Delete a room you own → removed from list; deleting a room you don't own is blocked (403)
- [ ] Click "Generate AI Summary" on a room with text notes → summary appears in the modal
- [ ] Click it on an empty/drawing-only room → friendly "no text yet" message, not an error
- [ ] Click Regenerate → a new request fires, loading state shows, result updates
- [ ] Click Copy Summary → toast confirms copy; paste elsewhere to verify clipboard content
- [ ] Temporarily set `GROQ_API_KEY` to an invalid value and restart → clicking the button shows a clear error, not a crash
- [ ] Comment out `GROQ_API_KEY` entirely → button shows "AI summary is not configured on this server"
- [ ] Click the button 11+ times within 10 minutes → the 11th request gets rate-limited (429)

---

## 9. Future Improvements

- **Beginner:** add a "copy room link" button, add more brush colors/textures
- **Intermediate:** paginate/cap `strokes` array size per room (e.g. archive to a separate
  collection after 5,000 strokes) to keep documents under MongoDB's 16MB limit
- **Advanced:** add WebRTC voice chat per room, conflict resolution for simultaneous shape edits (OT/CRDT)
- **Enterprise:** horizontal scaling with a Socket.IO Redis adapter (needed once you run
  more than one server instance, so rooms stay in sync across servers), audit logging, SSO
