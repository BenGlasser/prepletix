import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AttendanceRecord } from '../../models/Attendance';
import { uploadPlayerPhoto, compressImage, deletePlayerPhoto } from '../../utils/photoUpload';
import PhotoSelectionModal from '../ui/PhotoSelectionModal';
import { PhoneIcon, HeartIcon, DocumentTextIcon, CalendarDaysIcon, CameraIcon } from '@heroicons/react/24/outline';

export default function PlayerProfile({ player, onClose, onEdit, onDelete }) {
  const [openSections, setOpenSections] = useState(new Set(['contact'])); // Start with contact info open
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ category: 'general', content: '' });
  const [playerNotes, setPlayerNotes] = useState(player.notes || []);
  const accordionRefs = useRef({});
  const [editingFields, setEditingFields] = useState({});
  const [editValues, setEditValues] = useState({
    name: player.name,
    jerseyNumber: player.jerseyNumber,
    ...player.contacts?.reduce((acc, contact, index) => {
      acc[`contact_${index}_name`] = contact.name;
      acc[`contact_${index}_phone`] = contact.phone;
      acc[`contact_${index}_email`] = contact.email;
      return acc;
    }, {})
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(player.photoUrl);

  const loadAttendanceHistory = useCallback(async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'players', player.id, 'attendance'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(attendanceQuery);
      const records = snapshot.docs.map(doc => AttendanceRecord.fromFirestore(doc));
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoadingAttendance(false);
    }
  }, [player.id]);

  useEffect(() => {
    if (openSections.has('attendance')) {
      loadAttendanceHistory();
    }
  }, [openSections, player.id, loadAttendanceHistory]);

  const sections = [
    { id: 'contact', label: 'Contact Info', icon: PhoneIcon },
    { id: 'medical', label: 'Medical Info', icon: HeartIcon },
    { id: 'notes', label: 'Notes', icon: DocumentTextIcon },
    { id: 'attendance', label: 'Attendance', icon: CalendarDaysIcon }
  ];

  const toggleSection = (sectionId) => {
    const newOpenSections = new Set(openSections);
    const isOpening = !newOpenSections.has(sectionId);
    
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);

    // If opening an accordion, scroll it into view after animation
    if (isOpening) {
      setTimeout(() => {
        const accordionElement = accordionRefs.current[sectionId];
        if (accordionElement) {
          const rect = accordionElement.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          
          // Check if the accordion extends below the viewport
          if (rect.bottom > windowHeight) {
            // Calculate how much to scroll to bring the bottom into view
            const scrollAmount = rect.bottom - windowHeight + 100; // Add 100px buffer
            window.scrollBy({
              top: scrollAmount,
              behavior: 'smooth'
            });
          }
        }
      }, 300); // Wait for accordion animation to complete
    }
  };

  const getAttendanceStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, rate };
  };

  const handlePhotoClick = () => {
    setShowPhotoModal(true);
  };

  const handlePhotoSelect = async (photoBlob) => {
    setUploadingPhoto(true);
    
    try {
      console.log('PlayerProfile: Starting photo update process');
      console.log('PlayerProfile: Current photo URL:', currentPhotoUrl);
      
      // Compress the image before uploading (works with both Blob and File)
      const compressedBlob = await compressImage(photoBlob);
      console.log('PlayerProfile: Image compressed successfully');
      
      // Delete old photo if it exists - wait for completion
      if (currentPhotoUrl) {
        console.log('PlayerProfile: Deleting old photo...');
        await deletePlayerPhoto(currentPhotoUrl);
        console.log('PlayerProfile: Old photo deletion completed');
      }
      
      // Upload new photo
      console.log('PlayerProfile: Uploading new photo...');
      const photoUrl = await uploadPlayerPhoto(compressedBlob, player.id);
      console.log('PlayerProfile: New photo uploaded:', photoUrl);
      
      // Update player document with new photo URL
      await updateDoc(doc(db, 'players', player.id), {
        photoUrl,
        updatedAt: new Date()
      });
      console.log('PlayerProfile: Player document updated');
      
      // Update local state
      setCurrentPhotoUrl(photoUrl);
      console.log('PlayerProfile: Photo update process completed');
    } catch (error) {
      console.error('PlayerProfile: Error updating photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.content.trim()) return;
    
    try {
      const noteData = {
        id: Date.now().toString(), // Simple ID for client-side identification
        category: newNote.category,
        content: newNote.content.trim(),
        createdAt: new Date().toISOString(),
        playerId: player.id
      };

      // Update only the player document's notes array
      const updatedNotes = [...playerNotes, noteData];
      await updateDoc(doc(db, 'players', player.id), {
        notes: updatedNotes
      });

      // Update local state immediately to show the new note
      setPlayerNotes(updatedNotes);
      
      // Reset form
      setNewNote({ category: 'general', content: '' });
      setIsAddingNote(false);
    } catch (error) {
      console.error('Error saving note:', error);
      // Show more specific error feedback
      if (error.code === 'permission-denied') {
        alert('Permission denied. You may not have access to edit this player.');
      } else {
        alert('Failed to save note. Please try again.');
      }
    }
  };

  const handleCancelNote = () => {
    setNewNote({ category: 'general', content: '' });
    setIsAddingNote(false);
  };

  const handleFieldEdit = (fieldName) => {
    setEditingFields({ ...editingFields, [fieldName]: true });
  };

  const handleFieldSave = async (fieldName) => {
    const newValue = editValues[fieldName];
    
    // Handle contact fields
    if (fieldName.startsWith('contact_')) {
      const [, contactIndex, contactField] = fieldName.split('_');
      const index = parseInt(contactIndex);
      const currentValue = player.contacts?.[index]?.[contactField];
      
      if (newValue === currentValue) {
        setEditingFields({ ...editingFields, [fieldName]: false });
        return;
      }

      try {
        const updatedContacts = [...(player.contacts || [])];
        if (updatedContacts[index]) {
          updatedContacts[index][contactField] = newValue;
          
          await updateDoc(doc(db, 'players', player.id), {
            contacts: updatedContacts
          });

          player.contacts = updatedContacts;
        }
        
        setEditingFields({ ...editingFields, [fieldName]: false });
      } catch (error) {
        console.error(`Error saving ${fieldName}:`, error);
        setEditValues({ ...editValues, [fieldName]: currentValue });
        if (error.code === 'permission-denied') {
          alert('Permission denied. You may not have access to edit this player.');
        } else {
          alert(`Failed to save contact information. Please try again.`);
        }
        // Restore original value on error
        setEditValues({ ...editValues, [fieldName]: currentValue });
      }
      return;
    }

    // Handle regular fields
    if (newValue === player[fieldName]) {
      setEditingFields({ ...editingFields, [fieldName]: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'players', player.id), {
        [fieldName]: newValue
      });

      player[fieldName] = newValue;
      setEditingFields({ ...editingFields, [fieldName]: false });
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
      setEditValues({ ...editValues, [fieldName]: player[fieldName] });
      if (error.code === 'permission-denied') {
        alert('Permission denied. You may not have access to edit this player.');
      } else {
        alert(`Failed to save ${fieldName}. Please try again.`);
      }
    }
  };

  const handleFieldCancel = (fieldName) => {
    setEditValues({ ...editValues, [fieldName]: player[fieldName] });
    setEditingFields({ ...editingFields, [fieldName]: false });
  };

  const handleFieldKeyDown = (e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFieldSave(fieldName);
    } else if (e.key === 'Escape') {
      handleFieldCancel(fieldName);
    }
  };

  const EditableField = ({ fieldName, value, className, type = 'text', placeholder }) => {
    const isEditing = editingFields[fieldName];

    if (isEditing) {
      return (
        <input
          type={type}
          value={editValues[fieldName] || ''}
          onChange={(e) => setEditValues({ ...editValues, [fieldName]: e.target.value })}
          onBlur={() => handleFieldSave(fieldName)}
          onKeyDown={(e) => handleFieldKeyDown(e, fieldName)}
          className={`${className} bg-transparent border-b-2 border-primary-400 focus:border-primary-600 outline-none transition-colors duration-200`}
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    return (
      <span
        onClick={() => handleFieldEdit(fieldName)}
        className={`${className} cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-1 rounded transition-colors duration-200`}
        title="Click to edit"
      >
{value || placeholder}
      </span>
    );
  };

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'attendance':
        return (
          <div className="pt-3">
            {loadingAttendance ? (
              <p className="text-gray-500 dark:text-gray-400">Loading attendance...</p>
            ) : (
              <>
                {/* Attendance Stats */}
                {attendanceRecords.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Attendance Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{getAttendanceStats().rate}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{getAttendanceStats().present}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{getAttendanceStats().total}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Records */}
                {attendanceRecords.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{record.date}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{record.eventType}</p>
                          {record.note && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{record.note}"</p>
                          )}
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No attendance records yet</p>
                )}
              </>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="pt-3 space-y-3">
            {player.contacts?.length > 0 ? (
              player.contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <EditableField
                      fieldName={`contact_${index}_name`}
                      value={editValues[`contact_${index}_name`]}
                      className="font-medium text-gray-900 dark:text-white"
                      placeholder="Contact Name"
                    />
                    {contact.isPrimary && (
                      <span className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-lg">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">{contact.relationship}</p>
                  <div className="space-y-1">
                    <EditableField
                      fieldName={`contact_${index}_phone`}
                      value={editValues[`contact_${index}_phone`]}
                      className="text-sm text-gray-900 dark:text-gray-300 block"
                      type="tel"
                      placeholder="Phone number"
                    />
                    <EditableField
                      fieldName={`contact_${index}_email`}
                      value={editValues[`contact_${index}_email`]}
                      className="text-sm text-gray-900 dark:text-gray-300 block"
                      type="email"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No contact information available</p>
            )}
          </div>
        );

      case 'medical':
        return (
          <div className="pt-3 space-y-4">
            {/* Allergies */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Allergies</h4>
              {player.medicalInfo?.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {player.medicalInfo.allergies.map((allergy, index) => (
                    <span key={index} className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No known allergies</p>
              )}
            </div>

            {/* Medications */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Medications</h4>
              {player.medicalInfo?.medications?.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {player.medicalInfo.medications.map((medication, index) => (
                    <li key={index} className="text-gray-700 dark:text-gray-300">{medication}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No medications</p>
              )}
            </div>

            {/* Medical Notes */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Medical Notes</h4>
              {player.medicalInfo?.notes ? (
                <p className="text-gray-700 dark:text-gray-300">{player.medicalInfo.notes}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No medical notes</p>
              )}
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="pt-3">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Notes</h4>
              <button
                onClick={() => setIsAddingNote(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Note</span>
              </button>
            </div>

            {/* Add Note Form */}
            {isAddingNote && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newNote.category}
                      onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="general">General</option>
                      <option value="medical">Medical</option>
                      <option value="behavior">Behavior</option>
                      <option value="skill">Skill</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Note
                    </label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Add your note here..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNote}
                      disabled={!newNote.content.trim()}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
Save Note
                    </button>
                    <button
                      onClick={handleCancelNote}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Notes */}
            {playerNotes?.length > 0 ? (
              <div className="space-y-3">
                {playerNotes.map((note, index) => (
                  <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-block px-3 py-1 text-xs rounded-lg capitalize font-medium ${
                        note.category === 'medical' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                        note.category === 'behavior' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        note.category === 'skill' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        note.category === 'performance' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {note.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : !isAddingNote ? (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400 mb-3">No notes yet</p>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                >
                  Add your first note
                </button>
              </div>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-4xl mx-auto min-h-full">
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-6">
              <div 
                className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer relative group/photo"
                onClick={handlePhotoClick}
                title="Tap to take photo"
              >
                {currentPhotoUrl ? (
                  <img 
                    src={currentPhotoUrl} 
                    alt={player.name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-3xl">
                    {player.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
                
                {/* Camera overlay */}
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200">
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <CameraIcon className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <div>
                <EditableField
                  fieldName="name"
                  value={editValues.name}
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2 block"
                  placeholder="Player Name"
                />
                <div className="flex items-center space-x-1">
                  <span className="text-xl text-primary-600 dark:text-primary-400 font-semibold">#</span>
                  <EditableField
                    fieldName="jerseyNumber"
                    value={editValues.jerseyNumber}
                    className="text-xl text-primary-600 dark:text-primary-400 font-semibold"
                    type="number"
                    placeholder="Jersey #"
                  />
                </div>
                {/* Alert badges */}
                <div className="flex space-x-2 mt-3">
                  {player.medicalInfo?.allergies?.length > 0 && (
                    <span className="inline-block px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full font-medium">
                      Has Allergies
                    </span>
                  )}
                  {player.medicalInfo?.conditions?.length > 0 && (
                    <span className="inline-block px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full font-medium">
                      Medical Conditions
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onEdit}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-600/25 font-medium"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-600/25 font-medium"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-all duration-200 shadow-lg font-medium"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-3">
          {sections.map((section) => (
            <div 
              key={section.id} 
              ref={el => accordionRefs.current[section.id] = el}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <section.icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.label}</h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-500 ease-in-out ${
                    openSections.has(section.id) ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className={`transition-all duration-500 ease-in-out ${
                openSections.has(section.id) 
                  ? 'max-h-[2000px] opacity-100' 
                  : 'max-h-0 opacity-0'
              } overflow-hidden`}>
                <div className="px-4 pb-4 border-t border-gray-100/50 dark:border-gray-700/50">
                  {renderSectionContent(section.id)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelect={handlePhotoSelect}
        currentPhotoUrl={currentPhotoUrl}
        playerName={player.name}
      />
    </div>
  );
}