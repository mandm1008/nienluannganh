import { EventManager } from '@/lib/tools/events';

export const STATUS_CODE = {
  REGISTERED: 10000,

  SCHEDULE_UPDATING: 10001,
  SCHEDULED: 11000,

  DEPLOYING_STARTING: 11001,
  DEPLOYING_CREATING_CONTAINER: 11002,
  DEPLOYING_INITIALIZING: 11003,
  DEPLOYING_GETTING_TOKEN: 11004,
  DEPLOYING_RESTORING_DATA: 11005,

  DEPLOYED: 11100,

  DELETING_STARTING: 11101,
  DELETING_EXPORTING_DATA: 11102,
  DELETING_CONTAINER: 11103,
  DELETING_CLEANING_DATA: 11104,

  DELETED: 11110,

  STOPED: 11112,
  STOPING: 11111,

  FAILED: 11999,
  CANCELLED: 11998,
};

const STATUS_MAP = {
  10000: { key: 'REGISTERED', label: 'Registered!' },
  10001: { key: 'SCHEDULE_UPDATING', label: 'Deployment schedule...' },
  11000: { key: 'SCHEDULED', label: 'Deployment scheduled' },

  11001: { key: 'DEPLOYING_STARTING', label: 'Starting deployment...' },
  11002: {
    key: 'DEPLOYING_CREATING_CONTAINER',
    label: 'Creating container...',
  },
  11003: {
    key: 'DEPLOYING_INITIALIZING',
    label: 'Initializing application...',
  },
  11004: {
    key: 'DEPLOYING_GETTING_TOKEN',
    label: 'Requesting access token...',
  },
  11005: { key: 'DEPLOYING_RESTORING_DATA', label: 'Restoring course data...' },

  11100: { key: 'DEPLOYED', label: 'Deployment completed' },

  11101: { key: 'DELETING_STARTING', label: 'Starting deletion process...' },
  11102: { key: 'DELETING_EXPORTING_DATA', label: 'Backing up course data...' },
  11103: { key: 'DELETING_CONTAINER', label: 'Removing container...' },
  11104: { key: 'DELETING_CLEANING_DATA', label: 'Cleaning up resources...' },

  11110: { key: 'DELETED', label: 'Deleted successfully' },

  11111: { key: 'STOPING', label: 'Stoping container...' },
  11112: { key: 'STOPED', label: 'Container stop!' },

  11999: { key: 'FAILED', label: 'Deployment failed' },
  11998: { key: 'CANCELLED', label: 'Cancelled by user' },
};

export function getStatusLabel(code) {
  return STATUS_MAP[code]?.label || 'Unknown status';
}

export function getStatusKey(code) {
  return STATUS_MAP[code]?.key || 'UNKNOWN';
}

export const STATUS_CHANGE = 'status:change';
export function dispatchStatusEvent(containerName, status) {
  EventManager.emit(STATUS_CHANGE, { containerName, status });
}
