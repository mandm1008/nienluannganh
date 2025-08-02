'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Error caught by error.tsx:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center bg-white dark:bg-black">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400">
          Something went wrong!
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
