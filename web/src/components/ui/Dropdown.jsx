import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function Dropdown({ 
  value, 
  onChange, 
  options = [], 
  label, 
  placeholder = 'Select option',
  className = '',
  icon: Icon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
          <span className="text-gray-900 dark:text-white font-medium">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      <div className={`absolute top-full left-0 right-0 mt-2 z-50 transition-all duration-300 ease-out origin-top ${
        isOpen
          ? 'opacity-100 scale-y-100 scale-x-100 translate-y-0'
          : 'opacity-0 scale-y-0 scale-x-100 -translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200/50 dark:border-slate-600/50 rounded-xl shadow-xl py-2 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-all duration-200 ${
                value === option.value 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                  : 'text-gray-900 dark:text-white'
              }`}
              style={{
                animationDelay: isOpen ? `${index * 50}ms` : '0ms'
              }}
            >
              <div className="flex items-center space-x-3">
                {option.icon && <option.icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
              {value === option.value && (
                <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 transition-all duration-200" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}