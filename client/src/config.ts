// Map size, tile size, speeds and terrain rules live in shared/ (map.json + world.ts).

const wsProtocol = location.protocol === "https:" ? "wss" : "ws";

/**
 * Game server address:
 * - VITE_SERVER_URL if set (e.g. a separately hosted server)
 * - during development (Vite dev server on port 5173): the same host, port 2567
 * - otherwise the page was served by the game server itself (npm run share, or through a
 *   Cloudflare tunnel), so the game server is at the very same address as the page
 */
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (location.port === "5173" ? `${wsProtocol}://${location.hostname}:2567` : `${wsProtocol}://${location.host}`);
