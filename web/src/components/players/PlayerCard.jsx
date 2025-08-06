export default function PlayerCard({ player, onClick, onEdit, onDelete }) {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const primaryContact = player.contacts?.find(c => c.isPrimary) || player.contacts?.[0];

  return (
    <div 
      className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl hover:shadow-primary-600/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-400 rounded-2xl flex items-center justify-center shadow-lg">
              {player.photoUrl ? (
                <img 
                  src={player.photoUrl} 
                  alt={player.name}
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            {player.jerseyNumber && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-50 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                  {player.jerseyNumber}
                </span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{player.name}</h3>
            {primaryContact && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {primaryContact.name}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-primary-100 dark:hover:bg-primary-900/30 flex items-center justify-center transition-colors"
            title="Edit player"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
            title="Delete player"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {primaryContact?.phone && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>{primaryContact.phone}</span>
        </div>
      )}
      
      {/* Alert indicators */}
      {(player.medicalInfo?.allergies?.length > 0 || player.medicalInfo?.conditions?.length > 0) && (
        <div className="flex space-x-2 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          {player.medicalInfo?.allergies?.length > 0 && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full border border-red-200/50 dark:border-red-800/50">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Allergies</span>
            </span>
          )}
          {player.medicalInfo?.conditions?.length > 0 && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full border border-yellow-200/50 dark:border-yellow-800/50">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Medical</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}