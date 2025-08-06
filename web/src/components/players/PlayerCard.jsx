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
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              {player.photoUrl ? (
                <img 
                  src={player.photoUrl} 
                  alt={player.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary-600 font-semibold text-lg">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{player.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">#{player.jerseyNumber}</p>
            </div>
          </div>
          
          {primaryContact && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p>{primaryContact.name}</p>
              <p>{primaryContact.phone}</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={handleEdit}
            className="text-gray-400 hover:text-primary-600 p-1"
            title="Edit player"
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete player"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Alert indicators */}
      <div className="flex space-x-2 mt-3">
        {player.medicalInfo?.allergies?.length > 0 && (
          <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
            Allergies
          </span>
        )}
        {player.medicalInfo?.conditions?.length > 0 && (
          <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
            Medical
          </span>
        )}
      </div>
    </div>
  );
}