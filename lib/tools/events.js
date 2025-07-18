// lib/tools/events.js

if (!globalThis._eventManager) {
  const _callbacks = {};

  globalThis._eventManager = {
    on(eventName, cb) {
      if (!_callbacks[eventName]) _callbacks[eventName] = [];
      _callbacks[eventName].push(cb);
      return () => globalThis._eventManager.off(eventName, cb);
    },

    off(eventName, cb) {
      if (!_callbacks[eventName]) return;
      _callbacks[eventName] = _callbacks[eventName].filter((fn) => fn !== cb);
      if (_callbacks[eventName].length === 0) delete _callbacks[eventName];
    },

    emit(eventName, ...args) {
      if (_callbacks[eventName]) {
        for (const cb of [..._callbacks[eventName]]) {
          cb(...args);
        }
      }
    },

    once(eventName) {
      return new Promise((resolve) => {
        const cb = (...args) => {
          resolve(args);
          globalThis._eventManager.off(eventName, cb);
        };
        globalThis._eventManager.on(eventName, cb);
      });
    },
  };
}

export const EventManager = globalThis._eventManager;
