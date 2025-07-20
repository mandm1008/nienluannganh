import { useState, useEffect } from 'react';

export default function DarkMode() {
  const [darkMode, setDarkMode] = useState(
    typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-4 right-4 p-3 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-full shadow-lg transition duration-300 hover:bg-gray-300 dark:hover:bg-gray-700"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
}
