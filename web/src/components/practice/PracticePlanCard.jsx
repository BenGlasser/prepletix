import { 
  ClockIcon, 
  DocumentTextIcon, 
  DocumentDuplicateIcon, 
  TrashIcon,
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';

export default function PracticePlanCard({ plan, onEdit, onDuplicate, onDelete, compact = false }) {
  const totalDuration = plan.drills?.reduce((total, drill) => total + (drill.duration || 0), 0) || 0;
  const drillCount = plan.drills?.length || 0;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div 
      className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:shadow-primary-600/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
      onClick={onEdit}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg leading-tight">{plan.title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <CalendarDaysIcon className="w-4 h-4" />
              <span>{formatDate(plan.date)}</span>
            </div>
          </div>
          
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center transition-colors"
              title="Duplicate plan"
            >
              <DocumentDuplicateIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
              title="Delete plan"
            >
              <TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Plan Stats */}
        <div className="flex items-center space-x-6 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="font-medium">{plan.duration || totalDuration} min</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-6 h-6 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-3.5 h-3.5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <span className="font-medium">{drillCount} drill{drillCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Focus Areas */}
        {plan.focus && plan.focus.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {plan.focus.slice(0, compact ? 2 : 4).map((focus, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full border border-primary-200/50 dark:border-primary-800/50"
                >
                  {focus}
                </span>
              ))}
              {plan.focus.length > (compact ? 2 : 4) && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200/50 dark:border-gray-600/50">
                  +{plan.focus.length - (compact ? 2 : 4)} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Drill Preview */}
        {!compact && plan.drills && plan.drills.length > 0 && (
          <div className="border-t border-gray-100/50 dark:border-gray-700/50 pt-4 mt-4">
            <div className="space-y-3">
              {plan.drills.slice(0, 3).map((drill, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1 mr-3">{drill.drillName}</span>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{drill.duration}min</span>
                  </div>
                </div>
              ))}
              {plan.drills.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium pt-1">
                  +{plan.drills.length - 3} more drill{plan.drills.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {plan.notes && (
          <div className={`${!compact ? 'border-t border-gray-100/50 dark:border-gray-700/50 pt-4 mt-4' : 'mt-3'}`}>
            <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                "{plan.notes.length > 100 ? `${plan.notes.substring(0, 100)}...` : plan.notes}"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}