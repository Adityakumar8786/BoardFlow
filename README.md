# Collaborative Whiteboard

A real-time, multi-room collaborative whiteboard built with the MERN-adjacent stack:
**React + Node.js + Express + MongoDB + Socket.IO + Passport.js (session auth)**.

---

## 1. Features

- Email/password auth via Passport.js **sessions** (no JWT) — register, login, logout, "remember me"
- Protected routes (frontend `ProtectedRoute`, backend `ensureAuthenticated` middleware)
- Real-time drawing: Pencil, Eraser, Rectangle, Circle, Line
- Adjustable brush color and size
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

## 3. Folder Structure

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

### Step 4: Try it
1. Register a new account.
2. Create a room — note the 6-character code.
3. Open the room URL in a second browser (or incognito window), log in as a different user,
   and join the same code.
4. Draw — you'll see strokes and cursors sync in real time.

---

## 5. Security Measures Implemented

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

---

## 6. Deployment Notes

- Backend: deploy to Render/Railway/Fly.io. Set all `.env` variables in the platform's
  dashboard. Set `NODE_ENV=production` so cookies get `secure: true`.
- Frontend: `npm run build` produces a static `dist/` folder — deploy to Vercel/Netlify, or
  serve it from Express as static files for a single-service deployment.
- MongoDB: use MongoDB Atlas for a managed production database.
- Update `CLIENT_URL` in the backend `.env` to your deployed frontend URL, and update the
  frontend's socket/api calls to point at the deployed backend URL if not using the Vite proxy.

---

## 7. Manual Testing Checklist

- [ ] Register with a duplicate email → should reject with 409
- [ ] Login with wrong password → should reject with 401
- [ ] Visit `/dashboard` while logged out → redirected to `/login`
- [ ] Create room → code appears, room shows in "Your Rooms"
- [ ] Join room from a second browser session → both users see each other in Online Users
- [ ] Draw with each tool → verify shape renders correctly and syncs to the other browser
- [ ] Undo, then redo → stroke disappears then reappears on both browsers
- [ ] Clear canvas → confirmation dialog appears; confirming clears for both users
- [ ] Export PNG/JPG → file downloads with the current drawing
- [ ] Disconnect Wi-Fi briefly → "Reconnecting..." badge shows, then reconnects and re-syncs history
- [ ] Restart backend server while two clients connected → both reconnect automatically (Socket.IO default), history reloads from MongoDB (unaffected by restart since it's persisted, not in-memory)
- [ ] Delete a room you own → removed from list; deleting a room you don't own is blocked (403)

---

## 8. Future Improvements

- **Beginner:** add a "copy room link" button, add more brush colors/textures
- **Intermediate:** paginate/cap `strokes` array size per room (e.g. archive to a separate
  collection after 5,000 strokes) to keep documents under MongoDB's 16MB limit
- **Advanced:** add WebRTC voice chat per room, conflict resolution for simultaneous shape edits (OT/CRDT)
- **Enterprise:** horizontal scaling with a Socket.IO Redis adapter (needed once you run
  more than one server instance, so rooms stay in sync across servers), audit logging, SSO
