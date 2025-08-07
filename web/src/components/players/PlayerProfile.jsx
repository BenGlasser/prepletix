import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { AttendanceRecord } from '../../models/Attendance';

export default function PlayerProfile({ player, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('contact');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceHistory();
    }
  }, [activeTab, player.id, loadAttendanceHistory]);

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

  const tabs = [
    { id: 'contact', label: 'Contact Info', icon: '📞' },
    { id: 'medical', label: 'Medical Info', icon: '🏥' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'notes', label: 'Notes', icon: '📝' }
  ];

  const getAttendanceStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, rate };
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                {player.photoUrl ? (
                  <img 
                    src={player.photoUrl} 
                    alt={player.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary-600 font-bold text-2xl">
                    {player.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{player.name}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">#{player.jerseyNumber}</p>
                {/* Alert badges */}
                <div className="flex space-x-2 mt-2">
                  {player.medicalInfo?.allergies?.length > 0 && (
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      Has Allergies
                    </span>
                  )}
                  {player.medicalInfo?.conditions?.length > 0 && (
                    <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      Medical Conditions
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={onEdit}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Contact Info Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                {player.contacts?.length > 0 ? (
                  player.contacts.map((contact, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{contact.name}</h3>
                        {contact.isPrimary && (
                          <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{contact.relationship}</p>
                      <p className="text-sm text-gray-900 dark:text-gray-300">{contact.phone}</p>
                      <p className="text-sm text-gray-900 dark:text-gray-300">{contact.email}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No contact information available</p>
                )}
              </div>
            )}

            {/* Medical Info Tab */}
            {activeTab === 'medical' && (
              <div className="space-y-6">
                {/* Allergies */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Allergies</h3>
                  {player.medicalInfo?.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {player.medicalInfo.allergies.map((allergy, index) => (
                        <span key={index} className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No known allergies</p>
                  )}
                </div>

                {/* Medications */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Medications</h3>
                  {player.medicalInfo?.medications?.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {player.medicalInfo.medications.map((medication, index) => (
                        <li key={index} className="text-gray-700">{medication}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No medications</p>
                  )}
                </div>

                {/* Medical Notes */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Medical Notes</h3>
                  {player.medicalInfo?.notes ? (
                    <p className="text-gray-700">{player.medicalInfo.notes}</p>
                  ) : (
                    <p className="text-gray-500">No medical notes</p>
                  )}
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div>
                {loadingAttendance ? (
                  <p className="text-gray-500">Loading attendance...</p>
                ) : (
                  <>
                    {/* Attendance Stats */}
                    {attendanceRecords.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Attendance Summary</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary-600">{getAttendanceStats().rate}%</div>
                            <div className="text-sm text-gray-600">Attendance Rate</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{getAttendanceStats().present}</div>
                            <div className="text-sm text-gray-600">Present</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-600">{getAttendanceStats().total}</div>
                            <div className="text-sm text-gray-600">Total Events</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attendance Records */}
                    {attendanceRecords.length > 0 ? (
                      <div className="space-y-3">
                        {attendanceRecords.map((record) => (
                          <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{record.date}</p>
                              <p className="text-sm text-gray-600 capitalize">{record.eventType}</p>
                              {record.note && (
                                <p className="text-sm text-gray-600 italic">"{record.note}"</p>
                              )}
                            </div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' :
                              record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No attendance records yet</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div>
                {player.notes?.length > 0 ? (
                  <div className="space-y-4">
                    {player.notes.map((note, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded capitalize ${
                            note.category === 'medical' ? 'bg-red-100 text-red-800' :
                            note.category === 'behavior' ? 'bg-yellow-100 text-yellow-800' :
                            note.category === 'skill' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-50 text-gray-800'
                          }`}>
                            {note.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No notes yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}