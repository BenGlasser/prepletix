import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../firebase';

// Function to download and upload profile picture
const uploadProfilePictureToStorage = async (photoURL, userId) => {
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
};

export default function ProfileMigration() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runMigration = async () => {
    if (!user) {
      setStatus('No authenticated user');
      return;
    }

    if (user.email.toLowerCase() !== 'brglasser@gmail.com') {
      setStatus(`Current user (${user.email}) is not brglasser@gmail.com`);
      return;
    }

    setIsRunning(true);
    setStatus('Starting migration...');

    try {
      console.log('Current user:', user);
      console.log('Current user photoURL:', user.photoURL);

      if (!user.photoURL) {
        setStatus('User has no profile picture to migrate');
        setIsRunning(false);
        return;
      }

      setStatus('Uploading profile picture to Firebase Storage...');
      
      // Upload the profile picture to Storage
      const uploadedPhotoURL = await uploadProfilePictureToStorage(user.photoURL, user.uid);

      if (!uploadedPhotoURL) {
        setStatus('Failed to upload profile picture');
        setIsRunning(false);
        return;
      }

      setStatus('Searching for coach records to update...');

      // Find all coach records for this user across all teams
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      console.log(`Found ${teamsSnapshot.size} teams to check`);

      let updatedRecords = 0;

      for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();
        
        // Check coaches in this team
        const coachesRef = collection(db, 'teams', teamId, 'coaches');
        const coachQuery = query(coachesRef, where('userId', '==', user.uid));
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

      setStatus(`Migration complete! Updated ${updatedRecords} coach records. New Storage URL: ${uploadedPhotoURL}`);

    } catch (error) {
      console.error('Migration failed:', error);
      setStatus(`Migration failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
      <h2 className="text-xl font-bold mb-4">Profile Picture Migration</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        This will download the Google profile picture for brglasser@gmail.com and upload it to Firebase Storage,
        then update all coach records to use the new URL.
      </p>
      
      {user && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <p><strong>Current User:</strong> {user.email}</p>
          <p><strong>Has Photo:</strong> {user.photoURL ? 'Yes' : 'No'}</p>
          {user.photoURL && (
            <div className="mt-2">
              <img src={user.photoURL} alt="Current" className="w-12 h-12 rounded-full" />
            </div>
          )}
        </div>
      )}

      {status && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded">
          <p className="text-blue-800 dark:text-blue-200">{status}</p>
        </div>
      )}

      <button
        onClick={runMigration}
        disabled={isRunning || !user || user.email.toLowerCase() !== 'brglasser@gmail.com'}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? 'Running Migration...' : 'Run Migration'}
      </button>
    </div>
  );
}