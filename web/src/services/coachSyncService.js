// Coach Data Synchronization Service
// Keeps coach data consistent across Firebase Auth, team coaches subcollections, and team coaches arrays

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';

export class CoachSyncService {
  
  /**
   * Sync coach data across all locations when profile is updated
   * @param {Object} user - Firebase Auth user
   * @param {Object} updates - Updates to apply { displayName?, photoURL? }
   * @returns {Promise<void>}
   */
  static async syncCoachProfile(user, updates) {
    if (!user?.uid) {
      throw new Error('User is required for coach profile sync');
    }

    console.log('🔄 CoachSyncService: Starting profile sync for:', user.uid, updates);

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // 1. Update Firebase Auth profile
      if (updates.displayName !== undefined || updates.photoURL !== undefined) {
        const authUpdates = {};
        if (updates.displayName !== undefined) authUpdates.displayName = updates.displayName;
        if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;
        
        await updateProfile(user, authUpdates);
        console.log('✅ Updated Firebase Auth profile');
      }

      // 2. Find all teams and update coach data in teams/{teamId}/coaches subcollections
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      
      for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        // 2a. Update coaches subcollection
        const coachesRef = collection(db, 'teams', teamId, 'coaches');
        const coachQuery = query(coachesRef, where('userId', '==', user.uid));
        const coachSnapshot = await getDocs(coachQuery);

        for (const coachDoc of coachSnapshot.docs) {
          const coachRef = doc(db, 'teams', teamId, 'coaches', coachDoc.id);
          const coachUpdates = { updatedAt: new Date() };
          
          if (updates.displayName !== undefined) coachUpdates.name = updates.displayName;
          if (updates.photoURL !== undefined) coachUpdates.photoURL = updates.photoURL;
          
          batch.update(coachRef, coachUpdates);
          updateCount++;
          
          console.log(`📝 Queued update for coach in team ${teamData.name} subcollection`);
        }

        // 2b. Update team's coaches array
        const coaches = teamData.coaches || [];
        const coachIndex = coaches.findIndex(coach => coach.uid === user.uid);
        
        if (coachIndex !== -1) {
          const updatedCoaches = [...coaches];
          if (updates.displayName !== undefined) {
            updatedCoaches[coachIndex].name = updates.displayName;
          }
          if (updates.photoURL !== undefined) {
            updatedCoaches[coachIndex].photoURL = updates.photoURL;
          }
          updatedCoaches[coachIndex].updatedAt = new Date();
          
          const teamRef = doc(db, 'teams', teamId);
          batch.update(teamRef, { 
            coaches: updatedCoaches, 
            updatedAt: new Date() 
          });
          updateCount++;
          
          console.log(`📝 Queued update for coach in team ${teamData.name} coaches array`);
        }
      }

      // 3. Commit all updates as a batch
      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ CoachSyncService: Successfully synced ${updateCount} coach records`);
      } else {
        console.log('ℹ️ CoachSyncService: No coach records found to update');
      }

      return { success: true, updatedRecords: updateCount };

    } catch (error) {
      console.error('❌ CoachSyncService: Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get all teams where the user is a coach (for debugging)
   * @param {string} userUid 
   * @returns {Promise<Array>}
   */
  static async getCoachTeams(userUid) {
    try {
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const coachTeams = [];

      for (const teamDoc of teamsSnapshot.docs) {
        const teamData = teamDoc.data();
        const coaches = teamData.coaches || [];
        
        // Check if user is in coaches array
        const isInCoachesArray = coaches.some(coach => coach.uid === userUid);
        
        // Check if user has coach record in subcollection
        const coachesRef = collection(db, 'teams', teamDoc.id, 'coaches');
        const coachQuery = query(coachesRef, where('userId', '==', userUid));
        const coachSnapshot = await getDocs(coachQuery);
        const hasCoachRecord = !coachSnapshot.empty;

        if (isInCoachesArray || hasCoachRecord) {
          const coachInArray = coaches.find(coach => coach.uid === userUid);
          const coachRecord = coachSnapshot.empty ? null : {
            id: coachSnapshot.docs[0].id,
            ...coachSnapshot.docs[0].data()
          };

          coachTeams.push({
            teamId: teamDoc.id,
            teamName: teamData.name,
            isInCoachesArray,
            hasCoachRecord,
            coachArrayData: coachInArray,
            coachRecordData: coachRecord
          });
        }
      }

      return coachTeams;
    } catch (error) {
      console.error('Error getting coach teams:', error);
      throw error;
    }
  }

  /**
   * Fix data inconsistencies for a specific coach
   * @param {string} userUid 
   * @param {Object} authUser - Firebase Auth user object
   * @returns {Promise<Object>}
   */
  static async fixCoachDataInconsistencies(userUid, authUser) {
    try {
      console.log('🔧 CoachSyncService: Fixing data inconsistencies for:', userUid);
      
      const coachTeams = await this.getCoachTeams(userUid);
      const batch = writeBatch(db);
      let fixCount = 0;

      for (const team of coachTeams) {
        let needsUpdate = false;
        const correctName = authUser.displayName || authUser.email?.split('@')[0] || 'Unknown';
        const correctPhotoURL = authUser.photoURL || null;

        // Fix coaches array if needed
        if (team.isInCoachesArray) {
          const arrayData = team.coachArrayData;
          if (arrayData.name !== correctName || arrayData.photoURL !== correctPhotoURL) {
            console.log(`🔧 Fixing coaches array for team ${team.teamName}`);
            
            const teamRef = doc(db, 'teams', team.teamId);
            const teamDoc = await teamRef.get();
            const teamData = teamDoc.data();
            const coaches = teamData.coaches || [];
            
            const updatedCoaches = coaches.map(coach => 
              coach.uid === userUid 
                ? { ...coach, name: correctName, photoURL: correctPhotoURL, updatedAt: new Date() }
                : coach
            );
            
            batch.update(teamRef, { coaches: updatedCoaches, updatedAt: new Date() });
            fixCount++;
            needsUpdate = true;
          }
        }

        // Fix coach record if needed
        if (team.hasCoachRecord) {
          const recordData = team.coachRecordData;
          if (recordData.name !== correctName || recordData.photoURL !== correctPhotoURL) {
            console.log(`🔧 Fixing coach record for team ${team.teamName}`);
            
            const coachRef = doc(db, 'teams', team.teamId, 'coaches', team.coachRecordData.id);
            batch.update(coachRef, {
              name: correctName,
              photoURL: correctPhotoURL,
              updatedAt: new Date()
            });
            fixCount++;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          console.log(`✅ Queued fixes for team: ${team.teamName}`);
        }
      }

      if (fixCount > 0) {
        await batch.commit();
        console.log(`✅ CoachSyncService: Fixed ${fixCount} data inconsistencies`);
      } else {
        console.log('ℹ️ CoachSyncService: No inconsistencies found');
      }

      return { success: true, fixedRecords: fixCount, teamsChecked: coachTeams.length };

    } catch (error) {
      console.error('❌ CoachSyncService: Fix failed:', error);
      throw error;
    }
  }
}