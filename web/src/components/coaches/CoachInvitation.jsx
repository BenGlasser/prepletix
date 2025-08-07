import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function CoachInvitation() {
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [invitationCode]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Query for the invitation
      const q = query(
        collection(db, 'coachInvitations'),
        where('invitationCode', '==', invitationCode),
        where('isUsed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Invalid or expired invitation code');
        return;
      }
      
      const invitationDoc = snapshot.docs[0];
      const invitationData = { id: invitationDoc.id, ...invitationDoc.data() };
      
      // Check if invitation is expired
      const expiresAt = invitationData.expiresAt.toDate();
      if (new Date() > expiresAt) {
        setError('This invitation has expired');
        return;
      }
      
      setInvitation(invitationData);
      setEmail(invitationData.invitedEmail);
    } catch (error) {
      console.error('Error loading invitation:', error);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add coach to team
      await acceptInvitation(user);
      
    } catch (error) {
      console.error('Error during signup:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
        setIsExistingUser(true);
      } else {
        setError(error.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);
    
    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add coach to team
      await acceptInvitation(user);
      
    } catch (error) {
      console.error('Error during signin:', error);
      setError('Invalid email or password');
    } finally {
      setProcessing(false);
    }
  };

  const acceptInvitation = async (user) => {
    try {
      // Add coach to team
      const coachesRef = collection(db, 'teams', invitation.teamId, 'coaches');
      await addDoc(coachesRef, {
        email: invitation.invitedEmail,
        name: invitation.invitedName,
        createdAt: new Date(),
        addedBy: invitation.invitedBy,
        addedByName: invitation.invitedByName,
        joinedAt: new Date(),
        userId: user.uid
      });
      
      // Mark invitation as used
      const invitationRef = doc(db, 'coachInvitations', invitation.id);
      await updateDoc(invitationRef, {
        isUsed: true,
        usedAt: new Date(),
        usedBy: user.uid
      });
      
      setSuccess(true);
      
      // Redirect to coaches page after 2 seconds
      setTimeout(() => {
        navigate(`/teams/${invitation.teamId}/coaches`);
      }, 2000);
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to join team. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="text-gray-500 dark:text-gray-400">Loading invitation...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to the Team!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You have successfully joined <strong>{invitation.teamName}</strong> as a coach.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to coaches page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/favicon_io/android-chrome-512x512.png"
              alt="Prepletix Logo"
              className="w-16 h-16 rounded-2xl object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Join {invitation.teamName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You've been invited by <strong>{invitation.invitedByName}</strong> to join their coaching team.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isExistingUser ? 'Sign in to your account' : 'Create your account'} to continue.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            {error.includes('already exists') && !isExistingUser && (
              <button
                onClick={() => setIsExistingUser(true)}
                className="text-red-600 dark:text-red-400 underline text-sm mt-2"
              >
                Sign in instead
              </button>
            )}
          </div>
        )}

        <form onSubmit={isExistingUser ? handleSignIn : handleSignUp} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder={isExistingUser ? "Enter your password" : "Create a password (min 6 characters)"}
              required
            />
          </div>

          {!isExistingUser && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {processing ? 'Processing...' : (isExistingUser ? 'Sign In & Join Team' : 'Create Account & Join Team')}
          </button>

          {!isExistingUser && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsExistingUser(true)}
                className="text-primary-600 hover:text-primary-500 text-sm"
              >
                Already have an account? Sign in
              </button>
            </div>
          )}

          {isExistingUser && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsExistingUser(false)}
                className="text-primary-600 hover:text-primary-500 text-sm"
              >
                Don't have an account? Create one
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}