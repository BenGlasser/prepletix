import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Player } from '../../models/Player';
import PlayerCard from './PlayerCard';
import PlayerForm from './PlayerForm';
import PlayerProfile from './PlayerProfile';
import DataSeeder from '../admin/DataSeeder';
import ColorShowcase from '../admin/ColorShowcase';

export default function PlayerRoster() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const playersCollection = collection(db, 'players');
      const snapshot = await getDocs(playersCollection);
      const playerList = snapshot.docs.map(doc => Player.fromFirestore(doc));
      setPlayers(playerList);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = () => {
    setEditingPlayer(null);
    setShowForm(true);
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setShowForm(true);
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
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
  };

  const handleProfileClose = () => {
    setSelectedPlayer(null);
  };

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

  if (showForm) {
    return (
      <PlayerForm 
        player={editingPlayer}
        onClose={handleFormClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
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

        {players.length === 0 && (
          <>
            <DataSeeder />
            <ColorShowcase />
          </>
        )}

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}