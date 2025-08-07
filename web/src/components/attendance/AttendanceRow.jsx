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
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Player Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
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
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-gray-900 dark:text-white">{player.name}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">#{player.jerseyNumber}</span>
                
                {/* Medical alerts */}
                {player.medicalInfo?.allergies?.length > 0 && (
                  <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded" title="Has allergies">
                    🚨
                  </span>
                )}
                {player.medicalInfo?.conditions?.length > 0 && (
                  <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded" title="Medical conditions">
                    ⚕️
                  </span>
                )}
              </div>
              
              {primaryContact && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {primaryContact.name} • {primaryContact.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => onUpdate('status', status.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
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
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Note..."
              value={attendance.note}
              onChange={(e) => onUpdate('note', e.target.value)}
              onKeyDown={handleNoteKeyDown}
              onBlur={handleNoteBlur}
              className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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