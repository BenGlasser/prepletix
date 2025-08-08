// Coach Service - Manages coach-centric data operations
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "../firebase";
import { Coach } from "../models/Coach";

export class CoachService {
  /**
   * Get a coach by their UID
   * @param {string} coachUid - Firebase Auth UID
   * @returns {Promise<Coach|null>}
   */
  static async getCoachByUid(coachUid) {
    try {
      const coachRef = doc(db, "coaches", coachUid);
      const coachDoc = await getDoc(coachRef);

      if (coachDoc.exists()) {
        return Coach.fromFirestore(coachDoc);
      }
      return null;
    } catch (error) {
      console.error("Error getting coach:", error);
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
      const coachRef = doc(db, "coaches", coach.uid);

      await setDoc(coachRef, coach.toFirestore());

      console.log(
        "✅ CoachService: Created coach profile for:",
        coach.profile.email
      );
      return coach;
    } catch (error) {
      console.error("Error creating coach:", error);
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
      const coachRef = doc(db, "coaches", coachUid);
      const coach = await this.getCoachByUid(coachUid);

      if (!coach) {
        throw new Error("Coach not found");
      }

      // Update the coach object
      coach.updateProfile(profileUpdates);

      // Update Firestore
      await updateDoc(coachRef, {
        profile: coach.profile,
        updatedAt: coach.updatedAt,
      });

      console.log("✅ CoachService: Updated coach profile for:", coachUid);
      return coach;
    } catch (error) {
      console.error("Error updating coach profile:", error);
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
      console.log(
        "🔄 CoachService: Starting profile sync for:",
        authUser.uid,
        updates
      );

      const batch = writeBatch(db);
      let updateCount = 0;

      // 1. Update Firebase Auth profile
      if (updates.displayName !== undefined) {
        await updateProfile(authUser, { displayName: updates.displayName });
        console.log("✅ Updated Firebase Auth profile");
      }

      // 2. Update coach profile in Firestore
      const coachRef = doc(db, "coaches", authUser.uid);
      let coach = await this.getCoachByUid(authUser.uid);

      if (!coach) {
        // Create coach if doesn't exist
        coach = await this.createCoach(authUser, { profile: updates });
      } else {
        // Update existing coach
        coach.updateProfile(updates);
        batch.update(coachRef, {
          profile: coach.profile,
          updatedAt: coach.updatedAt,
        });
        updateCount++;
      }

      // 3. Update team references where this coach is referenced
      await this.updateTeamCoachReferences(authUser.uid);
      updateCount += coach.getActiveTeams().length;

      // 4. Commit all updates
      if (updateCount > 0) {
        await batch.commit();
        console.log(
          `✅ CoachService: Successfully synced ${updateCount} records`
        );
      }

      return { success: true, updatedRecords: updateCount };
    } catch (error) {
      console.error("❌ CoachService: Profile sync failed:", error);
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
  static async addCoachToTeam(coachUid, teamId, role = "assistant") {
    try {
      const batch = writeBatch(db);

      // Get or create coach
      let coach = await this.getCoachByUid(coachUid);
      if (!coach) {
        throw new Error(
          "Coach not found. Coach profile must be created first."
        );
      }

      // Add team to coach
      coach.addTeam(teamId);

      const coachRef = doc(db, "coaches", coachUid);
      batch.update(coachRef, {
        teams: coach.teams,
        updatedAt: coach.updatedAt,
      });

      // Update team's coach references
      const teamRef = doc(db, "teams", teamId);
      const teamDoc = await getDoc(teamRef);

      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const coaches = teamData.coaches || [];

        console.log("🔧 CoachService: Team before adding coach:", {
          teamId,
          currentCoaches: coaches,
          createdBy: teamData.createdBy,
          coachToAdd: coachUid,
        });

        if (!coaches.includes(coachUid)) {
          coaches.push(coachUid);
          batch.update(teamRef, {
            coaches,
            updatedAt: new Date(),
          });
          console.log(
            "🔧 CoachService: Will update team with coaches:",
            coaches
          );
        } else {
          console.log(
            "🔧 CoachService: Coach already in team, no update needed"
          );
        }
      }

      await batch.commit();

      console.log(
        `✅ CoachService: Added coach ${coachUid} to team ${teamId} as ${role}`
      );
      return coach;
    } catch (error) {
      console.error("Error adding coach to team:", error);
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
      console.log(
        `🗑️ CoachService: Starting removal of coach ${coachUid} from team ${teamId}`
      );

      const coach = await this.getCoachByUid(coachUid);
      if (!coach) {
        throw new Error("Coach not found");
      }

      console.log(`🗑️ CoachService: Coach found, current teams:`, coach.teams);

      // Remove team from coach
      coach.removeTeam(teamId);
      console.log(`🗑️ CoachService: After removal, coach teams:`, coach.teams);

      // Update coach document
      const coachRef = doc(db, "coaches", coachUid);

      // Validate the data before updating
      console.log(`🔍 CoachService: About to update coach document with:`, {
        teams: coach.teams,
        teamsType: typeof coach.teams,
        teamsIsArray: Array.isArray(coach.teams),
        teamsContent: coach.teams.map((t) => ({ value: t, type: typeof t })),
        updatedAt: new Date(),
      });

      // Ensure teams is a clean array of strings
      const cleanTeams = coach.teams.filter(
        (teamId) =>
          teamId && typeof teamId === "string" && teamId.trim().length > 0
      );

      console.log(`🔍 CoachService: Cleaned teams array:`, cleanTeams);

      try {
        await updateDoc(coachRef, {
          teams: cleanTeams,
          updatedAt: new Date(),
        });
        console.log(`✅ CoachService: Updated coach document`);
      } catch (updateError) {
        console.error(
          `🚨 CoachService: Failed to update coach document:`,
          updateError
        );
        console.error(`🚨 CoachService: Coach document ID:`, coachUid);
        console.error(`🚨 CoachService: Update data:`, {
          teams: cleanTeams,
          updatedAt: new Date(),
        });
        throw updateError;
      }

      // Update team's coach references
      const teamRef = doc(db, "teams", teamId);
      const teamDoc = await getDoc(teamRef);

      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const originalCoaches = teamData.coaches || [];
        const updatedCoaches = originalCoaches.filter(
          (uid) => uid !== coachUid
        );

        console.log(`🗑️ CoachService: Team coaches before:`, originalCoaches);
        console.log(`🗑️ CoachService: Team coaches after:`, updatedCoaches);

        await updateDoc(teamRef, {
          coaches: updatedCoaches,
          updatedAt: new Date(),
        });
        console.log(`✅ CoachService: Updated team document`);
      } else {
        console.warn(`⚠️ CoachService: Team ${teamId} not found`);
      }

      console.log(
        `✅ CoachService: Successfully removed coach ${coachUid} from team ${teamId}`
      );
      return coach;
    } catch (error) {
      console.error("🚨 CoachService: Error removing coach from team:", error);
      console.error("🚨 CoachService: Error details:", {
        coachUid,
        teamId,
        errorCode: error.code,
        errorMessage: error.message,
      });
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
      console.log(`🔍 CoachService: Looking for coaches on team ${teamId}`);

      // Since teams array now contains team IDs (strings), we need to use array-contains
      const coachesRef = collection(db, "coaches");
      const q = query(coachesRef, where("teams", "array-contains", teamId));

      console.log(
        `🔍 CoachService: Running query: coaches where teams array-contains "${teamId}"`
      );
      const snapshot = await getDocs(q);
      console.log(`🔍 CoachService: Query returned ${snapshot.size} documents`);

      const coaches = snapshot.docs.map((doc) => {
        const coach = Coach.fromFirestore(doc);
        console.log(
          `🔍 CoachService: Coach ${
            coach.uid
          } (${coach.getDisplayName()}) has teams:`,
          coach.teams
        );
        return coach;
      });

      console.log(
        `📋 CoachService: Found ${coaches.length} coaches for team ${teamId}`
      );
      return coaches;
    } catch (error) {
      console.error("🚨 CoachService: Error getting coaches for team:", error);
      // Fallback to simpler query
      try {
        console.log(
          "🔄 CoachService: Trying fallback - get all coaches and filter client-side"
        );
        const coachesRef = collection(db, "coaches");
        const snapshot = await getDocs(coachesRef);
        console.log(
          `🔄 CoachService: Fallback got ${snapshot.size} total coaches`
        );

        const coaches = snapshot.docs
          .map((doc) => Coach.fromFirestore(doc))
          .filter((coach) => {
            const isOnTeam = coach.isOnTeam(teamId);
            console.log(
              `🔄 CoachService: Coach ${coach.uid} isOnTeam(${teamId}):`,
              isOnTeam,
              "teams:",
              coach.teams
            );
            return isOnTeam;
          });

        console.log(
          `📋 CoachService: Fallback found ${coaches.length} coaches for team ${teamId}`
        );
        return coaches;
      } catch (fallbackError) {
        console.error(
          "🚨 CoachService: Error in fallback query:",
          fallbackError
        );
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
        console.log("🚨 CoachService: No coach profile found for:", coachUid);
        console.log(
          "💡 This is normal before running the coach-centric migration"
        );
        return [];
      }

      // Check if teams array needs migration from objects to strings
      const teams = coach.getActiveTeams();
      console.log("🔍 CoachService: Coach teams before processing:", teams);

      if (teams.length > 0 && typeof teams[0] === "object") {
        console.log(
          "🔧 CoachService: Detected old object format in teams array, migrating..."
        );

        // Convert objects to team ID strings
        const teamIds = teams
          .map((team) => {
            if (typeof team === "string") return team;
            return team.teamId || team.id || team;
          })
          .filter((id) => typeof id === "string");

        console.log("🔧 CoachService: Migrated team IDs:", teamIds);

        // Update the coach document with the correct format
        try {
          const coachRef = doc(db, "coaches", coachUid);
          await updateDoc(coachRef, {
            teams: teamIds,
            updatedAt: new Date(),
          });
          console.log(
            "✅ CoachService: Successfully migrated coach teams array to string format"
          );
          return teamIds;
        } catch (updateError) {
          console.error(
            "🚨 CoachService: Failed to migrate teams array:",
            updateError
          );
          return teamIds; // Return the converted IDs even if update failed
        }
      }

      return teams; // Already in correct format
    } catch (error) {
      console.error("🚨 CoachService: Error getting teams for coach:", error);
      if (error.code === "permission-denied") {
        console.log(
          "💡 Firestore permission denied - coach profile may not exist yet"
        );
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
    const coachRef = doc(db, "coaches", coachUid);

    return onSnapshot(
      coachRef,
      (doc) => {
        if (doc.exists()) {
          const coach = Coach.fromFirestore(doc);
          callback(coach);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Error in coach subscription:", error);
        callback(null);
      }
    );
  }

  /**
   * Subscribe to coaches for a team
   * @param {string} teamId
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  static subscribeToTeamCoaches(teamId, callback) {
    console.log(
      `🔔 CoachService: Setting up subscription for coaches on team ${teamId}`
    );

    // Use array-contains to find coaches who have this teamId in their teams array
    const coachesRef = collection(db, "coaches");
    const q = query(coachesRef, where("teams", "array-contains", teamId));

    return onSnapshot(
      q,
      (snapshot) => {
        console.log(
          `🔔 CoachService: Subscription fired, got ${snapshot.size} coaches for team ${teamId}`
        );

        const coaches = snapshot.docs.map((doc) => {
          const coach = Coach.fromFirestore(doc);
          console.log(
            `🔔 CoachService: Subscription coach ${
              coach.uid
            } (${coach.getDisplayName()}) teams:`,
            coach.teams
          );
          return coach;
        });

        console.log(
          `🔔 CoachService: Subscription returning ${coaches.length} coaches`
        );
        callback(coaches);
      },
      (error) => {
        console.error(
          "🚨 CoachService: Error in team coaches subscription:",
          error
        );
        callback([]);
      }
    );
  }

  /**
   * Update team coach references when coach profile changes
   * @private
   */
  static async updateTeamCoachReferences(coachUid) {
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
      console.error("Error updating team coach references:", error);
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
        console.log(
          "🆕 CoachService: Creating missing coach profile for:",
          authUser.email
        );
        coach = await this.createCoach(authUser);
      }

      return coach;
    } catch (error) {
      console.error("Error ensuring coach profile:", error);
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
      const coachRef = doc(db, "coaches", coachUid);
      await updateDoc(coachRef, {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("🗑️ CoachService: Deactivated coach:", coachUid);
    } catch (error) {
      console.error("Error deactivating coach:", error);
      throw error;
    }
  }
}
