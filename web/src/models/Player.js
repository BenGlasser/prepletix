// Player data model for Firestore
export class Player {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.jerseyNumber = data.jerseyNumber || null;
    this.photoUrl = data.photoUrl || '';
    this.contacts = data.contacts || [];
    this.medicalInfo = data.medicalInfo || {};
    this.notes = data.notes || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to Firestore-friendly object
  toFirestore() {
    return {
      name: this.name,
      jerseyNumber: this.jerseyNumber,
      photoUrl: this.photoUrl,
      contacts: this.contacts.map(contact => ({
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        email: contact.email,
        isPrimary: contact.isPrimary
      })),
      medicalInfo: {
        allergies: this.medicalInfo.allergies || [],
        medications: this.medicalInfo.medications || [],
        conditions: this.medicalInfo.conditions || [],
        emergencyContact: this.medicalInfo.emergencyContact ? {
          name: this.medicalInfo.emergencyContact.name,
          relationship: this.medicalInfo.emergencyContact.relationship,
          phone: this.medicalInfo.emergencyContact.phone,
          email: this.medicalInfo.emergencyContact.email,
          isPrimary: this.medicalInfo.emergencyContact.isPrimary
        } : null,
        physicianName: this.medicalInfo.physicianName || '',
        physicianPhone: this.medicalInfo.physicianPhone || '',
        insuranceProvider: this.medicalInfo.insuranceProvider || '',
        notes: this.medicalInfo.notes || ''
      },
      notes: this.notes.map(note => ({
        id: note.id,
        content: note.content,
        category: note.category,
        isPrivate: note.isPrivate,
        createdAt: note.createdAt,
        createdBy: note.createdBy
      })),
      createdAt: this.createdAt,
      updatedAt: new Date()
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Player({
      id: doc.id,
      ...data
    });
  }
}

// Parent/Guardian Contact model
export class ParentContact {
  constructor(data = {}) {
    this.name = data.name || '';
    this.relationship = data.relationship || 'parent'; // parent, guardian, emergency
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.isPrimary = data.isPrimary || false;
  }
}

// Medical Information model
export class MedicalInfo {
  constructor(data = {}) {
    this.allergies = data.allergies || [];
    this.medications = data.medications || [];
    this.conditions = data.conditions || [];
    this.emergencyContact = data.emergencyContact || new ParentContact();
    this.physicianName = data.physicianName || '';
    this.physicianPhone = data.physicianPhone || '';
    this.insuranceProvider = data.insuranceProvider || '';
    this.notes = data.notes || '';
  }
}

// Coach Note model
export class CoachNote {
  constructor(data = {}) {
    this.id = data.id || null;
    this.content = data.content || '';
    this.category = data.category || 'general'; // general, behavior, skill, medical
    this.isPrivate = data.isPrivate || false;
    this.createdAt = data.createdAt || new Date();
    this.createdBy = data.createdBy || '';
  }
}