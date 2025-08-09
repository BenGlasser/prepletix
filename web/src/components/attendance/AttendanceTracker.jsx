import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useTeam } from "../../contexts/TeamContext";
import { Player } from "../../models/Player";
import {
  AttendanceRecord,
  ATTENDANCE_STATUS,
  EVENT_TYPES,
} from "../../models/Attendance";
import AttendanceRow from "./AttendanceRow";
import DatePicker from "../ui/DatePicker";
import Dropdown from "../ui/Dropdown";
import {
  CalendarDaysIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function AttendanceTracker() {
  const { currentTeam, loading: teamLoading } = useTeam();
  const [players, setPlayers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [eventType, setEventType] = useState(EVENT_TYPES.PRACTICE);
  const [loading, setLoading] = useState(true);

  const loadPlayers = useCallback(async () => {
    if (!currentTeam) return;

    try {
      // Query players filtered by current team
      const playersQuery = query(
        collection(db, "players"),
        where("teamId", "==", currentTeam.id)
      );
      const snapshot = await getDocs(playersQuery);
      const playerList = snapshot.docs.map((doc) => Player.fromFirestore(doc));
      // Sort by jersey number, then by name
      playerList.sort((a, b) => {
        if (a.jerseyNumber && b.jerseyNumber) {
          return a.jerseyNumber - b.jerseyNumber;
        }
        return a.name.localeCompare(b.name);
      });
      setPlayers(playerList);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  const loadAttendanceData = useCallback(async () => {
    const attendance = {};

    // Initialize all players with no default status (null means no record)
    players.forEach((player) => {
      attendance[player.id] = {
        status: null,
        note: "",
      };
    });

    // Load existing attendance records for this date
    try {
      for (const player of players) {
        const attendanceQuery = collection(
          db,
          "players",
          player.id,
          "attendance"
        );
        const snapshot = await getDocs(attendanceQuery);

        // Find record for selected date
        const existingRecord = snapshot.docs.find((doc) => {
          const data = doc.data();
          return data.date === selectedDate && data.eventType === eventType;
        });

        if (existingRecord) {
          const record = AttendanceRecord.fromFirestore(existingRecord);
          attendance[player.id] = {
            status: record.status,
            note: record.note || "",
          };
        }
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
    }

    setAttendanceData(attendance);
  }, [players, selectedDate, eventType]);

  useEffect(() => {
    if (currentTeam && !teamLoading) {
      loadPlayers();
    }
  }, [currentTeam, teamLoading, loadPlayers]);

  useEffect(() => {
    if (players.length > 0) {
      loadAttendanceData();
    }
  }, [players, selectedDate, loadAttendanceData]);

  const updateAttendance = (playerId, field, value) => {
    // Update local state immediately
    setAttendanceData((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));

    // Auto-save status changes immediately
    if (field === "status") {
      savePlayerAttendance(playerId, {
        ...attendanceData[playerId],
        [field]: value,
      });
    }
  };

  const savePlayerAttendance = async (playerId, data) => {
    try {
      const record = new AttendanceRecord({
        playerId,
        date: selectedDate,
        eventType,
        status: data.status,
        note: data.note || "",
      });

      const docRef = doc(
        db,
        "players",
        playerId,
        "attendance",
        `${selectedDate}-${eventType}`
      );
      await setDoc(docRef, record.toFirestore());
    } catch (error) {
      console.error("Error saving attendance:", error);
      // Could show a toast notification here
    }
  };

  const saveNote = async (playerId) => {
    const data = attendanceData[playerId];
    if (data.status) {
      // Only save if player has a status
      await savePlayerAttendance(playerId, data);
    }
  };

  const getAttendanceCounts = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      left_early: 0,
    };

    Object.values(attendanceData).forEach((data) => {
      if (
        data.status &&
        Object.prototype.hasOwnProperty.call(counts, data.status)
      ) {
        counts[data.status]++;
      }
    });

    return counts;
  };

  if (teamLoading || loading) {
    return (
      <div className="h-full">
        <div className="flex justify-center items-center h-full">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <div className="text-gray-600 dark:text-gray-400">
                Loading players...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="h-full">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-2">
              No team selected
            </div>
            <div className="text-sm text-gray-400">
              Please select or create a team to track attendance.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const counts = getAttendanceCounts();

  return (
    <div className="h-full">
      <div className="px-3 sm:px-6 py-4 sm:py-8 min-h-full">
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Attendance Tracker
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Track player attendance for practices and games
            </p>

            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-center sm:justify-start">
                <div className="flex-1 sm:flex-none sm:min-w-[240px]">
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    label="Date"
                    className="w-full"
                  />
                </div>

                <div className="flex-1 sm:flex-none sm:min-w-[200px]">
                  <Dropdown
                    value={eventType}
                    onChange={setEventType}
                    options={[
                      {
                        value: EVENT_TYPES.PRACTICE,
                        label: "Practice",
                        description: "Regular team practice",
                        icon: DocumentTextIcon,
                      },
                      {
                        value: EVENT_TYPES.GAME,
                        label: "Game",
                        description: "Competitive match",
                        icon: CalendarDaysIcon,
                      },
                    ]}
                    label="Event Type"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-primary-200/50 dark:border-primary-700/50">
                <div className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {counts.present}
                </div>
                <div className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 font-medium">
                  Present
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-200/50 dark:border-red-700/50">
                <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">
                  {counts.absent}
                </div>
                <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">
                  Absent
                </div>
              </div>
              <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-secondary-200/50 dark:border-secondary-700/50">
                <div className="text-xl sm:text-2xl font-bold text-secondary-700 dark:text-secondary-300">
                  {counts.late}
                </div>
                <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400 font-medium">
                  Late
                </div>
              </div>
              <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-accent-200/50 dark:border-accent-700/50">
                <div className="text-xl sm:text-2xl font-bold text-accent-600 dark:text-accent-300">
                  {counts.left_early}
                </div>
                <div className="text-xs sm:text-sm text-accent-600 dark:text-accent-400 font-medium">
                  Left Early
                </div>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {players.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm sm:text-base">No players found. Add players first to track attendance.</p>
              </div>
            ) : (
              players.map((player) => (
                <AttendanceRow
                  key={player.id}
                  player={player}
                  attendance={
                    attendanceData[player.id] || { status: null, note: "" }
                  }
                  onUpdate={(field, value) =>
                    updateAttendance(player.id, field, value)
                  }
                  onNoteSave={saveNote}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
