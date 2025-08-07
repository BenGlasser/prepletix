import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTeam } from '../../contexts/TeamContext';
import { Player } from '../../models/Player';
import { AttendanceRecord, EVENT_TYPES } from '../../models/Attendance';
import PlayerCard from './PlayerCard';
import PlayerForm from './PlayerForm';
import PlayerProfile from './PlayerProfile';

export default function PlayerRoster() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentTeam, loading: teamLoading } = useTeam();
  const isEditMode = window.location.pathname.endsWith('/edit');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({});

  const loadAttendanceStats = useCallback(async (playerList) => {
    const stats = {};

    try {
      for (const player of playerList) {
        const attendanceQuery = collection(db, 'players', player.id, 'attendance');
        const snapshot = await getDocs(attendanceQuery);
        const records = snapshot.docs.map(doc => AttendanceRecord.fromFirestore(doc));
        
        // Calculate attendance statistics with weighted values
        const totalRecords = records.length;
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;
        const lateCount = records.filter(r => r.status === 'late').length;
        const leftEarlyCount = records.filter(r => r.status === 'left_early').length;
        
        // Calculate weighted attendance rate
        // Present = 1, Absent = 0, Late = 0.5, Left Early = 0.5
        const weightedScore = (presentCount * 1) + (absentCount * 0) + (lateCount * 0.5) + (leftEarlyCount * 0.5);
        const attendanceRate = totalRecords > 0 ? Math.round((weightedScore / totalRecords) * 100) : 0;
        
        // Get today's status
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = records.find(r => r.date === today);
        
        stats[player.id] = {
          total: totalRecords,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leftEarly: leftEarlyCount,
          attendanceRate,
          todayStatus: todayRecord?.status || null,
          lastEventDate: records.length > 0 ? records.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null
        };
      }
      setAttendanceStats(stats);
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    }
  }, []);

  useEffect(() => {
    if (currentTeam && !teamLoading) {
      loadPlayers();
    }
  }, [currentTeam, teamLoading]);

  useEffect(() => {
    if (players.length > 0) {
      loadAttendanceStats(players);
    }
  }, [players, loadAttendanceStats]);

  useEffect(() => {
    if (playerId && players.length > 0) {
      const player = players.find(p => p.id === playerId);
      if (player) {
        if (isEditMode) {
          setEditingPlayer(player);
          setShowForm(true);
          setSelectedPlayer(null);
        } else {
          setSelectedPlayer(player);
          setShowForm(false);
          setEditingPlayer(null);
        }
      } else {
        // If player not found in current list, try loading from Firestore
        loadPlayerById(playerId);
      }
    } else if (!playerId) {
      setSelectedPlayer(null);
      setShowForm(false);
      setEditingPlayer(null);
    }
  }, [playerId, players, isEditMode]);

  const loadPlayers = async () => {
    if (!currentTeam) return;
    
    try {
      // Query players filtered by current team
      const playersQuery = query(
        collection(db, 'players'),
        where('teamId', '==', currentTeam.id)
      );
      const snapshot = await getDocs(playersQuery);
      const playerList = snapshot.docs.map(doc => Player.fromFirestore(doc));
      setPlayers(playerList);
      // Load attendance statistics after players are loaded
      if (playerList.length > 0) {
        await loadAttendanceStats(playerList);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerById = async (id) => {
    try {
      const playerDoc = await getDoc(doc(db, 'players', id));
      if (playerDoc.exists()) {
        const player = Player.fromFirestore(playerDoc);
        if (isEditMode) {
          setEditingPlayer(player);
          setShowForm(true);
          setSelectedPlayer(null);
        } else {
          setSelectedPlayer(player);
          setShowForm(false);
          setEditingPlayer(null);
        }
      } else {
        // Player not found, navigate back to players list
        navigate('/players');
      }
    } catch (error) {
      console.error('Error loading player:', error);
      navigate('/players');
    }
  };

  const handleAddPlayer = () => {
    setEditingPlayer(null);
    setShowForm(true);
  };

  const handleEditPlayer = (player) => {
    if (playerId) {
      // If we're viewing a player profile, navigate to edit URL
      navigate(`/players/${player.id}/edit`);
    } else {
      // If we're on the roster page, show form directly
      setEditingPlayer(player);
      setShowForm(true);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await deleteDoc(doc(db, 'players', playerId));
        await loadPlayers();
      } catch (error) {
        console.error('Error deleting player:', error);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlayer(null);
    loadPlayers();
    
    // If we're in edit mode, navigate back to the player profile
    if (isEditMode && playerId) {
      navigate(`/players/${playerId}`);
    }
  };

  const handlePlayerClick = (player) => {
    navigate(`/players/${player.id}`);
  };

  const handleProfileClose = () => {
    navigate('/players');
  };

  const handlePhotoUpdate = (playerId, photoUrl) => {
    // Update the player in the local state
    setPlayers(prevPlayers => 
      prevPlayers.map(player => 
        player.id === playerId 
          ? { ...player, photoUrl }
          : player
      )
    );
    
    // Update selected player if it's the same one
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(prev => ({ ...prev, photoUrl }));
    }
  };

  if (showForm) {
    return (
      <PlayerForm 
        player={editingPlayer}
        teamId={currentTeam?.id}
        onClose={handleFormClose}
      />
    );
  }

  if (selectedPlayer) {
    return (
      <PlayerProfile 
        player={selectedPlayer} 
        onClose={handleProfileClose}
        onEdit={() => handleEditPlayer(selectedPlayer)}
        onDelete={() => handleDeletePlayer(selectedPlayer.id)}
      />
    );
  }

  if (teamLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading players...</div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-2">No team selected</div>
          <div className="text-sm text-gray-400">Please select or create a team to view players.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8 min-h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Team Roster</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage your team players and their information</p>
          </div>
          <button
            onClick={handleAddPlayer}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-2xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Player</span>
          </button>
        </div>


        {players.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-200/50 dark:border-gray-700/50 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Players Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Start building your team by adding your first player</p>
              <button
                onClick={handleAddPlayer}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-2xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-600/25"
              >
                Add Your First Player
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onClick={() => handlePlayerClick(player)}
                onEdit={() => handleEditPlayer(player)}
                onDelete={() => handleDeletePlayer(player.id)}
                attendanceStats={attendanceStats[player.id]}
                onPhotoUpdate={handlePhotoUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}