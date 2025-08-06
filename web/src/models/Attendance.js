// Attendance record model for Firestore
export class AttendanceRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.playerId = data.playerId || '';
    this.date = data.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    this.eventType = data.eventType || 'practice'; // practice, game
    this.status = data.status || 'present'; // present, absent, late, left_early
    this.note = data.note || '';
    this.timestamp = data.timestamp || new Date();
  }

  // Convert to Firestore-friendly object
  toFirestore() {
    return {
      playerId: this.playerId,
      date: this.date,
      eventType: this.eventType,
      status: this.status,
      note: this.note,
      timestamp: this.timestamp
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new AttendanceRecord({
      id: doc.id,
      ...data
    });
  }
}

// Attendance status options
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  LEFT_EARLY: 'left_early'
};

// Event types
export const EVENT_TYPES = {
  PRACTICE: 'practice',
  GAME: 'game'
};