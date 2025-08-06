export default function ColorShowcase() {
  const colors = [
    { name: 'Primary Electric Indigo', class: 'bg-primary-600', darkClass: 'dark:bg-primary-400' },
    { name: 'Secondary Sky Blue', class: 'bg-secondary-400', darkClass: 'dark:bg-secondary-300' },
    { name: 'Accent Cyan', class: 'bg-accent-50', darkClass: 'dark:bg-accent-200' },
    { name: 'Surface Light', class: 'bg-white', darkClass: 'dark:bg-slate-800' },
    { name: 'Surface Dark', class: 'bg-slate-800', darkClass: 'dark:bg-slate-900' },
  ];

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Theme Color Palette
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {colors.map((color) => (
          <div key={color.name} className="text-center">
            <div 
              className={`w-full h-16 rounded-lg mb-2 ${color.class} ${color.darkClass} border border-gray-200 dark:border-slate-600`}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">{color.name}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <p className="text-primary-800 dark:text-primary-200 text-sm">
          <strong>Electric Indigo (#5d1edd)</strong> - Primary brand color used for buttons, links, and key elements
        </p>
      </div>
      
      <div className="mt-4 p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg">
        <p className="text-secondary-800 dark:text-secondary-200 text-sm">
          <strong>Vivid Sky Blue (#2ac4f7)</strong> - Secondary color for highlights and accents
        </p>
      </div>
      
      <div className="mt-4 p-4 bg-accent-50 dark:bg-slate-700 rounded-lg">
        <p className="text-slate-800 dark:text-slate-200 text-sm">
          <strong>Light Cyan (#d4f2fa)</strong> - Subtle accent color for backgrounds and gentle highlights
        </p>
      </div>
    </div>
  );
}