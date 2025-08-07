import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTeam } from '../../contexts/TeamContext';
import { ChevronDownIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import TeamForm from './TeamForm';

export default function TeamSelector() {
  const navigate = useNavigate();
  const { teamId: currentTeamId } = useParams();
  const { teams, currentTeam, switchTeam, isInitialLoad } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  const handleTeamSelect = (teamId) => {
    // Save to localStorage for login redirect
    localStorage.setItem('lastSelectedTeam', teamId);
    switchTeam(teamId);
    setIsOpen(false);
    // Always navigate to the new team's players page when switching teams
    navigate(`/teams/${teamId}/players`);
  };

  const handleCreateTeam = () => {
    setShowTeamForm(true);
    setIsOpen(false);
  };

  if (teams.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowTeamForm(true)}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create Team</span>
        </button>
        
        {showTeamForm && (
          <TeamForm onClose={() => setShowTeamForm(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 px-3 py-2 bg-white dark:bg-gray-800/95 backdrop-blur-md border border-gray-300 dark:border-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/95 transition-all duration-200 min-w-[200px] shadow-sm"
        >
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {currentTeam?.name || 'Select Team'}
              {currentTeam && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                  {currentTeam.getSeasonDisplay ? currentTeam.getSeasonDisplay() : 
                   `${currentTeam.season?.period || 'Unknown'} ${currentTeam.season?.year || 'Unknown'}`}
                </span>
              )}
            </div>
          </div>
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        <div className={`absolute top-full left-0 right-0 mt-2 z-50 transition-all duration-300 ease-out origin-top ${
          isOpen
            ? 'opacity-100 scale-y-100 scale-x-100 translate-y-0'
            : 'opacity-0 scale-y-0 scale-x-100 -translate-y-2 pointer-events-none'
        }`}>
          <div className="bg-white dark:bg-gray-800/95 backdrop-blur-md border border-gray-300 dark:border-gray-700/50 rounded-xl shadow-xl py-2 max-h-60 overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {team.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {team.getSeasonDisplay ? team.getSeasonDisplay() : 
                     `${team.season?.period || 'Unknown'} ${team.season?.year || 'Unknown'}`}
                  </div>
                </div>
                {currentTeam?.id === team.id && (
                  <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                )}
              </button>
            ))}
            
            <hr className="my-2 border-gray-300 dark:border-gray-700/50" />
            
            <button
              onClick={handleCreateTeam}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 text-primary-600 dark:text-primary-400"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Create New Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {showTeamForm && (
        <TeamForm onClose={() => setShowTeamForm(false)} />
      )}
    </>
  );
}