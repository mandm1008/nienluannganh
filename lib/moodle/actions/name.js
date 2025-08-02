export const START_CTN = 'start-ctn';
export const STOP_CTN = 'stop-ctn';
export const UPDATE_DATA = 'update-data';
export const DELETE_DATA = 'delete-data';
export const DELETE_SAVE_DATA = 'delete-save-data';
export const FIX_CTN = 'fix-ctn';
export const RE_SCHEDULE = 're-schedule';

export const EXAMROOM_ACTIONS = {
  START_CTN,
  STOP_CTN,
  UPDATE_DATA,
  DELETE_DATA,
  DELETE_SAVE_DATA,
  FIX_CTN,
  RE_SCHEDULE,
};

export const EXAMROOM_ACTION_LABELS = {
  [START_CTN]: 'Start Rooms',
  [STOP_CTN]: 'Stop Rooms',
  [UPDATE_DATA]: 'Update Rooms',
  [DELETE_DATA]: 'Delete Rooms (Do Not Save)',
  [DELETE_SAVE_DATA]: 'Delete Rooms (Keep Data)',
  [FIX_CTN]: 'Auto Fix Issues',
  [RE_SCHEDULE]: 'Reschedule Rooms',
};
