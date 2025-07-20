import { EventManager } from '@/lib/tools/events';

export const ERROR_CODE = {
  ERROR_KILL: 1,
  ERROR_DIE: 10,
  ERROR_DEPLOY: 11,
  ERROR_INIT: 20,
};

export const ERROR_MAP = {
  1: {key: 'ERROR_KILL', label: 'Error!'},
  10: { key: 'ERROR_DIE', label: 'Error die' },
  11: { key: 'ERROR_DEPLOY', label: 'Error container' },
  20: { key: 'ERROR_INIT', label: 'Error init container' },
};

export function getErrorLabel(code) {
  return ERROR_MAP[code]?.label || 'Unknown error';
}

export function getErrorKey(code) {
  return ERROR_MAP[code]?.key || 'UNKNOWN';
}

export const ERROR_SOCKET_NAME = 'error';
export const ERROR_EVENT = 'error:dispatch';
export function dispatchErrorEvent(containerName, error) {
  EventManager.emit(ERROR_EVENT, { containerName, error });
}
