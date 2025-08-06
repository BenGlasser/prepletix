import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Player, ParentContact, MedicalInfo } from '../models/Player';
import { Drill } from '../models/PracticePlan';

// Sample player data for testing
const samplePlayers = [
  {
    name: 'Alex Thompson',
    jerseyNumber: 1,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Sarah Thompson',
        relationship: 'mother',
        phone: '(555) 123-4567',
        email: 'sarah.thompson@email.com',
        isPrimary: true
      }),
      new ParentContact({
        name: 'Mike Thompson',
        relationship: 'father',
        phone: '(555) 123-4568',
        email: 'mike.thompson@email.com',
        isPrimary: false
      })
    ],
    medicalInfo: new MedicalInfo({
      allergies: ['Peanuts'],
      medications: [],
      conditions: [],
      emergencyContact: new ParentContact({
        name: 'Sarah Thompson',
        phone: '(555) 123-4567'
      })
    }),
    notes: []
  },
  {
    name: 'Emma Rodriguez',
    jerseyNumber: 2,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Maria Rodriguez',
        relationship: 'mother',
        phone: '(555) 234-5678',
        email: 'maria.rodriguez@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  },
  {
    name: 'Liam Johnson',
    jerseyNumber: 3,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Jennifer Johnson',
        relationship: 'mother',
        phone: '(555) 345-6789',
        email: 'jen.johnson@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({
      medications: ['Inhaler for asthma'],
      conditions: ['Mild asthma']
    }),
    notes: []
  },
  {
    name: 'Sophia Chen',
    jerseyNumber: 4,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'David Chen',
        relationship: 'father',
        phone: '(555) 456-7890',
        email: 'david.chen@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  },
  {
    name: 'Noah Williams',
    jerseyNumber: 5,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Lisa Williams',
        relationship: 'mother',
        phone: '(555) 567-8901',
        email: 'lisa.williams@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  },
  {
    name: 'Ava Davis',
    jerseyNumber: 6,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Robert Davis',
        relationship: 'father',
        phone: '(555) 678-9012',
        email: 'rob.davis@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  },
  {
    name: 'Mason Brown',
    jerseyNumber: 7,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Amanda Brown',
        relationship: 'mother',
        phone: '(555) 789-0123',
        email: 'amanda.brown@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  },
  {
    name: 'Isabella Garcia',
    jerseyNumber: 8,
    photoUrl: '',
    contacts: [
      new ParentContact({
        name: 'Carlos Garcia',
        relationship: 'father',
        phone: '(555) 890-1234',
        email: 'carlos.garcia@email.com',
        isPrimary: true
      })
    ],
    medicalInfo: new MedicalInfo({}),
    notes: []
  }
];

// Sample drill data
const sampleDrills = [
  new Drill({
    name: 'Warm-up Jog',
    category: 'warm-up',
    description: 'Light jogging to warm up muscles',
    instructions: '2 laps around the field at moderate pace',
    duration: 5,
    equipmentNeeded: [],
    ageGroup: 'all',
    skillLevel: 'beginner'
  }),
  new Drill({
    name: 'Stick Skills',
    category: 'fundamentals',
    description: 'Basic stick handling and ball control',
    instructions: 'Players practice catching, throwing, and cradling',
    duration: 15,
    equipmentNeeded: ['lacrosse stick', 'ball'],
    ageGroup: 'all',
    skillLevel: 'beginner'
  }),
  new Drill({
    name: 'Passing Circle',
    category: 'passing',
    description: 'Players form a circle and practice passing',
    instructions: 'Form circle, pass clockwise, then counterclockwise',
    duration: 10,
    equipmentNeeded: ['lacrosse stick', 'ball'],
    ageGroup: 'all',
    skillLevel: 'beginner'
  }),
  new Drill({
    name: 'Shooting Practice',
    category: 'shooting',
    description: 'Basic shooting technique and accuracy',
    instructions: 'Line up 10 yards from goal, take turns shooting',
    duration: 15,
    equipmentNeeded: ['lacrosse stick', 'ball', 'goal'],
    ageGroup: 'all',
    skillLevel: 'beginner'
  }),
  new Drill({
    name: '1v1 Ground Ball',
    category: 'groundball',
    description: 'Competition for ground balls',
    instructions: 'Roll ball out, two players compete to pick it up',
    duration: 10,
    equipmentNeeded: ['lacrosse stick', 'ball'],
    ageGroup: 'U10',
    skillLevel: 'intermediate'
  })
];

// Function to seed players
export async function seedPlayers() {
  console.log('Seeding players...');
  const playersCollection = collection(db, 'players');
  
  try {
    for (const playerData of samplePlayers) {
      const player = new Player(playerData);
      await addDoc(playersCollection, player.toFirestore());
    }
    console.log('Players seeded successfully!');
  } catch (error) {
    console.error('Error seeding players:', error);
  }
}

// Function to seed drills
export async function seedDrills() {
  console.log('Seeding drills...');
  const drillsCollection = collection(db, 'drills');
  
  try {
    for (const drill of sampleDrills) {
      await addDoc(drillsCollection, drill.toFirestore());
    }
    console.log('Drills seeded successfully!');
  } catch (error) {
    console.error('Error seeding drills:', error);
  }
}

// Function to seed all data
export async function seedAllData() {
  await seedPlayers();
  await seedDrills();
  console.log('All seed data added successfully!');
}