import { useEffect } from 'react';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';

export default function DrillDetailsModal({ drill, isOpen, onClose }) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const extractVideoId = (url) => {
    if (!url) return null;
    
    // YouTube URL patterns
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  };

  if (!isOpen || !drill) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {drill.name}
              </h2>
              <div className="flex space-x-2">
                <span className="inline-block px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full font-medium capitalize">
                  {drill.category?.replace('-', ' ')}
                </span>
                <span className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full font-medium capitalize">
                  {drill.skillLevel}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-700 dark:text-gray-300">Duration:</strong>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{drill.duration} minutes</span>
                </div>
                <div>
                  <strong className="text-gray-700 dark:text-gray-300">Age Group:</strong>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{drill.ageGroup || 'all'}</span>
                </div>
                <div>
                  <strong className="text-gray-700 dark:text-gray-300">Players:</strong>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {drill.minPlayers || '1'}-{drill.maxPlayers || '∞'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {drill.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {drill.description}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {drill.instructions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Instructions</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {drill.instructions}
                  </p>
                </div>
              )}

              {/* Notes */}
              {drill.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {drill.notes}
                  </p>
                </div>
              )}

              {/* Video */}
              {drill.videoUrl && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Video Demonstration</h3>
                  {(() => {
                    const videoId = extractVideoId(drill.videoUrl);
                    if (videoId) {
                      return (
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={drill.name}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          ></iframe>
                        </div>
                      );
                    } else {
                      return (
                        <a
                          href={drill.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
                        >
                          <PlayIcon className="w-4 h-4 mr-2" />
                          View Video
                        </a>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Equipment */}
              {drill.equipmentNeeded && drill.equipmentNeeded.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Equipment Needed</h3>
                  <ul className="text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                    {drill.equipmentNeeded.map((equipment, index) => (
                      <li key={index}>{equipment}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}