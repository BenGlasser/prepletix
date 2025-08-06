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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Roster</h2>
        <button
          onClick={handleAddPlayer}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <span>+</span>
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
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">No players added yet</div>
          <button
            onClick={handleAddPlayer}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add Your First Player
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
  );
}