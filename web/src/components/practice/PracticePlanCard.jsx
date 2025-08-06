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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{plan.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(plan.date)}</p>
          </div>
          
          <div className="flex space-x-1">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-primary-600 p-1"
              title="Edit plan"
            >
              ✏️
            </button>
            <button
              onClick={onDuplicate}
              className="text-gray-400 hover:text-blue-600 p-1"
              title="Duplicate plan"
            >
              📋
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 p-1"
              title="Delete plan"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Plan Stats */}
        <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <span>⏱️</span>
            <span>{plan.duration || totalDuration} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>📝</span>
            <span>{drillCount} drills</span>
          </div>
        </div>

        {/* Focus Areas */}
        {plan.focus && plan.focus.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {plan.focus.slice(0, compact ? 2 : 4).map((focus, index) => (
                <span 
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
                >
                  {focus}
                </span>
              ))}
              {plan.focus.length > (compact ? 2 : 4) && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                  +{plan.focus.length - (compact ? 2 : 4)} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Drill Preview */}
        {!compact && plan.drills && plan.drills.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="space-y-2">
              {plan.drills.slice(0, 3).map((drill, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{drill.drillName}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{drill.duration}min</span>
                </div>
              ))}
              {plan.drills.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{plan.drills.length - 3} more drills
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {plan.notes && (
          <div className={`${!compact ? 'border-t border-gray-100 pt-3' : 'mt-2'}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {plan.notes.length > 100 ? `${plan.notes.substring(0, 100)}...` : plan.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}