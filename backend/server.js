// backend/server.js
// Purpose: Application entry point. Wires up Express, security middleware, sessions,
// Passport, MongoDB, REST routes, and the Socket.IO server on one HTTP server instance.

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const initSocket = require("./sockets/socketHandler");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

connectDB();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ---------- SECURITY ----------
// Helmet sets a battery of protective HTTP headers (X-Content-Type-Options, HSTS, etc.)
// to guard against common attacks like clickjacking and MIME sniffing.
app.use(helmet());

// CORS: only the configured frontend origin may make credentialed requests (cookies).
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// Rate limiting: caps each IP to 300 requests per 15 minutes to blunt brute-force
// and denial-of-service attempts against the API.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use("/api", limiter);

// A stricter limiter specifically on auth routes — brute-forcing logins is the highest-value
// target, so it gets a tighter cap than general API traffic.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Strips any keys starting with "$" or containing "." from req.body/query/params —
// prevents MongoDB operator injection (e.g. { "email": { "$gt": "" } }).
app.use(mongoSanitize());

// ---------- SESSION (Passport uses this, no JWT) ----------
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: "sessions" }),
  cookie: {
    httpOnly: true, // JS on the page cannot read the cookie — mitigates XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS-only cookie in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day default; extended on login if "remember me" is checked
  },
});
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// ---------- ROUTES ----------
app.get("/api/health", (req, res) => res.json({ success: true, message: "API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.use(notFound);
app.use(errorHandler);

// ---------- SOCKET.IO ----------
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

// Share the Express session with Socket.IO so we could, if needed, verify identity from
// the same cookie (kept simple here: the client sends user info explicitly on join-room).
io.engine.use(sessionMiddleware);

initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
