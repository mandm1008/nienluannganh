import { toZonedTime, format } from 'date-fns-tz';

/**
 * Convert Unix timestamp (seconds) to UTC cron expression
 * @param timestamp Unix timestamp in seconds (UTC)
 * @param offsetMinutes Optional offset in minutes (can be negative)
 * @returns string Cron string in UTC
 */
export function timestampToCron(timestamp, offsetMinutes = 0) {
  const baseDate = new Date(timestamp * 1000);
  const adjustedTime = baseDate.getTime() + offsetMinutes * 60 * 1000;
  const adjustedDate = new Date(adjustedTime);

  const min = adjustedDate.getUTCMinutes();
  const hour = adjustedDate.getUTCHours();
  const day = adjustedDate.getUTCDate();
  const month = adjustedDate.getUTCMonth() + 1; // Month is 0-based

  return `${min} ${hour} ${day} ${month} *`;
}

/**
 * Convert a UTC cron string to a human-readable time in a specific timezone
 * @param cronExpr - Cron string in UTC format (e.g. "41 6 6 7 *")
 * @param timeZone - Timezone to convert to (default: 'Asia/Ho_Chi_Minh')
 * @returns {string} Readable time like "Sunday, 6 July 2025, 1:41 PM (GMT+7)"
 */
export function cronToReadableTime(cronExpr, timeZone = 'Asia/Ho_Chi_Minh') {
  const [minStr, hourStr, dayStr, monthStr] = cronExpr.split(' ');

  const year = new Date().getUTCFullYear(); // or your fixed year
  const utcDate = new Date(
    Date.UTC(
      year,
      parseInt(monthStr) - 1,
      parseInt(dayStr),
      parseInt(hourStr),
      parseInt(minStr)
    )
  );

  return format(
    toZonedTime(utcDate, timeZone),
    'EEEE, d MMMM yyyy, h:mm a (zzz)',
    { timeZone }
  );
}

/**
 * Checks if the given cron time (in format "m h d M *") is earlier than current UTC time.
 *
 * Only supports fixed cron expressions like "30 14 1 7 *".
 * Does NOT support wildcards (*), ranges (x-y), or step values (*\/x).
 *
 * @param {string} cronExpr - The cron expression in fixed format (e.g., "30 14 1 7 *").
 * @returns {boolean} True if the UTC time from cron is earlier than now (also UTC).
 *
 * @example
 * checkCronTime("30 14 1 7 *"); // true if now is after July 1st 14:30 UTC this year
 */
export function checkCronTime(cronExpr) {
  const [minute, hour, day, month] = cronExpr.split(' ').map(Number); // month is 1-based

  const now = new Date(); // current time in UTC
  const cronDate = new Date(
    Date.UTC(now.getUTCFullYear(), month - 1, day, hour, minute)
  );

  return cronDate < now;
}
