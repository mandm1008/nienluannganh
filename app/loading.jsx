export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-white/60 dark:bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <img
          src="/loading.svg"
          alt="Loading..."
          className="w-16 h-16 animate-spin"
        />
        <p className="text-gray-800 dark:text-gray-200 text-lg font-medium">
          Loading content, please wait...
        </p>
      </div>
    </div>
  );
}
