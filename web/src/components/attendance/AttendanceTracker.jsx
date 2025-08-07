import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Player } from '../../models/Player';
import { AttendanceRecord, ATTENDANCE_STATUS, EVENT_TYPES } from '../../models/Attendance';
import AttendanceRow from './AttendanceRow';

export default function AttendanceTracker() {
  const [players, setPlayers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState(EVENT_TYPES.PRACTICE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlayers = async () => {
    try {
      const playersCollection = collection(db, 'players');
      const snapshot = await getDocs(playersCollection);
      const playerList = snapshot.docs.map(doc => Player.fromFirestore(doc));
      // Sort by jersey number, then by name
      playerList.sort((a, b) => {
        if (a.jerseyNumber && b.jerseyNumber) {
          return a.jerseyNumber - b.jerseyNumber;
        }
        return a.name.localeCompare(b.name);
      });
      setPlayers(playerList);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = useCallback(async () => {
    const attendance = {};
    
    // Initialize all players with default attendance
    players.forEach(player => {
      attendance[player.id] = {
        status: ATTENDANCE_STATUS.PRESENT,
        note: ''
      };
    });

    // Load existing attendance records for this date
    try {
      for (const player of players) {
        const attendanceQuery = collection(db, 'players', player.id, 'attendance');
        const snapshot = await getDocs(attendanceQuery);
        
        // Find record for selected date
        const existingRecord = snapshot.docs.find(doc => {
          const data = doc.data();
          return data.date === selectedDate && data.eventType === eventType;
        });

        if (existingRecord) {
          const record = AttendanceRecord.fromFirestore(existingRecord);
          attendance[player.id] = {
            status: record.status,
            note: record.note
          };
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }

    setAttendanceData(attendance);
  }, [players, selectedDate, eventType]);

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (players.length > 0) {
      loadAttendanceData();
    }
  }, [players, selectedDate, loadAttendanceData]);

  const updateAttendance = (playerId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    
    try {
      const savePromises = Object.entries(attendanceData).map(async ([playerId, data]) => {
        const record = new AttendanceRecord({
          playerId,
          date: selectedDate,
          eventType,
          status: data.status,
          note: data.note
        });

        // Use date and eventType as compound key
        const recordId = `${selectedDate}_${eventType}`;
        const attendanceRef = doc(db, 'players', playerId, 'attendance', recordId);
        
        return setDoc(attendanceRef, record.toFirestore());
      });

      await Promise.all(savePromises);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      left_early: 0
    };

    Object.values(attendanceData).forEach(data => {
      if (Object.prototype.hasOwnProperty.call(counts, data.status)) {
        counts[data.status]++;
      }
    });

    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-gray-600 dark:text-gray-400">Loading players...</div>
          </div>
        </div>
      </div>
    );
  }

  const counts = getAttendanceCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Header */}
          <div className="p-8 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Attendance Tracker</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Track player attendance for practices and games</p>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={EVENT_TYPES.PRACTICE}>Practice</option>
                    <option value={EVENT_TYPES.GAME}>Game</option>
                  </select>
                </div>
              </div>

              <button
                onClick={saveAttendance}
                disabled={saving}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-2xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-4 rounded-2xl border border-primary-200/50 dark:border-primary-700/50">
                <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">{counts.present}</div>
                <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">Present</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-2xl border border-red-200/50 dark:border-red-700/50">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{counts.absent}</div>
                <div className="text-sm text-red-600 dark:text-red-400 font-medium">Absent</div>
              </div>
              <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 p-4 rounded-2xl border border-secondary-200/50 dark:border-secondary-700/50">
                <div className="text-2xl font-bold text-secondary-700 dark:text-secondary-300">{counts.late}</div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400 font-medium">Late</div>
              </div>
              <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 p-4 rounded-2xl border border-accent-200/50 dark:border-accent-700/50">
                <div className="text-2xl font-bold text-accent-600 dark:text-accent-300">{counts.left_early}</div>
                <div className="text-sm text-accent-600 dark:text-accent-400 font-medium">Left Early</div>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="divide-y divide-gray-200">
            {players.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No players found. Add players first to track attendance.
              </div>
            ) : (
              players.map((player) => (
                <AttendanceRow
                  key={player.id}
                  player={player}
                  attendance={attendanceData[player.id] || { status: ATTENDANCE_STATUS.PRESENT, note: '' }}
                  onUpdate={(field, value) => updateAttendance(player.id, field, value)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}