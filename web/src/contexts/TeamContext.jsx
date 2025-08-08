import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { TeamService } from '../services/teamService';
import { CoachService } from '../services/coachService';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
      console.log('🍕 TeamContext: Loading teams for coach:', user.uid);
      
      // Ensure coach profile exists before trying to load teams
      try {
        const coachProfile = await CoachService.ensureCoachProfile(user);
        console.log('✅ TeamContext: Coach profile verified/created:', coachProfile);
      } catch (profileError) {
        console.warn('⚠️ TeamContext: Could not ensure coach profile:', profileError);
        // Continue anyway - the fallback method should still work
      }
      
      const userTeams = await TeamService.getTeamsForCoach(user.uid);
      console.log('🍕 TeamContext: Loaded teams result:', {
        teamsCount: userTeams.length,
        teams: userTeams.map(t => ({ id: t.id, name: t.name }))
      });
      
      const teamInstances = ensureTeamInstances(userTeams);
      console.log('🍕 TeamContext: Setting teams in state:', {
        teamsCount: teamInstances.length,
        teamNames: teamInstances.map(t => ({ id: t.id, name: t.name }))
      });
      setTeams(teamInstances);
      
      // If no teams loaded, try to handle the specific team from URL as fallback
      if (userTeams.length === 0) {
        console.warn('⚠️ TeamContext: No teams found for coach. This might indicate:');
        console.warn('   1. The coach-centric migration needs to be run');
        console.warn('   2. The coach was not properly added to any teams');
        console.warn('   3. Team data is in old embedded format');
        console.warn('   💡 Run migration tool in Settings > Data Model Migration');
        
        // Emergency fallback: if user is on a team route, try to load that specific team
        const currentPath = window.location.pathname;
        const teamRouteMatch = currentPath.match(/^\/teams\/([^\/]+)/);
        if (teamRouteMatch) {
          const urlTeamId = teamRouteMatch[1];
          console.log('🚑 TeamContext: Emergency fallback - trying to load team from URL:', urlTeamId);
          try {
            const specificTeam = await TeamService.getTeamById(urlTeamId);
            if (specificTeam && (specificTeam.isCoach(user.uid) || specificTeam.isHeadCoach(user.uid))) {
              console.log('✅ TeamContext: Emergency fallback successful - loaded team:', specificTeam.name);
              setTeams([specificTeam]);
              setCurrentTeam(specificTeam);
            } else {
              console.warn('❌ TeamContext: User does not have access to team:', urlTeamId);
            }
          } catch (fallbackError) {
            console.error('❌ TeamContext: Emergency fallback failed:', fallbackError);
          }
        }
      }
    } catch (error) {
      console.error('❌ TeamContext: Error loading teams:', error);
      console.error('   This might indicate the coach-centric migration needs to be run');
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

  // Set current team from localStorage, URL, or first team
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      // Try localStorage first
      const savedTeamId = localStorage.getItem('currentTeamId');
      
      // Check if user is on a team route and extract team ID from URL
      const currentPath = window.location.pathname;
      const teamRouteMatch = currentPath.match(/^\/teams\/([^\/]+)/);
      const urlTeamId = teamRouteMatch ? teamRouteMatch[1] : null;
      
      console.log('🍕 TeamContext: Setting current team from:', {
        savedTeamId,
        urlTeamId,
        currentPath,
        availableTeams: teams.map(t => ({ id: t.id, name: t.name }))
      });
      
      // Priority: URL team ID (if valid) > saved team ID > first team
      let teamToSet = null;
      if (urlTeamId && teams.find(t => t.id === urlTeamId)) {
        teamToSet = teams.find(t => t.id === urlTeamId);
        console.log('🍕 TeamContext: Using team from URL:', teamToSet.name);
      } else if (savedTeamId && teams.find(t => t.id === savedTeamId)) {
        teamToSet = teams.find(t => t.id === savedTeamId);
        console.log('🍕 TeamContext: Using saved team:', teamToSet.name);
      } else {
        teamToSet = teams[0];
        console.log('🍕 TeamContext: Using first team:', teamToSet.name);
      }
      
      setCurrentTeam(ensureTeamInstance(teamToSet));
      // Mark that initial load is complete after setting team
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [teams, currentTeam]);

  // Save current team to localStorage
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeamId', currentTeam.id);
      localStorage.setItem('lastSelectedTeam', currentTeam.id);
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
    console.log('🍕 TeamContext.switchTeam called', { 
      teamId, 
      currentTeamId: currentTeam?.id,
      stackTrace: new Error().stack 
    });
    const team = teams.find(t => t.id === teamId);
    if (team) {
      localStorage.setItem('lastSelectedTeam', teamId);
      setCurrentTeam(ensureTeamInstance(team));
      setIsInitialLoad(false); // This is a user action
    }
  };

  const joinTeamWithInvitation = async (invitationCode) => {
    try {
      setError(null);
      console.log('🎫 TeamContext: Starting joinTeamWithInvitation for:', invitationCode);
      
      const team = await TeamService.applyInvitation(invitationCode, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email
      });
      
      console.log('🎫 TeamContext: Invitation applied successfully, team:', team.name);
      
      // Reload teams to include the new team
      console.log('🎫 TeamContext: Reloading user teams after invitation...');
      await loadUserTeams();
      
      // Verify the team is now in the list
      const reloadedTeams = await TeamService.getTeamsForCoach(user.uid);
      console.log('🎫 TeamContext: Teams after reload:', {
        teamsCount: reloadedTeams.length,
        teamNames: reloadedTeams.map(t => ({ id: t.id, name: t.name })),
        targetTeamId: team.id,
        isTargetTeamIncluded: reloadedTeams.some(t => t.id === team.id)
      });
      
      // Ensure we have the team instance and set it as current
      const teamInstance = ensureTeamInstance(team);
      setCurrentTeam(teamInstance);
      console.log('🎫 TeamContext: Set current team to:', teamInstance.name);
      
      return team;
    } catch (error) {
      console.error('❌ TeamContext: Error joining team with invitation:', error);
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

  // Force refresh - useful for debugging and after major operations
  const forceRefreshTeams = useCallback(async () => {
    console.log('🔄 TeamContext: Force refreshing teams...');
    setTeams([]);
    setCurrentTeam(null);
    await loadUserTeams();
  }, [loadUserTeams]);

  const value = {
    // State
    teams,
    currentTeam,
    loading,
    error,
    isInitialLoad,
    
    // Actions
    createTeam,
    updateTeam,
    switchTeam,
    joinTeamWithInvitation,
    createInvitation,
    regenerateInvitationCode,
    loadUserTeams,
    forceRefreshTeams,
    
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