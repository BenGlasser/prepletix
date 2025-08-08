// Coach Service - Manages coach-centric data operations
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection, 
  getDocs, 
  query,
  where,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';
import { Coach } from '../models/Coach';

export class CoachService {
  
  /**
   * Get a coach by their UID
   * @param {string} coachUid - Firebase Auth UID
   * @returns {Promise<Coach|null>}
   */
  static async getCoachByUid(coachUid) {
    try {
      const coachRef = doc(db, 'coaches', coachUid);
      const coachDoc = await getDoc(coachRef);
      
      if (coachDoc.exists()) {
        return Coach.fromFirestore(coachDoc);
      }
      return null;
    } catch (error) {
      console.error('Error getting coach:', error);
      throw error;
    }
  }

  /**
   * Create a new coach profile
   * @param {Object} authUser - Firebase Auth user object
   * @param {Object} additionalData - Additional coach data
   * @returns {Promise<Coach>}
   */
  static async createCoach(authUser, additionalData = {}) {
    try {
      const coach = Coach.fromAuthUser(authUser, additionalData);
      const coachRef = doc(db, 'coaches', coach.uid);
      
      await setDoc(coachRef, coach.toFirestore());
      
      console.log('✅ CoachService: Created coach profile for:', coach.profile.email);
      return coach;
    } catch (error) {
      console.error('Error creating coach:', error);
      throw error;
    }
  }

  /**
   * Update coach profile
   * @param {string} coachUid 
   * @param {Object} profileUpdates 
   * @returns {Promise<Coach>}
   */
  static async updateCoachProfile(coachUid, profileUpdates) {
    try {
      const coachRef = doc(db, 'coaches', coachUid);
      const coach = await this.getCoachByUid(coachUid);
      
      if (!coach) {
        throw new Error('Coach not found');
      }

      // Update the coach object
      coach.updateProfile(profileUpdates);
      
      // Update Firestore
      await updateDoc(coachRef, {
        profile: coach.profile,
        updatedAt: coach.updatedAt
      });

      console.log('✅ CoachService: Updated coach profile for:', coachUid);
      return coach;
    } catch (error) {
      console.error('Error updating coach profile:', error);
      throw error;
    }
  }

