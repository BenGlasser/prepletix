import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { Team, TeamInvitation } from '../models/Team';

export class TeamService {
  // Create a new team
  static async createTeam(teamData) {
    try {
      const team = new Team({
        ...teamData,
        invitationCode: Team.generateInvitationCode()
      });
      
      const docRef = await addDoc(collection(db, 'teams'), team.toFirestore());
      team.id = docRef.id;
      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  // Get teams for a specific coach
  static async getTeamsForCoach(coachUid) {
    try {
      // Use fallback approach since complex queries can be problematic
      return await this.getTeamsForCoachFallback(coachUid);
    } catch (error) {
      console.error('Error getting teams for coach:', error);
      throw error;
    }
  }

  // Fallback method for getting teams (simpler query)
  static async getTeamsForCoachFallback(coachUid) {
    try {
      console.log('🍕 TeamService: Getting teams for coach:', coachUid);
      const snapshot = await getDocs(collection(db, 'teams'));
      const allTeams = snapshot.docs.map(doc => Team.fromFirestore(doc));
      console.log('🍕 TeamService: All teams from DB:', allTeams);
      
      // Check if user is accessing a specific team via URL
      const currentPath = window.location.pathname;
      const teamIdFromUrl = currentPath.match(/\/teams\/([^\/]+)/)?.[1];
      
      const filteredTeams = allTeams.filter(team => {
        const isActive = team.isActive;
        const isCoach = team.isCoach(coachUid);
        const isHeadCoach = team.isHeadCoach(coachUid);
        const isAccessingThisTeamViaUrl = teamIdFromUrl === team.id;
        const shouldInclude = isActive && (isCoach || isHeadCoach || isAccessingThisTeamViaUrl);
        
        console.log('🍕 TeamService: Team filter check:', {
          teamName: team.name,
          teamId: team.id,
          isActive,
          isCoach,
          isHeadCoach,
          isAccessingThisTeamViaUrl,
          shouldInclude,
          coaches: team.coaches,
          coachUid,
          createdBy: team.createdBy,
          teamIdFromUrl
        });
        
        return shouldInclude;
      });
      
      console.log('🍕 TeamService: Filtered teams for coach:', filteredTeams);
      return filteredTeams;
    } catch (error) {
      console.error('Error getting teams for coach:', error);
      throw error;
    }
  }

  // Get a specific team by ID
  static async getTeamById(teamId) {
    try {
      const docRef = doc(db, 'teams', teamId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return Team.fromFirestore(docSnap);
      } else {
        throw new Error('Team not found');
      }
    } catch (error) {
      console.error('Error getting team:', error);
      throw error;
    }
  }

  // Update a team
  static async updateTeam(teamId, updateData) {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        ...updateData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  // Add a coach to a team
  static async addCoachToTeam(teamId, coachData) {
    try {
      const team = await this.getTeamById(teamId);
      team.addCoach(coachData);
      
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        coaches: team.coaches,
        updatedAt: new Date()
      });
      
      return team;
    } catch (error) {
      console.error('Error adding coach to team:', error);
      throw error;
    }
  }

  // Remove a coach from a team
  static async removeCoachFromTeam(teamId, coachUid) {
    try {
      const team = await this.getTeamById(teamId);
      team.removeCoach(coachUid);
      
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        coaches: team.coaches,
        updatedAt: new Date()
      });
      
      return team;
    } catch (error) {
      console.error('Error removing coach from team:', error);
      throw error;
    }
  }

  // Create a team invitation
  static async createInvitation(teamId, invitedBy, invitedByName) {
    try {
      const team = await this.getTeamById(teamId);
      
      const invitation = new TeamInvitation({
        teamId: teamId,
        teamName: team.name,
        invitationCode: team.invitationCode,
        invitedBy: invitedBy,
        invitedByName: invitedByName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      const docRef = await addDoc(collection(db, 'teamInvitations'), invitation.toFirestore());
      return { ...invitation, id: docRef.id };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  // Get invitation by code
  static async getInvitationByCode(invitationCode) {
    try {
      const q = query(
        collection(db, 'teamInvitations'),
        where('invitationCode', '==', invitationCode),
        where('isUsed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      // Return the first valid invitation
      const invitation = TeamInvitation.fromFirestore(snapshot.docs[0]);
      return invitation.isValid() ? invitation : null;
    } catch (error) {
      console.error('Error getting invitation by code:', error);
      throw error;
    }
  }

  // Apply an invitation (mark as used and add coach to team)
  static async applyInvitation(invitationCode, coachData) {
    try {
      const invitation = await this.getInvitationByCode(invitationCode);
      
      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }
      
      // Add coach to team
      await this.addCoachToTeam(invitation.teamId, {
        ...coachData,
        role: 'assistant' // Default role for invited coaches
      });
      
      // Mark invitation as used
      invitation.markAsUsed(coachData.uid);
      const invitationRef = doc(db, 'teamInvitations', invitation.id);
      await updateDoc(invitationRef, invitation.toFirestore());
      
      return await this.getTeamById(invitation.teamId);
    } catch (error) {
      console.error('Error using invitation:', error);
      throw error;
    }
  }

  // Generate a new invitation code for a team
  static async regenerateInvitationCode(teamId) {
    try {
      const newCode = Team.generateInvitationCode();
      const teamRef = doc(db, 'teams', teamId);
      
      await updateDoc(teamRef, {
        invitationCode: newCode,
        updatedAt: new Date()
      });
      
      return newCode;
    } catch (error) {
      console.error('Error regenerating invitation code:', error);
      throw error;
    }
  }

  // Deactivate a team (soft delete)
  static async deactivateTeam(teamId) {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error deactivating team:', error);
      throw error;
    }
  }
}