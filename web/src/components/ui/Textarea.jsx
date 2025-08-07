import { forwardRef } from 'react';

const Textarea = forwardRef(({ 
  label, 
  error, 
  required = false, 
  className = '', 
  rows = 3,
  onKeyDown,
  onBlur,
  ...props 
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`
          w-full px-4 py-3 
          bg-white dark:bg-slate-800 
          border border-gray-300 dark:border-slate-600 
          text-gray-900 dark:text-white 
          placeholder-gray-500 dark:placeholder-gray-400
          rounded-xl 
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
          transition-all duration-200
          hover:border-gray-400 dark:hover:border-slate-500
          resize-vertical
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;