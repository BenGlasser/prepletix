// Migration script to fix team membership for invited coaches
// This script adds missing coaches to teams they should belong to

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase config (same as in your app)
const firebaseConfig = {
  apiKey: "AIzaSyCsKFebvW1Xy7BV5XR37UCKEZID3LYzXsk",
  authDomain: "prepletix.firebaseapp.com",
  projectId: "prepletix",
  storageBucket: "prepletix.firebasestorage.app",
  messagingSenderId: "881317585520",
  appId: "1:881317585520:web:9034e8de4bcc9805a30ab5",
  measurementId: "G-X3VMVRRLVS",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configuration for missing coach memberships
const MISSING_MEMBERSHIPS = [
  {
    teamId: 'ZQYrVVZjdPA8f6gyAMTm', // Eagles team
    teamName: 'Eagles',
    coachUid: 'ZXybSlsXCFUpGhAJRoscLxOIJ3y1',
    coachEmail: 'invited-coach@example.com', // Update with actual email
    coachName: 'Invited Coach', // Update with actual name
    role: 'assistant'
  }
  // Add more missing memberships here if needed
];

// Function to add a coach to a team
async function addCoachToTeam(teamId, teamName, coachData) {
  try {
    console.log(`Adding coach ${coachData.name} (${coachData.uid}) to team "${teamName}"...`);
    
    // Get the current team document
    const teamRef = doc(db, 'teams', teamId);
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const teamDoc = teamsSnapshot.docs.find(doc => doc.id === teamId);
    
    if (!teamDoc) {
      console.error(`Team ${teamId} not found`);
      return false;
    }
    
    const teamData = teamDoc.data();
    const currentCoaches = teamData.coaches || [];
    
    // Check if coach is already in the team
    const existingCoach = currentCoaches.find(coach => coach.uid === coachData.uid);
    if (existingCoach) {
      console.log(`Coach ${coachData.name} is already a member of team "${teamName}"`);
      return false;
    }
    
    // Add the coach to the coaches array
    const updatedCoaches = [
      ...currentCoaches,
      {
        uid: coachData.uid,
        email: coachData.email,
        name: coachData.name,
        role: coachData.role,
        joinedAt: new Date()
      }
    ];
    
    // Update the team document
    await updateDoc(teamRef, {
      coaches: updatedCoaches,
      updatedAt: new Date()
    });
    
    console.log(`✅ Successfully added coach ${coachData.name} to team "${teamName}"`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error adding coach to team "${teamName}":`, error);
    return false;
  }
}

// Main migration function
async function fixTeamMemberships() {
  try {
    console.log('🚀 Starting team membership fix migration...');
    console.log(`Found ${MISSING_MEMBERSHIPS.length} missing memberships to fix`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const membership of MISSING_MEMBERSHIPS) {
      const result = await addCoachToTeam(
        membership.teamId,
        membership.teamName,
        {
          uid: membership.coachUid,
          email: membership.coachEmail,
          name: membership.coachName,
          role: membership.role
        }
      );
      
      if (result === true) {
        successCount++;
      } else if (result === false) {
        skipCount++;
      } else {
        errorCount++;
      }
      
      // Add a small delay between operations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully added: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${MISSING_MEMBERSHIPS.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 The invited coaches should now be able to see their teams in the dropdown.');
      console.log('🔄 Refresh the web application to see the changes.');
    } else {
      console.log('\n⚠️  No changes were made. All coaches may already be properly assigned to their teams.');
    }
    
  } catch (error) {
    console.error('💥 Migration failed with error:', error);
  }
}

// Function to list current team memberships (for debugging)
async function listCurrentMemberships() {
  try {
    console.log('\n📋 Current Team Memberships:');
    
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const coaches = teamData.coaches || [];
      
      console.log(`\n🏆 Team: "${teamData.name}" (${teamDoc.id})`);
      console.log(`👥 Coaches (${coaches.length}):`);
      
      if (coaches.length === 0) {
        console.log('   (No coaches)');
      } else {
        coaches.forEach((coach, index) => {
          console.log(`   ${index + 1}. ${coach.name} (${coach.email}) - ${coach.role}`);
          console.log(`      UID: ${coach.uid}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error listing memberships:', error);
  }
}

// Run the migration when script loads
console.log('🔧 Team Membership Fix Migration Script');
console.log('This script will add missing coaches to teams they should belong to.');

// Wait for auth state to be ready
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('🔐 Authenticated as:', user.email);
    
    // Show current state first
    await listCurrentMemberships();
    
    // Ask for confirmation before running migration
    console.log('\n⚠️  This migration will modify team data in Firestore.');
    console.log('📝 Review the missing memberships configuration above.');
    console.log('🚀 Run fixTeamMemberships() to proceed with the migration.');
    console.log('📋 Run listCurrentMemberships() to check current state again.');
    
    // Make functions available globally for manual execution
    window.fixTeamMemberships = fixTeamMemberships;
    window.listCurrentMemberships = listCurrentMemberships;
    
  } else {
    console.log('🔑 Not authenticated. Please sign in first.');
    console.log('👉 Go to your web app and sign in, then run this script.');
  }
});