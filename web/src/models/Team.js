// Team model for Firestore
export class Team {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.season = data.season || {
      year: new Date().getFullYear(),
      period: 'fall' // fall, spring, summer, winter
    };
    this.coaches = data.coaches || []; // array of coach objects with { uid, email, name, role }
    this.invitationCode = data.invitationCode || null; // unique code for inviting coaches
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy || '';
  }

  // Convert to Firestore-friendly object
  toFirestore() {
    return {
      name: this.name,
      season: this.season,
      coaches: this.coaches,
      invitationCode: this.invitationCode,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      createdBy: this.createdBy
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Team({
      id: doc.id,
      ...data
    });
  }

  // Generate a unique invitation code
  static generateInvitationCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Get formatted season display
  getSeasonDisplay() {
    const periodMap = {
      fall: 'Fall',
      spring: 'Spring',
      summer: 'Summer',
      winter: 'Winter'
    };
    return `${periodMap[this.season.period]} ${this.season.year}`;
  }

  // Check if user is a coach on this team
  isCoach(userUid) {
    return this.coaches.some(coach => coach.uid === userUid);
  }

  // Check if user is the head coach (creator)
  isHeadCoach(userUid) {
    return this.createdBy === userUid;
  }

  // Add a coach to the team
  addCoach(coachData) {
    // Check if coach already exists
    if (!this.coaches.some(coach => coach.uid === coachData.uid)) {
      this.coaches.push({
        uid: coachData.uid,
        email: coachData.email,
        name: coachData.name,
        role: coachData.role || 'assistant', // head, assistant
        joinedAt: new Date()
      });
    }
  }

  // Remove a coach from the team
  removeCoach(coachUid) {
    this.coaches = this.coaches.filter(coach => coach.uid !== coachUid);
  }
}

// Team Invitation model
export class TeamInvitation {
  constructor(data = {}) {
    this.id = data.id || null;
    this.teamId = data.teamId || '';
    this.teamName = data.teamName || '';
    this.invitationCode = data.invitationCode || '';
    this.invitedBy = data.invitedBy || ''; // coach uid who sent invitation
    this.invitedByName = data.invitedByName || '';
    this.isUsed = data.isUsed || false;
    this.usedBy = data.usedBy || null; // uid of coach who used the invitation
    this.usedAt = data.usedAt || null;
    this.expiresAt = data.expiresAt || null; // optional expiration date
    this.createdAt = data.createdAt || new Date();
  }

  toFirestore() {
    return {
      teamId: this.teamId,
      teamName: this.teamName,
      invitationCode: this.invitationCode,
      invitedBy: this.invitedBy,
      invitedByName: this.invitedByName,
      isUsed: this.isUsed,
      usedBy: this.usedBy,
      usedAt: this.usedAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new TeamInvitation({
      id: doc.id,
      ...data
    });
  }

  // Check if invitation is valid (not used and not expired)
  isValid() {
    if (this.isUsed) return false;
    if (this.expiresAt && new Date() > this.expiresAt.toDate()) return false;
    return true;
  }

  // Mark invitation as used
  markAsUsed(userUid) {
    this.isUsed = true;
    this.usedBy = userUid;
    this.usedAt = new Date();
  }
}