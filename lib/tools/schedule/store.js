import { CronJob } from 'cron';
import { checkCronTime } from '@/lib/tools/crontime';

/**
 * StoreJob class to manage CronJobs with optional suffixes (e.g., `--Open` or `--Close`).
 * All instances share the same static cronList Map.
 */
class StoreJob {
  /**
   * Static job store map: key = `${containerName}--Open` or `${containerName}--Close`.
   * @type {Map<string, CronJob>}
   * @static
   */
  static cronList = new Map();

  /**
   * Create a new StoreJob instance.
   * @param {string} [suffix=''] Suffix automatically appended to all job names for this instance.
   */
  constructor(suffix = '') {
    this.suffix = suffix;
  }

  /**
   * Build the complete job key from the given name and this instance's suffix.
   * @param {string} name Base job name.
   * @returns {string} Job key with suffix appended.
   */
  key(name) {
    return `${name}${this.suffix}`;
  }

  /**
   * Get a CronJob by its name.
   * @param {string} name Base job name.
   * @returns {CronJob|undefined} The CronJob instance if found.
   */
  get(name) {
    return StoreJob.cronList.get(this.key(name));
  }

  /**
   * Create a new CronJob if it does not already exist.
   * @param {string} name Base job name.
   * @param {{time: string, handler: Function}} options Cron schedule and handler function.
   * @returns {boolean} True if created successfully, false if job already exists.
   */
  set(name, { time, handler }) {
    if (this.has(name)) return false;
    const cronJob = new CronJob(time, handler, null, true, 'UTC');
    StoreJob.cronList.set(this.key(name), cronJob);
    return true;
  }

  /**
   * Stop and delete an existing CronJob (if any), then create a new one.
   * @param {string} name Base job name.
   * @param {{time: string, handler: Function}} options Cron schedule and handler function.
   * @returns {Promise<void>}
   */
  async setFork(name, { time, handler }) {
    const job = this.get(name);
    if (job) {
      await job.stop();
      this.delete(name);
    }
    this.set(name, { time, handler });
  }

  /**
   * Check if a CronJob exists.
   * @param {string} name Base job name.
   * @returns {boolean} True if job exists.
   */
  has(name) {
    return StoreJob.cronList.has(this.key(name));
  }

  /**
   * Delete a CronJob from the store (does not stop it).
   * @param {string} name Base job name.
   * @returns {boolean} True if deleted.
   */
  delete(name) {
    return StoreJob.cronList.delete(this.key(name));
  }

  /**
   * Stop and delete a CronJob if it exists.
   * @param {string} name Base job name.
   * @returns {Promise<void>}
   */
  async cancel(name) {
    const job = this.get(name);
    if (job) {
      await job.stop();
      this.delete(name);
    }
  }

  /**
   * Create a new StoreJob instance that automatically appends `--Open` to all job names.
   * @returns {StoreJob} StoreJob instance for "open" jobs.
   */
  open() {
    return new StoreJob('--Open');
  }

  /**
   * Create a new StoreJob instance that automatically appends `--Close` to all job names.
   * @returns {StoreJob} StoreJob instance for "close" jobs.
   */
  close() {
    return new StoreJob('--Close');
  }
}

export { StoreJob };
export default new StoreJob();
