export const runtime = 'nodejs';

export async function register() {
  console.log('[INIT] Starting script is running...');

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { overrideConsole } = await import('@/logger');
      overrideConsole();

      const { startAutoFix } = await import('@/lib/moodle/auto-fix');
      startAutoFix();

      const { scheduleAllJob } = await import('@/lib/tools/schedule');
      await scheduleAllJob();

      console.log('[INIT] All startup tasks completed.');
    } catch (error) {
      console.error('[INIT] Startup failed:', error);
    }
  }

  console.log('[INIT] Starting script end!');
}
