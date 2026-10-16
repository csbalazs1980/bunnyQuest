import { defineConfig } from "vite";
 
export default defineConfig({
  server: { port: 5173, host: true }, // host: true lets friends on your LAN connect
});
