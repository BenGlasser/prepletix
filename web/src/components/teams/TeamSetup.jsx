import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../../contexts/TeamContext';
import TeamForm from './TeamForm';
import { 
  UserGroupIcon, 
  PlusIcon, 
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function TeamSetup() {
  console.log('🍕 TeamSetup rendering - WHY?!', { currentPath: window.location.pathname });
  const { invitationCode } = useParams();
  const navigate = useNavigate();
  const { teams, joinTeamWithInvitation, loading, error, currentTeam } = useTeam();
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState('checking'); // checking, valid, invalid, used
  const [manualInvitationCode, setManualInvitationCode] = useState('');
  const [showInvitationInput, setShowInvitationInput] = useState(false);

  // Check invitation validity if we have an invitation code
  useEffect(() => {
    if (invitationCode) {
      checkInvitation();
    }
  }, [invitationCode]);

  // Redirect to players if user already has teams and no invitation
  useEffect(() => {
    if (!loading && teams.length > 0 && !invitationCode && currentTeam) {
      console.log('🍕 TeamSetup auto-redirecting to players!', { 
        currentTeam: currentTeam.id, 
        redirectTo: `/teams/${currentTeam.id}/players`,
        stackTrace: new Error().stack 
      });
      navigate(`/teams/${currentTeam.id}/players`);
    }
  }, [loading, teams, invitationCode, navigate, currentTeam]);

  const checkInvitation = async () => {
    try {
      setInvitationStatus('checking');
      // This would need to be implemented in the team service
      // For now, we'll assume the invitation is valid
      setInvitationStatus('valid');
    } catch (error) {
      console.error('Error checking invitation:', error);
      setInvitationStatus('invalid');
    }
  };

  const handleJoinTeam = async () => {
    try {
      const team = await joinTeamWithInvitation(invitationCode);
      setInvitationStatus('used');
      setTimeout(() => {
        navigate(`/teams/${team.id}/players`);
      }, 2000);
    } catch {
      setInvitationStatus('invalid');
    }
  };

  const handleCreateTeam = () => {
    setShowTeamForm(true);
  };

  const handleTeamCreated = (team) => {
    setShowTeamForm(false);
    navigate(`/teams/${team.id}/players`);
  };

  const handleManualInvitationSubmit = async () => {
    if (!manualInvitationCode.trim()) return;
    
    try {
      const team = await joinTeamWithInvitation(manualInvitationCode.trim());
      navigate(`/teams/${team.id}/players`);
    } catch {
      // Error will be shown via the error state from useTeam
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show invitation handling UI
  if (invitationCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
            {invitationStatus === 'checking' && (
              <>
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Checking Invitation
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we verify your invitation...
                </p>
              </>
            )}

            {invitationStatus === 'valid' && (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserGroupIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  You're Invited!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You've been invited to join a coaching team. Click below to accept the invitation.
                </p>
                <button
                  onClick={handleJoinTeam}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                >
                  Join Team
                </button>
              </>
            )}

            {invitationStatus === 'invalid' && (
              <>
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Invalid Invitation
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  This invitation code is invalid or has expired. Please contact the coach who sent you the invitation.
                </p>
                <button
                  onClick={handleCreateTeam}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                >
                  Create Your Own Team
                </button>
              </>
            )}

            {invitationStatus === 'used' && (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to the Team!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  You've successfully joined the team. Redirecting you to the dashboard...
                </p>
              </>
            )}

            {error && (
              <div className="mt-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 text-red-800 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show team creation UI for users with no teams
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserGroupIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Prepletix
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            To get started, you'll need to create a team or join an existing one with an invitation code.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleCreateTeam}
              className="w-full flex items-center justify-center space-x-3 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create New Team</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowInvitationInput(!showInvitationInput)}
              className="w-full flex items-center justify-center space-x-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium transition-colors"
            >
              <LinkIcon className="w-5 h-5" />
              <span>Join with Invitation Code</span>
            </button>

            {showInvitationInput && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={manualInvitationCode}
                    onChange={(e) => setManualInvitationCode(e.target.value)}
                    placeholder="Enter invitation code..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <button
                  onClick={handleManualInvitationSubmit}
                  disabled={!manualInvitationCode.trim() || loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Join Team'
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 text-red-800 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {showTeamForm && (
        <TeamForm onClose={handleTeamCreated} />
      )}
    </div>
  );
}