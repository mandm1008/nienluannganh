import { EventManager } from '@/lib/tools/events';
import { fixErrorJob } from './jobs';
import { ERROR_EVENT } from '@/lib/tools/errors';

// Tracks fix attempt counts per container
const errorFixRetryMap = {};

/**
 * Returns a unique key per container
 */
function getKey(containerName) {
  return containerName;
}

/**
 * Increments fix attempt count and returns the current count
 */
function incrementFixCount(containerName) {
  const key = getKey(containerName);
  errorFixRetryMap[key] = (errorFixRetryMap[key] || 0) + 1;
  return errorFixRetryMap[key];
}

/**
 * Resets the fix count (after successful fix)
 */
function resetFixCount(containerName) {
  const key = getKey(containerName);
  delete errorFixRetryMap[key];
}

/**
 * Listens for error events and tries to fix the error
 */
export function startAutoFix() {
  EventManager.on(ERROR_EVENT, async ({ containerName }) => {
    const currentCount = incrementFixCount(containerName);

    if (currentCount > 3) {
      console.warn(
        `[AUTO_FIX] ❌ Too many retries (${currentCount}) for ${containerName}. Giving up.`
      );
      return;
    }

    console.log(
      `[AUTO_FIX] ⚠️ Detected error from ${containerName}, attempting fix... (attempt ${currentCount}/3)`
    );

    try {
      await fixErrorJob(containerName);
      console.log(`[AUTO_FIX] ✅ Fix successful for ${containerName}`);
      resetFixCount(containerName);
    } catch (err) {
      console.error(
        `[AUTO_FIX] ❌ Fix failed for ${containerName}: ${err.message}`
      );
    }
  });
}
