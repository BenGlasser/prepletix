import { ATTENDANCE_STATUS } from '../../models/Attendance';

const statusOptions = [
  { value: ATTENDANCE_STATUS.PRESENT, label: 'Present', color: 'text-green-600' },
  { value: ATTENDANCE_STATUS.ABSENT, label: 'Absent', color: 'text-red-600' },
  { value: ATTENDANCE_STATUS.LATE, label: 'Late', color: 'text-yellow-600' },
  { value: ATTENDANCE_STATUS.LEFT_EARLY, label: 'Left Early', color: 'text-orange-600' },
];

export default function AttendanceRow({ player, attendance, onUpdate, onNoteSave }) {
  const primaryContact = player.contacts?.find(c => c.isPrimary) || player.contacts?.[0];
  
  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNoteSave(player.id);
    }
  };

  const handleNoteBlur = () => {
    onNoteSave(player.id);
  };

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Player Info */}
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            {player.photoUrl ? (
              <img 
                src={player.photoUrl} 
                alt={player.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-primary-600 font-semibold text-sm">
                {player.name.split(' ').map(n => n[0]).join('')}
              </span>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{player.name}</h3>
                {player.jerseyNumber && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">#{player.jerseyNumber}</span>
                )}
              </div>
              
              {/* Medical alerts */}
              <div className="flex items-center space-x-1 mt-1 sm:mt-0">
                {player.medicalInfo?.allergies?.length > 0 && (
                  <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded flex-shrink-0" title="Has allergies">
                    🚨
                  </span>
                )}
                {player.medicalInfo?.conditions?.length > 0 && (
                  <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded flex-shrink-0" title="Medical conditions">
                    ⚕️
                  </span>
                )}
              </div>
            </div>
            
            {primaryContact && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {primaryContact.name} • {primaryContact.phone}
              </p>
            )}
          </div>
        </div>

        {/* Status Selection - Mobile: stacked, Desktop: inline */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Status Buttons */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => onUpdate('status', status.value)}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors flex-shrink-0 ${
                  attendance.status === status.value
                    ? `bg-white dark:bg-slate-800 border-2 ${status.color} border-current`
                    : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Notes Input */}
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Add note..."
              value={attendance.note}
              onChange={(e) => onUpdate('note', e.target.value)}
              onKeyDown={handleNoteKeyDown}
              onBlur={handleNoteBlur}
              className="w-full sm:w-32 lg:w-40 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>
      
      {/* Status indicator line */}
      <div className={`mt-2 h-1 rounded-full ${
        attendance.status === ATTENDANCE_STATUS.PRESENT ? 'bg-green-200' :
        attendance.status === ATTENDANCE_STATUS.ABSENT ? 'bg-red-200' :
        attendance.status === ATTENDANCE_STATUS.LATE ? 'bg-yellow-200' :
        attendance.status === ATTENDANCE_STATUS.LEFT_EARLY ? 'bg-orange-200' :
        'bg-gray-100 dark:bg-gray-600' // No status selected
      }`} />
    </div>
  );
}