import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { TeamService } from '../services/teamService';
import { Team } from '../models/Team';

const TeamContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

export function TeamProvider({ children }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to ensure teams are proper Team instances
  const ensureTeamInstance = (team) => {
    if (team && typeof team === 'object' && !team.getSeasonDisplay) {
      return new Team(team);
    }
    return team;
  };

  const ensureTeamInstances = useCallback((teamArray) => {
    return teamArray.map(ensureTeamInstance);
  }, []);

  const loadUserTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userTeams = await TeamService.getTeamsForCoach(user.uid);
      setTeams(ensureTeamInstances(userTeams));
    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, ensureTeamInstances]);

  // Load teams for the current user
  useEffect(() => {
    if (user) {
      loadUserTeams();
    } else {
      setTeams([]);
      setCurrentTeam(null);
      setLoading(false);
    }
  }, [user, loadUserTeams]);

  // Set current team from localStorage or first team
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      const savedTeamId = localStorage.getItem('currentTeamId');
      const team = savedTeamId 
        ? teams.find(t => t.id === savedTeamId) || teams[0]
        : teams[0];
      setCurrentTeam(ensureTeamInstance(team));
    }
  }, [teams, currentTeam]);

  // Save current team to localStorage
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeamId', currentTeam.id);
    }
  }, [currentTeam]);

  const createTeam = async (teamData) => {
    try {
      setError(null);
      const newTeam = await TeamService.createTeam({
        ...teamData,
        createdBy: user.uid,
        coaches: [{
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email,
          role: 'head',
          joinedAt: new Date()
        }]
      });
      
      const teamInstance = ensureTeamInstance(newTeam);
      setTeams(prev => [teamInstance, ...ensureTeamInstances(prev)]);
      setCurrentTeam(teamInstance);
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team');
      throw error;
    }
  };

  const updateTeam = async (teamId, updateData) => {
    try {
      setError(null);
      await TeamService.updateTeam(teamId, updateData);
      
      // Update local state
      setTeams(prev => ensureTeamInstances(prev.map(team => 
        team.id === teamId ? { ...team, ...updateData } : team
      )));
      
      if (currentTeam?.id === teamId) {
        setCurrentTeam(ensureTeamInstance({ ...currentTeam, ...updateData }));
      }
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
      throw error;
    }
  };

  const switchTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(ensureTeamInstance(team));
    }
  };

  const joinTeamWithInvitation = async (invitationCode) => {
    try {
      setError(null);
      const team = await TeamService.applyInvitation(invitationCode, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email
      });
      
      // Reload teams to include the new team
      await loadUserTeams();
      setCurrentTeam(ensureTeamInstance(team));
      return team;
    } catch (error) {
      console.error('Error joining team with invitation:', error);
      setError('Invalid or expired invitation code');
      throw error;
    }
  };

  const createInvitation = async (teamId) => {
    try {
      setError(null);
      const invitation = await TeamService.createInvitation(
        teamId,
        user.uid,
        user.displayName || user.email
      );
      return invitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      setError('Failed to create invitation');
      throw error;
    }
  };

  const regenerateInvitationCode = async (teamId) => {
    try {
      setError(null);
      const newCode = await TeamService.regenerateInvitationCode(teamId);
      
      // Update local state
      setTeams(prev => ensureTeamInstances(prev.map(team => 
        team.id === teamId ? { ...team, invitationCode: newCode } : team
      )));
      
      if (currentTeam?.id === teamId) {
        setCurrentTeam(ensureTeamInstance({ ...currentTeam, invitationCode: newCode }));
      }
      
      return newCode;
    } catch (error) {
      console.error('Error regenerating invitation code:', error);
      setError('Failed to regenerate invitation code');
      throw error;
    }
  };

  // Check if current user can manage a team (is head coach)
  const canManageTeam = (teamId = currentTeam?.id) => {
    if (!teamId || !user) return false;
    const team = teams.find(t => t.id === teamId) || currentTeam;
    return team?.isHeadCoach(user.uid);
  };

  // Check if current user is a coach on a team
  const isCoachOnTeam = (teamId = currentTeam?.id) => {
    if (!teamId || !user) return false;
    const team = teams.find(t => t.id === teamId) || currentTeam;
    return team?.isCoach(user.uid) || team?.isHeadCoach(user.uid);
  };

  const value = {
    // State
    teams,
    currentTeam,
    loading,
    error,
    
    // Actions
    createTeam,
    updateTeam,
    switchTeam,
    joinTeamWithInvitation,
    createInvitation,
    regenerateInvitationCode,
    loadUserTeams,
    
    // Utilities
    canManageTeam,
    isCoachOnTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}