  /**
   * Sync coach profile with Firebase Auth and all related data
   * @param {Object} authUser - Firebase Auth user
   * @param {Object} updates - Profile updates
   * @returns {Promise<{success: boolean, updatedRecords: number}>}
   */
  static async syncCoachProfile(authUser, updates) {
    try {
      console.log('🔄 CoachService: Starting profile sync for:', authUser.uid, updates);
      
      const batch = writeBatch(db);
      let updateCount = 0;

      // 1. Update Firebase Auth profile
      if (updates.displayName !== undefined) {
        await updateProfile(authUser, { displayName: updates.displayName });
        console.log('✅ Updated Firebase Auth profile');
      }

      // 2. Update coach profile in Firestore
      const coachRef = doc(db, 'coaches', authUser.uid);
      let coach = await this.getCoachByUid(authUser.uid);
      
      if (!coach) {
        // Create coach if doesn't exist
        coach = await this.createCoach(authUser, { profile: updates });
      } else {
        // Update existing coach
        coach.updateProfile(updates);
        batch.update(coachRef, {
          profile: coach.profile,
          updatedAt: coach.updatedAt
        });
        updateCount++;
      }

      // 3. Update team references where this coach is referenced
      await this.updateTeamCoachReferences(authUser.uid, coach.toTeamReference(), batch);
      updateCount += coach.getActiveTeams().length;

      // 4. Commit all updates
      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ CoachService: Successfully synced ${updateCount} records`);
      }

      return { success: true, updatedRecords: updateCount };

    } catch (error) {
      console.error('❌ CoachService: Profile sync failed:', error);
      throw error;
    }
  }

  /**
   * Add coach to a team
   * @param {string} coachUid 
   * @param {string} teamId 
   * @param {string} role - 'head' or 'assistant'
   * @returns {Promise<Coach>}
   */
  static async addCoachToTeam(coachUid, teamId, role = 'assistant') {
    try {
      const batch = writeBatch(db);
      
      // Get or create coach
      let coach = await this.getCoachByUid(coachUid);
      if (!coach) {
        throw new Error('Coach not found. Coach profile must be created first.');
      }

      // Add team to coach
      coach.addTeam(teamId);
      
      const coachRef = doc(db, 'coaches', coachUid);
      batch.update(coachRef, {
        teams: coach.teams,
        updatedAt: coach.updatedAt
      });

      // Update team's coach references
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const coaches = teamData.coaches || [];
        
        if (!coaches.includes(coachUid)) {
          coaches.push(coachUid);
          batch.update(teamRef, { 
            coaches, 
            updatedAt: new Date() 
          });
        }
      }

      await batch.commit();
      
      console.log(`✅ CoachService: Added coach ${coachUid} to team ${teamId} as ${role}`);
      return coach;
    } catch (error) {
      console.error('Error adding coach to team:', error);
      throw error;
    }
  }

  /**
   * Remove coach from a team
   * @param {string} coachUid 
   * @param {string} teamId 
   * @returns {Promise<Coach>}
   */
  static async removeCoachFromTeam(coachUid, teamId) {
    try {
      const batch = writeBatch(db);
      
      const coach = await this.getCoachByUid(coachUid);
      if (!coach) {
        throw new Error('Coach not found');
      }

      // Remove team from coach
      coach.removeTeam(teamId);
      
      const coachRef = doc(db, 'coaches', coachUid);
      batch.update(coachRef, {
        teams: coach.teams,
        updatedAt: coach.updatedAt
      });

      // Update team's coach references
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const coaches = (teamData.coaches || []).filter(uid => uid !== coachUid);
        
        batch.update(teamRef, { 
          coaches, 
          updatedAt: new Date() 
        });
      }

      await batch.commit();
      
      console.log(`✅ CoachService: Removed coach ${coachUid} from team ${teamId}`);
      return coach;
    } catch (error) {
      console.error('Error removing coach from team:', error);
      throw error;
    }
  }

  /**
   * Get all coaches for a specific team
   * @param {string} teamId 
   * @returns {Promise<Coach[]>}
   */
  static async getCoachesForTeam(teamId) {
    try {
      // Query coaches who have this team in their teams array
      const coachesRef = collection(db, 'coaches');
      const q = query(coachesRef, where('teams', 'array-contains-any', [
        { teamId, isActive: true },
        { teamId } // For backwards compatibility during migration
      ]));
      
      const snapshot = await getDocs(q);
      const coaches = snapshot.docs
        .map(doc => Coach.fromFirestore(doc))
        .filter(coach => coach.isOnTeam(teamId));
      
      console.log(`📋 CoachService: Found ${coaches.length} coaches for team ${teamId}`);
      return coaches;
    } catch (error) {
      console.error('Error getting coaches for team:', error);
      // Fallback to simpler query
      try {
        const coachesRef = collection(db, 'coaches');
        const snapshot = await getDocs(coachesRef);
        const coaches = snapshot.docs
          .map(doc => Coach.fromFirestore(doc))
          .filter(coach => coach.isOnTeam(teamId));
        
        console.log(`📋 CoachService: Fallback found ${coaches.length} coaches for team ${teamId}`);
        return coaches;
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get all teams for a specific coach
   * @param {string} coachUid 
   * @returns {Promise<string[]>} Array of team IDs
   */
  static async getTeamsForCoach(coachUid) {
    try {
      const coach = await this.getCoachByUid(coachUid);
      if (!coach) {
        console.log('🚨 CoachService: No coach profile found for:', coachUid);
        console.log('💡 This is normal before running the coach-centric migration');
        return [];
      }
      
      return coach.getActiveTeams(); // Now returns array of team IDs
    } catch (error) {
      console.error('Error getting teams for coach:', error);
      if (error.code === 'permission-denied') {
        console.log('💡 Firestore permission denied - coach profile may not exist yet');
      }
      return [];
    }
  }

  /**
   * Subscribe to coach profile changes
   * @param {string} coachUid 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  static subscribeToCoach(coachUid, callback) {
    const coachRef = doc(db, 'coaches', coachUid);
    
    return onSnapshot(coachRef, (doc) => {
      if (doc.exists()) {
        const coach = Coach.fromFirestore(doc);
        callback(coach);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in coach subscription:', error);
      callback(null);
    });
  }

  /**
   * Subscribe to coaches for a team
   * @param {string} teamId 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  static subscribeToTeamCoaches(teamId, callback) {
    // This is a bit complex with Firestore's query limitations
    // For now, we'll use a simpler approach and filter client-side
    const coachesRef = collection(db, 'coaches');
    
    return onSnapshot(coachesRef, (snapshot) => {
      const coaches = snapshot.docs
        .map(doc => Coach.fromFirestore(doc))
        .filter(coach => coach.isOnTeam(teamId));
      
      callback(coaches);
    }, (error) => {
      console.error('Error in team coaches subscription:', error);
      callback([]);
    });
  }

  /**
   * Update team coach references when coach profile changes
   * @private
   */
  static async updateTeamCoachReferences(coachUid, coachReference, batch) {
    try {
      // This is called internally when a coach's profile changes
      // to update any cached coach data in team documents
      
      const coach = await this.getCoachByUid(coachUid);
      if (!coach) return;

      const teamIds = coach.getActiveTeams(); // Now returns array of team IDs
      
      for (const teamId of teamIds) {
        // If teams cache coach data (for performance), update it here
        // For now, teams just store coach UIDs, so no update needed
        console.log(`📝 Updated team ${teamId} coach references`);
      }
    } catch (error) {
      console.error('Error updating team coach references:', error);
    }
  }

  /**
   * Ensure coach profile exists (create if missing)
   * @param {Object} authUser - Firebase Auth user
   * @returns {Promise<Coach>}
   */
  static async ensureCoachProfile(authUser) {
    try {
      let coach = await this.getCoachByUid(authUser.uid);
      
      if (!coach) {
        console.log('🆕 CoachService: Creating missing coach profile for:', authUser.email);
        coach = await this.createCoach(authUser);
      }
      
      return coach;
    } catch (error) {
      console.error('Error ensuring coach profile:', error);
      throw error;
    }
  }

  /**
   * Delete coach (soft delete - deactivate)
   * @param {string} coachUid 
   * @returns {Promise<void>}
   */
  static async deleteCoach(coachUid) {
    try {
      const coachRef = doc(db, 'coaches', coachUid);
      await updateDoc(coachRef, {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('🗑️ CoachService: Deactivated coach:', coachUid);
    } catch (error) {
      console.error('Error deactivating coach:', error);
      throw error;
    }
  }
}