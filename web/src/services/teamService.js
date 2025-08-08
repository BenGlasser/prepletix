import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Team, TeamInvitation } from '../models/Team';
import { CoachService } from './coachService';

export class TeamService {
  // Create a new team
  static async createTeam(teamData) {
    try {
      const batch = writeBatch(db);
      
      const team = new Team({
        ...teamData,
        invitationCode: Team.generateInvitationCode(),
        coaches: [teamData.createdBy] // Add creator as first coach
      });
      
      const teamRef = doc(collection(db, 'teams'));
      team.id = teamRef.id;
      
      batch.set(teamRef, team.toFirestore());
      
      // Add team to coach's profile
      if (teamData.createdBy) {
        await CoachService.addCoachToTeam(teamData.createdBy, team.id, 'head');
      }
      
      await batch.commit();
      
      console.log('✅ TeamService: Created team:', team.name);
      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  // Get teams for a specific coach (now uses coach-centric approach)
  static async getTeamsForCoach(coachUid) {
    try {
      console.log('🍕 TeamService: Getting teams for coach:', coachUid);
      
      // Get team IDs from coach profile
      const teamIds = await CoachService.getTeamsForCoach(coachUid);
      console.log('🍕 TeamService: Coach is on teams:', teamIds);
      console.log('🍕 TeamService: Team IDs types:', teamIds.map(id => ({ id, type: typeof id, isString: typeof id === 'string' })));
      
      if (teamIds.length === 0) {
        return [];
      }
      
      // Get team documents
      const teams = [];
      for (const teamId of teamIds) {
        try {
          // Handle both string IDs and object format for migration
          const actualTeamId = typeof teamId === 'string' ? teamId : teamId?.teamId || teamId?.id;
          console.log('🍕 TeamService: Processing team ID:', { original: teamId, actual: actualTeamId, type: typeof actualTeamId });
          
          if (!actualTeamId || typeof actualTeamId !== 'string') {
            console.warn('🍕 TeamService: Invalid team ID format:', teamId);
            continue;
          }
          
          const team = await this.getTeamById(actualTeamId);
          if (team && team.isActive) {
            teams.push(team);
          }
        } catch (error) {
          console.warn(`🍕 TeamService: Failed to load team`, { teamId, error: error.message });
        }
      }
      
      console.log('🍕 TeamService: Loaded teams for coach:', teams);
      return teams;
    } catch (error) {
      console.error('Error getting teams for coach:', error);
      
      // Fallback to old method during migration period
      console.log('🔄 TeamService: Falling back to legacy method - coach profile may not exist yet');
      console.log('💡 To fix this permanently, run the coach-centric migration in Settings');
      return await this.getTeamsForCoachFallback(coachUid);
    }
  }

  // Fallback method for getting teams (for migration compatibility)
  static async getTeamsForCoachFallback(coachUid) {
    try {
      console.log('🍕 TeamService: Using fallback method for coach:', coachUid);
      const snapshot = await getDocs(collection(db, 'teams'));
      const allTeams = snapshot.docs.map(doc => Team.fromFirestore(doc));
      
      const filteredTeams = allTeams.filter(team => {
        const isActive = team.isActive;
        const isCoach = team.isCoach(coachUid);
        const isHeadCoach = team.isHeadCoach(coachUid);
        const shouldInclude = isActive && (isCoach || isHeadCoach);
        
        console.log('🍕 TeamService: Fallback filter check:', {
          teamName: team.name,
          teamId: team.id,
          isActive,
          isCoach,
          isHeadCoach,
          shouldInclude,
          coaches: team.coaches,
          coachUid,
          createdBy: team.createdBy
        });
        
        return shouldInclude;
      });
      
      console.log('🍕 TeamService: Fallback filtered teams:', filteredTeams);
      return filteredTeams;
    } catch (error) {
      console.error('Error in fallback method:', error);
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

  // Add a coach to a team (now delegates to CoachService)
  static async addCoachToTeam(teamId, coachData) {
    try {
      console.log('🤝 TeamService: Adding coach to team via CoachService:', { teamId, coachData });
      
      // Ensure coach profile exists
      await CoachService.ensureCoachProfile(coachData);
      
      // Use CoachService to maintain both sides of the relationship
      const coach = await CoachService.addCoachToTeam(coachData.uid, teamId, coachData.role || 'assistant');
      
      const team = await this.getTeamById(teamId);
      console.log('✅ TeamService: Coach added successfully');
      return team;
    } catch (error) {
      console.error('Error adding coach to team:', error);
      throw error;
    }
  }

  // Remove a coach from a team (now delegates to CoachService)
  static async removeCoachFromTeam(teamId, coachUid) {
    try {
      console.log('❌ TeamService: Removing coach from team via CoachService:', { teamId, coachUid });
      
      // Use CoachService to maintain both sides of the relationship
      await CoachService.removeCoachFromTeam(coachUid, teamId);
      
      const team = await this.getTeamById(teamId);
      console.log('✅ TeamService: Coach removed successfully');
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
      console.log('🔍 TeamService: Looking up invitation code:', invitationCode);
      
      const q = query(
        collection(db, 'teamInvitations'),
        where('invitationCode', '==', invitationCode),
        where('isUsed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      console.log('🔍 TeamService: Found', snapshot.size, 'unused invitations matching code');
      
      if (snapshot.empty) {
        console.log('❌ TeamService: No unused invitations found for code:', invitationCode);
        return null;
      }
      
      // Return the first valid invitation
      const invitation = TeamInvitation.fromFirestore(snapshot.docs[0]);
      console.log('🔍 TeamService: Checking invitation validity:', {
        id: invitation.id,
        teamId: invitation.teamId,
        isUsed: invitation.isUsed,
        expiresAt: invitation.expiresAt,
        isValid: invitation.isValid()
      });
      
      const result = invitation.isValid() ? invitation : null;
      if (!result) {
        console.log('❌ TeamService: Invitation is expired or invalid');
      } else {
        console.log('✅ TeamService: Valid invitation found');
      }
      
      return result;
    } catch (error) {
      console.error('❌ TeamService: Error getting invitation by code:', error);
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
      
      console.log('🎫 TeamService: Applying invitation:', { 
        invitationCode, 
        coachUid: coachData.uid,
        teamId: invitation.teamId 
      });
      
      // Step 1: Ensure coach profile exists first
      console.log('🎫 TeamService: Step 1 - Ensuring coach profile exists');
      const coachProfile = await CoachService.ensureCoachProfile(coachData);
      console.log('✅ TeamService: Coach profile ensured:', {
        uid: coachProfile.uid,
        teamsCount: coachProfile.teams.length
      });
      
      // Step 2: Add coach to team with assistant role (this updates both coach and team)
      console.log('🎫 TeamService: Step 2 - Adding coach to team');
      const updatedCoach = await CoachService.addCoachToTeam(coachData.uid, invitation.teamId, 'assistant');
      console.log('✅ TeamService: Coach added to team, updated coach teams:', {
        uid: updatedCoach.uid,
        teamsCount: updatedCoach.teams.length,
        teams: updatedCoach.teams // Now just array of team IDs
      });
      
      // Step 3: Mark invitation as used
      console.log('🎫 TeamService: Step 3 - Marking invitation as used');
      invitation.markAsUsed(coachData.uid);
      const invitationRef = doc(db, 'teamInvitations', invitation.id);
      await updateDoc(invitationRef, invitation.toFirestore());
      console.log('✅ TeamService: Invitation marked as used');
      
      // Step 4: Verify the team was updated
      console.log('🎫 TeamService: Step 4 - Verifying team update');
      const updatedTeam = await this.getTeamById(invitation.teamId);
      console.log('✅ TeamService: Updated team coaches:', {
        teamId: updatedTeam.id,
        coaches: updatedTeam.coaches,
        createdBy: updatedTeam.createdBy,
        isNewCoachHeadCoach: updatedTeam.isHeadCoach(coachData.uid),
        isNewCoachRegularCoach: updatedTeam.isCoach(coachData.uid)
      });
      
      console.log('✅ TeamService: Invitation applied successfully');
      return updatedTeam;
    } catch (error) {
      console.error('❌ TeamService: Error applying invitation:', error);
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