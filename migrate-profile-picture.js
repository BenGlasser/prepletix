// Migration script to download and store profile picture for existing user
// Run this in the browser console or as a Node.js script

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storage = getStorage(app);

// Function to download and upload profile picture
async function uploadProfilePictureToStorage(photoURL, userId) {
  if (!photoURL) return null;
  
  try {
    console.log('Downloading profile picture from:', photoURL);
    
    // Download the image
    const response = await fetch(photoURL);
    if (!response.ok) {
      console.warn("Failed to fetch profile picture:", response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    console.log('Downloaded blob size:', blob.size, 'bytes');
    
    // Create a reference to store the image
    const imageRef = ref(storage, `profile-pictures/${userId}.jpg`);
    
    // Upload the image
    console.log('Uploading to Firebase Storage...');
    await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(imageRef);
    console.log('Upload successful! Storage URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile picture to storage:", error);
    return null;
  }
}

// Migration function for specific user
async function migrateUserProfilePicture(userEmail) {
  try {
    console.log(`Starting migration for user: ${userEmail}`);
    
    // Get current auth user to check if they match
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user. Please sign in first.');
      return;
    }
    
    if (currentUser.email.toLowerCase() !== userEmail.toLowerCase()) {
      console.error(`Current user (${currentUser.email}) does not match target user (${userEmail})`);
      return;
    }
    
    console.log('Current user photoURL:', currentUser.photoURL);
    
    if (!currentUser.photoURL) {
      console.log('User has no profile picture to migrate');
      return;
    }
    
    // Upload the profile picture to Storage
    const uploadedPhotoURL = await uploadProfilePictureToStorage(currentUser.photoURL, currentUser.uid);
    
    if (!uploadedPhotoURL) {
      console.error('Failed to upload profile picture');
      return;
    }
    
    // Find all coach records for this user across all teams
    console.log('Searching for coach records...');
    
    // We need to query all teams and their coaches subcollections
    // This is a bit complex with Firestore's structure, so we'll use a different approach
    
    // Get all teams
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    console.log(`Found ${teamsSnapshot.size} teams to check`);
    
    let updatedRecords = 0;
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamId = teamDoc.id;
      const teamData = teamDoc.data();
      
      // Check coaches in this team
      const coachesRef = collection(db, 'teams', teamId, 'coaches');
      const coachQuery = query(coachesRef, where('userId', '==', currentUser.uid));
      const coachSnapshot = await getDocs(coachQuery);
      
      for (const coachDoc of coachSnapshot.docs) {
        const coachData = coachDoc.data();
        console.log(`Found coach record in team "${teamData.name}":`, coachData);
        
        // Update the coach record with the new photoURL
        await updateDoc(doc(db, 'teams', teamId, 'coaches', coachDoc.id), {
          photoURL: uploadedPhotoURL
        });
        
        console.log(`Updated coach record in team "${teamData.name}"`);
        updatedRecords++;
      }
    }
    
    console.log(`Migration complete! Updated ${updatedRecords} coach records.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
console.log('Profile Picture Migration Script');
console.log('Make sure you are signed in as brglasser@gmail.com');

// Wait for auth state to be ready
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Authenticated as:', user.email);
    if (user.email.toLowerCase() === 'brglasser@gmail.com') {
      migrateUserProfilePicture('brglasser@gmail.com');
    } else {
      console.error('Please sign in as brglasser@gmail.com to run this migration');
    }
  } else {
    console.log('Not authenticated. Please sign in first.');
  }
});