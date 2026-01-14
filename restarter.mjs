import { config } from "dotenv";
import { GameDig } from "gamedig";
import Docker from "dockerode";

config();

const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 27015;
const SERVER_TYPE = process.env.SERVER_TYPE || "csgo";
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 60000;
const TARGET_CONTAINER_NAME = process.env.TARGET_CONTAINER_NAME;
const MAX_BAD_MAP_STREAK = parseInt(process.env.MAX_BAD_MAP_STREAK) || 3;
const RESTART_COOLDOWN = parseInt(process.env.RESTART_COOLDOWN) || 300000;

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

let badMapStreak = 0;
let restartCooldownUntil = null;

async function triggerRestart() {
  if (!TARGET_CONTAINER_NAME) {
    console.error("❌ Error: TARGET_CONTAINER_NAME env variable is not set.");
    return;
  }

  console.warn(
    `⚠️  LIMIT REACHED: Restarting container '${TARGET_CONTAINER_NAME}'...`
  );

  try {
    const container = docker.getContainer(TARGET_CONTAINER_NAME);
    await container.inspect();
    await container.restart();

    console.log(
      `✅ Restart command successfully sent to ${TARGET_CONTAINER_NAME}.`
    );

    restartCooldownUntil = Date.now() + RESTART_COOLDOWN;
    console.log(
      `⏸️  Server checks paused for ${RESTART_COOLDOWN / 1000} seconds.`
    );
  } catch (err) {
    if (err.statusCode === 404) {
      console.error(
        `❌ Error: Container '${TARGET_CONTAINER_NAME}' not found.`
      );
    } else {
      console.error("❌ Docker API Error:", err);
    }
  }
}

async function serverHealthCheck() {
  if (restartCooldownUntil && Date.now() < restartCooldownUntil) {
    const remainingSeconds = Math.ceil(
      (restartCooldownUntil - Date.now()) / 1000
    );
    console.log(
      `⏸️  Cooldown active. Skipping check. ${remainingSeconds}s remaining.`
    );
    return;
  }

  if (restartCooldownUntil && Date.now() >= restartCooldownUntil) {
    restartCooldownUntil = null;
    console.log("▶️  Cooldown period ended. Resuming server checks.");
  }

  try {
    const state = await GameDig.query({
      type: SERVER_TYPE,
      host: SERVER_HOST,
      port: SERVER_PORT,
    });

    const isMapInvalid =
      !state.map || state.map.trim() === "" || state.map === "<empty>";

    if (isMapInvalid) {
      badMapStreak++;

      if (badMapStreak >= MAX_BAD_MAP_STREAK) {
        await triggerRestart();
        badMapStreak = 0;
      }
    } else {
      badMapStreak = 0;
    }
  } catch (err) {
    console.error(
      "❌ Error fetching server info (Server might be offline):",
      err.message
    );
  }
}

console.log(`Starting Monitor for ${SERVER_HOST}:${SERVER_PORT}`);
console.log(`Update interval: ${UPDATE_INTERVAL / 1000} seconds.`);
console.log(
  `Trigger threshold: ${MAX_BAD_MAP_STREAK} consecutive empty map checks.`
);
console.log(`Restart cooldown period: ${RESTART_COOLDOWN / 1000} seconds.`);

serverHealthCheck();
setInterval(serverHealthCheck, UPDATE_INTERVAL);
