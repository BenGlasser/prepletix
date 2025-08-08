// Coach model for coach-centric data structure
export class Coach {
  constructor(data = {}) {
    this.uid = data.uid || null; // Firebase Auth UID (primary key)
    this.profile = {
      name: data.profile?.name || data.name || "",
      email: data.profile?.email || data.email || "",
      displayName: data.profile?.displayName || data.displayName || "",
      photoURL: data.profile?.photoURL || data.photoURL || null,
    };
    this.teams = data.teams || []; // Array of team IDs (references to /teams/{teamId})
    this.preferences = data.preferences || {
      theme: "system",
      notifications: true,
      emailUpdates: true,
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to Firestore-friendly object
  toFirestore() {
    return {
      profile: this.profile,
      teams: this.teams,
      preferences: this.preferences,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Coach({
      uid: doc.id,
      ...data,
    });
  }

  // Get display name with fallback logic
  getDisplayName() {
    return (
      this.profile.displayName ||
      this.profile.name ||
      this.profile.email?.split("@")[0] ||
      "Unknown Coach"
    );
  }

  // Get initials for avatar fallback
  getInitials() {
    const name = this.getDisplayName();
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Check if coach is on a specific team
  isOnTeam(teamId) {
    return this.teams.includes(teamId);
  }

  // Add team membership
  addTeam(teamId) {
    if (!this.teams.includes(teamId)) {
      this.teams.push(teamId);
      this.updatedAt = new Date();
    }
  }

  // Remove team membership
  removeTeam(teamId) {
    this.teams = this.teams.filter((id) => id !== teamId);
    this.updatedAt = new Date();
  }

  // Get active teams (just returns team IDs - all teams are active)
  getActiveTeams() {
    return this.teams;
  }

  // Update profile information
  updateProfile(profileUpdates) {
    this.profile = {
      ...this.profile,
      ...profileUpdates,
    };
    this.updatedAt = new Date();
  }

  // Update preferences
  updatePreferences(preferenceUpdates) {
    this.preferences = {
      ...this.preferences,
      ...preferenceUpdates,
    };
    this.updatedAt = new Date();
  }

  // Create a coach from Firebase Auth user
  static fromAuthUser(user, additionalData = {}) {
    return new Coach({
      uid: user.uid,
      profile: {
        name: user.displayName || "",
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || null,
      },
      ...additionalData,
    });
  }

  // Export for team membership (minimal data for team documents)
  toTeamReference() {
    return {
      uid: this.uid,
      name: this.getDisplayName(),
      email: this.profile.email,
      photoURL: this.profile.photoURL,
    };
  }

  // Export for legacy compatibility (if needed during migration)
  toLegacyCoachData(teamId) {
    const teamMembership = this.teams.find((team) => team.teamId === teamId);
    return {
      uid: this.uid,
      email: this.profile.email,
      name: this.getDisplayName(),
      photoURL: this.profile.photoURL,
      role: teamMembership?.role || "assistant",
      joinedAt: teamMembership?.joinedAt || this.createdAt,
    };
  }
}
