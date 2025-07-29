import { EventManager } from '@/lib/tools/events';
import { fixErrorJob } from './jobs';
import { ERROR_EVENT } from './state/errors';

// Retry state tracking
const errorFixRetryMap = {}; // containerName -> { count, lastRetry, isRunning }

function getKey(containerName) {
  return containerName;
}

function incrementFixState(containerName) {
  const key = getKey(containerName);
  if (!errorFixRetryMap[key]) {
    errorFixRetryMap[key] = { count: 0, lastRetry: 0, isRunning: false };
  }
  errorFixRetryMap[key].count += 1;
  errorFixRetryMap[key].lastRetry = Date.now();
  return errorFixRetryMap[key].count;
}

function resetFixState(containerName) {
  const key = getKey(containerName);
  delete errorFixRetryMap[key];
}

function setFixRunning(containerName, state) {
  const key = getKey(containerName);
  if (!errorFixRetryMap[key]) return;
  errorFixRetryMap[key].isRunning = state;
}

function isFixRunning(containerName) {
  const key = getKey(containerName);
  return errorFixRetryMap[key]?.isRunning === true;
}

function getBackoffTime(count) {
  // Simple exponential backoff: 3s, 6s, 12s...
  return Math.min(60000, 3000 * Math.pow(2, count - 1)); // Max 60s
}

export function startAutoFix() {
  console.log('[AUTO_FIX] Starting...');

  EventManager.on(ERROR_EVENT, async ({ containerName }) => {
    const key = getKey(containerName);

    if (isFixRunning(containerName)) {
      console.warn(
        `[AUTO_FIX] ⏳ Fix already in progress for ${containerName}, skipping...`
      );
      return;
    }

    const currentCount = incrementFixState(containerName);
    if (currentCount > 3) {
      console.warn(
        `[AUTO_FIX] ❌ Too many retries (${currentCount}) for ${containerName}. Giving up.`
      );
      // resetFixState(containerName);
      return;
    }

    const delay = getBackoffTime(currentCount);
    console.log(
      `[AUTO_FIX] ⚠️ Detected error from ${containerName}, scheduling fix in ${
        delay / 1000
      }s... (attempt ${currentCount}/3)`
    );

    setFixRunning(containerName, true);

    setTimeout(async () => {
      try {
        const success = await fixErrorJob(containerName);
        if (success !== true) throw new Error('Fix returned: ' + success);
        console.log(`[AUTO_FIX] ✅ Fix successful for ${containerName}`);
        resetFixState(containerName);
      } catch (err) {
        console.error(
          `[AUTO_FIX] ❌ Fix failed for ${containerName}: ${err.message}`
        );
        setFixRunning(containerName, false);

        const retryCount = errorFixRetryMap[key]?.count || 0;
        if (retryCount < 3) {
          console.log(`[AUTO_FIX] 🔁 Will retry fix for ${containerName}`);

          EventManager.emit(ERROR_EVENT, { containerName });
        } else {
          console.warn(
            `[AUTO_FIX] 🛑 Max retries reached for ${containerName}`
          );
        }
      }
    }, delay);
  });

  console.log('[AUTO_FIX] Started!');
}
