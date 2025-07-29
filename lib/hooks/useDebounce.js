import { useState, useEffect } from 'react';

/**
 * Debounces a value after a delay
 * @param {*} value - The input value to debounce
 * @param {number} delay - Delay in ms (default: 300)
 * @returns {*} - Debounced value
 */
export default function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
