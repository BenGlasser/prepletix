import { forwardRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

const Checkbox = forwardRef(({ 
  label, 
  error,
  checked = false,
  className = '',
  ...props 
}, ref) => {
  return (
    <div className={className}>
      <label className="flex items-center space-x-3 cursor-pointer">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            className="sr-only"
            {...props}
          />
          <div className={`
            w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
            ${checked 
              ? 'bg-primary-600 border-primary-600 dark:bg-primary-500 dark:border-primary-500' 
              : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-400'
            }
            ${error ? 'border-red-500' : ''}
          `}>
            {checked && (
              <CheckIcon className="w-3 h-3 text-white stroke-2" />
            )}
          </div>
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
            {label}
          </span>
        )}
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;