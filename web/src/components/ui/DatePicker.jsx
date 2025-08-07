import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function DatePicker({ value, onChange, label, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00');
      setViewMonth(date.getMonth());
      setViewYear(date.getFullYear());
      setDisplayDate(date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      // Check if click is outside the button and dropdown
      if (buttonRef.current && !buttonRef.current.contains(event.target) && 
          !event.target.closest('[data-datepicker-dropdown]')) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      if (isOpen) {
        updateDropdownPosition();
      }
    }

    function handleResize() {
      if (isOpen) {
        updateDropdownPosition();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + rect.width / 2 - 160 // Center the 320px wide dropdown
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleDateSelect = (date) => {
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!value) return false;
    const selectedDate = new Date(value + 'T00:00:00');
    return date.toDateString() === selectedDate.toDateString();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-12 h-12"></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const selected = isSelected(date);
      const today = isToday(date);

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(date)}
          className={`w-12 h-12 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-primary-100 dark:hover:bg-primary-900/30 ${
            selected
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : today
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map((dayName) => (
            <div key={dayName} className="w-12 h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      {/* Custom Date Display Button */}
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className={`relative w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
          className.includes('bg-transparent') 
            ? 'bg-transparent border-none hover:bg-gray-100/50 dark:hover:bg-gray-700/30 focus:outline-none' 
            : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
        }`}
      >
        <div className="flex items-center space-x-3">
          {!className.includes('bg-transparent') && (
            <CalendarDaysIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
          <span className={`font-medium ${
            className.includes('bg-transparent')
              ? className.includes('text-gray-600') 
                ? 'text-gray-600 dark:text-gray-400' 
                : 'text-gray-900 dark:text-white'
              : 'text-gray-900 dark:text-white'
          }`}>
            {displayDate || 'Select date'}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Portal-based Calendar Dropdown */}
      {createPortal(
        <div 
          className="fixed inset-0 z-[99999]"
          onClick={() => setIsOpen(false)}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          <div 
            className={`absolute transition-all duration-300 ease-out origin-top ${
              isOpen
                ? 'opacity-100 scale-y-100 scale-x-100 translate-y-0'
                : 'opacity-0 scale-y-0 scale-x-100 -translate-y-2 pointer-events-none'
            }`}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              zIndex: 99999
            }}
            onClick={(e) => e.stopPropagation()}
            data-datepicker-dropdown
          >
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200/50 dark:border-slate-600/50 rounded-xl shadow-xl min-w-[320px] w-max">
              {renderCalendar()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}