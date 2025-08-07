import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadPlayerPhoto, compressImage, deletePlayerPhoto } from '../../utils/photoUpload';
import PhotoSelectionModal from '../ui/PhotoSelectionModal';
import { CameraIcon } from '@heroicons/react/24/outline';

export default function PlayerCard({ player, onClick, onDelete, attendanceStats, onPhotoUpdate }) {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const handlePhotoClick = (e) => {
    e.stopPropagation();
    setShowPhotoModal(true);
  };

  const handlePhotoSelect = async (photoBlob) => {
    setUploadingPhoto(true);
    
    try {
      console.log('PlayerCard: Starting photo update process');
      console.log('PlayerCard: Current photo URL:', player.photoUrl);
      
      // Compress the image before uploading (works with both Blob and File)
      const compressedBlob = await compressImage(photoBlob);
      console.log('PlayerCard: Image compressed successfully');
      
      // Delete old photo if it exists - wait for completion
      if (player.photoUrl) {
        console.log('PlayerCard: Deleting old photo...');
        await deletePlayerPhoto(player.photoUrl);
        console.log('PlayerCard: Old photo deletion completed');
      }
      
      // Upload new photo
      console.log('PlayerCard: Uploading new photo...');
      const photoUrl = await uploadPlayerPhoto(compressedBlob, player.id);
      console.log('PlayerCard: New photo uploaded:', photoUrl);
      
      // Update player document with new photo URL
      await updateDoc(doc(db, 'players', player.id), {
        photoUrl,
        updatedAt: new Date()
      });
      console.log('PlayerCard: Player document updated');
      
      // Notify parent component about photo update
      if (onPhotoUpdate) {
        onPhotoUpdate(player.id, photoUrl);
      }
      
      console.log('PlayerCard: Photo update process completed');
    } catch (error) {
      console.error('PlayerCard: Error updating photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const primaryContact = player.contacts?.find(c => c.isPrimary) || player.contacts?.[0];

  return (
    <div 
      className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-sm p-6 hover:shadow-xl hover:shadow-primary-600/10 hover:border-primary-300 transition-all duration-300 cursor-pointer hover:scale-[1.02] group flex flex-col h-full min-h-[280px]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div 
              className="w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-400 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer relative group/photo"
              onClick={handlePhotoClick}
              title="Tap to take photo"
            >
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
              
              {/* Camera overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200">
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <CameraIcon className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
            {player.jerseyNumber && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-50 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 z-10">
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
            onClick={handleDelete}
            className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-900/30 flex items-center justify-center transition-all"
            title="Delete player"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content section - grows to fill available space */}
      <div className="flex-1">
        {primaryContact?.phone && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{primaryContact.phone}</span>
          </div>
        )}
        
        {/* Medical Alert indicators */}
        {(player.medicalInfo?.allergies?.length > 0 || player.medicalInfo?.conditions?.length > 0) && (
          <div className="flex space-x-2">
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
      
      {/* Attendance Statistics - Always at bottom */}
      {attendanceStats && (
        <div className="mt-auto pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          {/* Attendance Rate */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Attendance Rate</span>
              <span className={`text-xs font-bold ${
                attendanceStats.attendanceRate >= 90 ? 'text-green-600 dark:text-green-400' :
                attendanceStats.attendanceRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                attendanceStats.attendanceRate >= 50 ? 'text-orange-600 dark:text-orange-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {attendanceStats.attendanceRate}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  attendanceStats.attendanceRate >= 90 ? 'bg-green-500' :
                  attendanceStats.attendanceRate >= 75 ? 'bg-yellow-500' :
                  attendanceStats.attendanceRate >= 50 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${attendanceStats.attendanceRate}%` }}
              />
            </div>
          </div>
          
          {/* Today's Status */}
          {attendanceStats.todayStatus && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Today</span>
              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                attendanceStats.todayStatus === 'present' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'
                  : attendanceStats.todayStatus === 'absent'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/50'
                  : attendanceStats.todayStatus === 'late'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200/50 dark:border-yellow-800/50'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  attendanceStats.todayStatus === 'present' ? 'bg-green-500'
                  : attendanceStats.todayStatus === 'absent' ? 'bg-red-500'
                  : attendanceStats.todayStatus === 'late' ? 'bg-yellow-500'
                  : 'bg-orange-500'
                }`} />
                <span className="capitalize">
                  {attendanceStats.todayStatus === 'left_early' ? 'Left Early' : attendanceStats.todayStatus}
                </span>
              </span>
            </div>
          )}
          
          {/* Attendance Summary */}
          {attendanceStats.total > 0 && (
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="text-xs">
                <div className="font-bold text-green-600 dark:text-green-400">{attendanceStats.present}</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">Present</div>
              </div>
              <div className="text-xs">
                <div className="font-bold text-red-600 dark:text-red-400">{attendanceStats.absent}</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">Absent</div>
              </div>
              <div className="text-xs">
                <div className="font-bold text-yellow-600 dark:text-yellow-400">{attendanceStats.late}</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">Late</div>
              </div>
              <div className="text-xs">
                <div className="font-bold text-orange-600 dark:text-orange-400">{attendanceStats.leftEarly}</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">Left Early</div>
              </div>
            </div>
          )}
          
          {attendanceStats.total === 0 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">No attendance records yet</span>
            </div>
          )}
        </div>
      )}
      
      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelect={handlePhotoSelect}
        currentPhotoUrl={player.photoUrl}
        playerName={player.name}
      />
    </div>
  );
}