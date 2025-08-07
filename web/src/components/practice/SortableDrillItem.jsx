import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function SortableDrillItem({ id, drill, index, isActive, onUpdate, onRemove, onShowDetails }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-move relative ${
        isDragging
          ? 'opacity-50 scale-105 rotate-2 shadow-xl z-10'
          : 'hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all duration-200 ease-out'
      } ${
        drill.completed ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Completion Checkbox */}
          <div className="flex items-start pt-1">
            <button
              type="button"
              onClick={() => onUpdate('completed', !drill.completed)}
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                drill.completed
                  ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 bg-white dark:bg-gray-800'
              }`}
              title={drill.completed ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {drill.completed && <CheckIcon className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex-1">
            <h4 
              className={`font-medium mb-3 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 ${drill.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails && onShowDetails(drill);
              }}
              title="Click to view drill details"
            >
              {drill.drillName}
            </h4>
            <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Duration (min)</label>
              <input
                type="number"
                value={drill.duration}
                onChange={(e) => onUpdate('duration', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                min="1"
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
              <textarea
                value={drill.notes}
                onChange={(e) => {
                  onUpdate('notes', e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm resize-none min-h-[2.5rem] max-h-32 overflow-y-auto"
                placeholder="Optional notes..."
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>
        </div>
        </div>
        
        <div className="flex items-start ml-4">
          <button
            type="button"
            onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
            title="Remove drill"
          >
            <TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}