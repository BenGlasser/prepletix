export default function SimpleToggleTest() {
  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    console.log('Toggled dark mode. Classes:', html.classList.toString());
  };

  return (
    <div className="p-6 m-4 border-2 border-red-500">
      <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
        Simple Toggle Test
      </h2>
      
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
        <p className="text-gray-900 dark:text-gray-100 mb-4">
          This text should change color when you toggle dark mode.
        </p>
        
        <button 
          onClick={toggleDark}
          className="px-4 py-2 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800"
        >
          Toggle Dark Mode
        </button>
        
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Current HTML classes: <span id="classes-display">{document?.documentElement?.className || 'loading...'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}