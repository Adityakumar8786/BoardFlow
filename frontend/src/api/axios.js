// src/api/axios.js
// Purpose: A pre-configured axios instance. `withCredentials: true` is essential —
// it tells the browser to send the session cookie on every request, which is how
// Passport recognizes the logged-in user (no JWT header needed).

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default api;
