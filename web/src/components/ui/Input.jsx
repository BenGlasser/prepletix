import { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  required = false, 
  className = '', 
  icon: Icon,
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
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <input
          ref={ref}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={`
            w-full px-4 py-3 
            ${Icon ? 'pl-10' : 'pl-4'} 
            bg-white dark:bg-slate-800 
            border border-gray-300 dark:border-slate-600 
            text-gray-900 dark:text-white 
            placeholder-gray-500 dark:placeholder-gray-400
            rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
            transition-all duration-200
            hover:border-gray-400 dark:hover:border-slate-500
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;