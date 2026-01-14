import { config } from "dotenv";
import { GameDig } from "gamedig";
import Docker from "dockerode";

config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 27015;
const SERVER_TYPE = process.env.SERVER_TYPE || "csgo";
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 60000; // Check every 60s
const TARGET_CONTAINER_NAME = process.env.TARGET_CONTAINER_NAME;
const MAX_BAD_MAP_STREAK = parseInt(process.env.MAX_BAD_MAP_STREAK) || 3;

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
// State Tracking
let badMapStreak = 0;

async function triggerRestart() {
  if (!TARGET_CONTAINER_NAME) {
    console.error("❌ Error: TARGET_CONTAINER_NAME env variable is not set.");
    return;
  }

  console.warn(
    `⚠️  LIMIT REACHED: Restarting container '${TARGET_CONTAINER_NAME}'...`
  );

  try {
    // Get the container instance
    const container = docker.getContainer(TARGET_CONTAINER_NAME);

    await container.inspect();

    // Issue the restart command
    await container.restart();
    console.log(
      `✅ Restart command successfully sent to ${TARGET_CONTAINER_NAME}.`
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
  try {
    const state = await GameDig.query({
      type: SERVER_TYPE,
      host: SERVER_HOST,
      port: SERVER_PORT,
    });

    // Check if map is null, undefined, or an empty string
    const isMapInvalid = !state.map || state.map.trim() === "";

    if (isMapInvalid) {
      badMapStreak++;

      if (badMapStreak >= MAX_BAD_MAP_STREAK) {
        await triggerRestart();
        badMapStreak = 0; // Reset counter after triggering
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

// Start the monitoring loop
console.log(`Starting Monitor for ${SERVER_HOST}:${SERVER_PORT}`);
console.log(
  `Trigger threshold: ${MAX_BAD_MAP_STREAK} consecutive empty map checks.`
);

// Run immediately once, then set the interval
serverHealthCheck();
setInterval(serverHealthCheck, UPDATE_INTERVAL);
