import { createServer } from "http";
import { existsSync } from "fs";
import { resolve } from "path";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.get("/health", (_req, res) => res.send("ok"));

// If the client has been built (npm run share / npm run build), serve the game from this same port.
// Then the page and the game server share one address, so a single Cloudflare tunnel is enough.
// (npm scripts run with the server/ folder as the working directory.)
const clientDist = resolve(process.cwd(), "../client/dist");
const servingClient = existsSync(clientDist);
if (servingClient) app.use(express.static(clientDist));

const gameServer = new Server({
  transport: new WebSocketTransport({ server: createServer(app) }),
});

gameServer.define("game", GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`🐰 bunnyQuest server listening on port ${PORT}`);
  if (servingClient) {
    console.log(`   Game: http://localhost:${PORT}`);
    console.log(`   Share it: run "npm run tunnel" in another terminal and send your friends the trycloudflare.com link`);
  }
});
