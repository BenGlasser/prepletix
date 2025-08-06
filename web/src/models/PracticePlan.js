// Practice Plan model for Firestore
export class PracticePlan {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.duration = data.duration || 90; // minutes
    this.focus = data.focus || []; // array of focus areas like 'shooting', 'teamwork', etc.
    this.drills = data.drills || []; // array of DrillSlot objects
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy || '';
  }

  // Convert to Firestore-friendly object
  toFirestore() {
    return {
      title: this.title,
      date: this.date,
      duration: this.duration,
      focus: this.focus,
      drills: this.drills.map(drill => drill.toFirestore ? drill.toFirestore() : drill),
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      createdBy: this.createdBy
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new PracticePlan({
      id: doc.id,
      ...data,
      drills: data.drills?.map(drill => new DrillSlot(drill)) || []
    });
  }
}

// Drill Slot in practice plan
export class DrillSlot {
  constructor(data = {}) {
    this.id = data.id || null;
    this.drillId = data.drillId || '';
    this.drillName = data.drillName || '';
    this.duration = data.duration || 10; // minutes
    this.order = data.order || 0;
    this.notes = data.notes || '';
  }

  toFirestore() {
    return {
      drillId: this.drillId,
      drillName: this.drillName,
      duration: this.duration,
      order: this.order,
      notes: this.notes
    };
  }
}

// Drill library
export class Drill {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.category = data.category || 'general'; // warm-up, shooting, passing, defense, etc.
    this.description = data.description || '';
    this.instructions = data.instructions || '';
    this.duration = data.duration || 10; // default duration in minutes
    this.equipmentNeeded = data.equipmentNeeded || [];
    this.ageGroup = data.ageGroup || 'all'; // U6, U8, U10, U12, all
    this.skillLevel = data.skillLevel || 'beginner'; // beginner, intermediate, advanced
    this.maxPlayers = data.maxPlayers || null;
    this.minPlayers = data.minPlayers || null;
  }

  toFirestore() {
    return {
      name: this.name,
      category: this.category,
      description: this.description,
      instructions: this.instructions,
      duration: this.duration,
      equipmentNeeded: this.equipmentNeeded,
      ageGroup: this.ageGroup,
      skillLevel: this.skillLevel,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Drill({
      id: doc.id,
      ...data
    });
  }
}