/**
 * Socket.IO client singleton — mirrors the main web app's client.
 *
 * - One connection per tab, opened by the first subscriber and kept up while
 *   signed in. The API puts admin sockets in an `admins` room at handshake,
 *   which is where dashboard events (the Shopi team inbox) are sent.
 * - Authenticates via the JWT access token from the auth store, re-read on
 *   every connection attempt (so reconnects always carry the latest token).
 * - JWT auth only happens at handshake time, so an identity change forces a
 *   fresh handshake. Unlike the web app there are no guest sockets: signing
 *   out closes the connection.
 * - A handshake denied by the server middleware (e.g. expired JWT) is FINAL
 *   for Socket.IO — it never retries on its own. We refresh the token and
 *   reconnect manually with backoff instead of leaving a dead socket.
 * - Prefer the `useSocket()` hook in components.
 */

import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/lib/auth/refresh-token";

// Socket.IO server is on the same host as the GraphQL API.
const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1_000;

/**
 * JWT subject WITHOUT verification — only used to detect an identity change
 * (login/logout/account switch) so we know when a re-handshake is required.
 */
function tokenSubject(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      sub?: string;
      id?: string;
    };
    return payload.sub ?? payload.id ?? null;
  } catch {
    return null;
  }
}

/** Manual reconnect with capped exponential backoff (for denied handshakes). */
function scheduleReconnect(): void {
  if (retryTimer || socket?.connected) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (socket && !socket.connected && useAuthStore.getState().accessToken) socket.connect();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 30_000);
}

/**
 * Return the shared Socket instance, creating it on first call.
 * Must only be called in browser context (not during SSR).
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(WS_URL, {
    // Pass JWT in handshake auth (not visible in URL/logs), re-read on every attempt.
    auth: (cb) => {
      const token = useAuthStore.getState().accessToken;
      cb(token ? { token } : {});
    },
    transports: ["websocket", "polling"],
    // If the websocket transport itself fails (proxy, firewall), fall back to
    // long-polling instead of retrying websocket forever.
    tryAllTransports: true,
    autoConnect: false, // Connected explicitly by connectSocket()
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
  });

  socket.on("connect", () => {
    retryDelay = 1_000;
  });

  socket.on("connect_error", (err) => {
    console.warn("[WS] connect error", err.message);

    // `active` = Socket.IO will retry by itself (transport-level failure).
    // Inactive means the server DENIED the handshake (invalid or expired JWT),
    // which Socket.IO never retries.
    if (socket?.active) return;

    void (async () => {
      // A failed refresh isn't treated as sign-out here — it can be a network
      // blip. A dead session is cleared by the Apollo link on the next request,
      // and the auth subscription below then closes the socket.
      if (useAuthStore.getState().refreshToken) await refreshAccessToken();
      scheduleReconnect();
    })();
  });

  // Re-handshake when the signed-in identity changes. The subscription lives
  // for the app's lifetime — the socket is a tab-wide singleton.
  let lastSubject = tokenSubject(useAuthStore.getState().accessToken);
  useAuthStore.subscribe((state) => {
    const subject = tokenSubject(state.accessToken);
    if (!socket) return;

    if (!subject) {
      lastSubject = null;
      socket.disconnect();
      return;
    }

    if (subject === lastSubject) {
      // Same user: a routine token refresh doesn't need a reconnect (auth is
      // only checked at handshake), but a socket that died while the old token
      // was expired should retry now that a fresh one exists.
      if (!socket.connected && !socket.active) socket.connect();
      return;
    }

    lastSubject = subject;
    socket.disconnect();
    socket.connect();
  });

  return socket;
}

/** Connect (or reconnect) the shared socket. Safe to call repeatedly. */
export function connectSocket(): void {
  if (!useAuthStore.getState().accessToken) return;
  const s = getSocket();
  if (!s.connected) s.connect();
}
