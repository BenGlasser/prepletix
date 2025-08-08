import { useState, useEffect, useCallback } from "react";
import { auth, storage } from "../../firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { ArrowLeftIcon, UserIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { CoachService } from "../../services/coachService";

// Profile Avatar Component with Firebase Storage priority and fallback
function ProfileAvatar({ user, size = "h-20 w-20" }) {
  const [photoURL, setPhotoURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadProfilePicture = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // First, try to get the profile picture from Firebase Storage
        const storageRef = ref(storage, `profile-pictures/${user.uid}.jpg`);
        const firebaseURL = await getDownloadURL(storageRef);
        console.log(
          "🍕 ProfileAvatar: Found Firebase Storage photo:",
          firebaseURL
        );
        setPhotoURL(firebaseURL);
      } catch (error) {
        console.log(
          "🍕 ProfileAvatar: No Firebase Storage photo, trying auth photoURL:",
          error.code
        );
        // If not found in Firebase Storage, fall back to auth photoURL
        if (user.photoURL) {
          console.log("🍕 ProfileAvatar: Using auth photoURL:", user.photoURL);
          setPhotoURL(user.photoURL);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfilePicture();
  }, [user?.uid, user?.photoURL]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state
  if (loading) {
    return (
      <div
        className={`${size} rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center`}
      >
        <div className="animate-pulse">
          <UserIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
      </div>
    );
  }

  // Show initials fallback if no photo or image error
  if (!photoURL || imageError) {
    return (
      <div
        className={`${size} rounded-full bg-gradient-to-br from-primary-500 to-primary-600 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center`}
      >
        {user?.displayName || user?.email ? (
          <span className="text-white font-semibold text-lg">
            {getInitials(user.displayName || user.email)}
          </span>
        ) : (
          <UserIcon className="h-8 w-8 text-white" />
        )}
      </div>
    );
  }

  // Show the actual photo
  return (
    <img
      src={photoURL}
      alt={user?.displayName || "User"}
      className={`${size} rounded-full object-cover border-2 border-gray-200 dark:border-gray-600`}
      onError={() => {
        console.log("🍕 ProfileAvatar: Image failed to load:", photoURL);
        setImageError(true);
      }}
    />
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const { theme, setTheme } = useTheme();
  const [user] = useState(auth.currentUser);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveTimeout, setSaveTimeout] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const showMessage = useCallback((text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(""), 3000);
  }, []);

  const debouncedSave = useCallback(
    (field, value) => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(async () => {
        if (!user) return;

        setLoading(true);
        try {
          if (field === "displayName") {
            // Use new CoachService to sync profile data
            const result = await CoachService.syncCoachProfile(user, {
              displayName: value,
            });

            console.log("🔄 Settings: Profile sync result:", result);
            showMessage(
              `Display name updated successfully (synced ${result.updatedRecords} records)`
            );
          }
        } catch (error) {
          console.error("Error updating profile:", error);
          showMessage("Failed to update profile", true);
        } finally {
          setLoading(false);
        }
      }, 500);

      setSaveTimeout(timeout);
    },
    [user, saveTimeout, showMessage]
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "displayName" && value !== user?.displayName) {
      debouncedSave(field, value);
    }
  };

  const handleInputBlur = (field, value) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }

    if (field === "displayName" && value !== user?.displayName) {
      debouncedSave(field, value);
    }
  };

  const handleKeyDown = (e, field, value) => {
    if (e.key === "Enter") {
      e.target.blur();
      handleInputBlur(field, value);
    }
  };

  return (
    <div className="px-6 py-8 min-h-full">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/teams/${teamId}/players`)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to Players"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your account preferences
              </p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.isError
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400"
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Profile Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update your personal information and account details
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <ProfileAvatar user={user} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Profile Picture
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.providerData?.[0]?.providerId === "google.com"
                      ? "Managed by Google Account"
                      : "Upload a new profile picture"}
                  </p>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  onBlur={(e) => handleInputBlur("displayName", e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, "displayName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your display name"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Email address cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Appearance
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Customize how the app looks and feels
              </p>
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Theme Preference
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={theme === "light"}
                      onChange={(e) => setTheme(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Light
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={theme === "dark"}
                      onChange={(e) => setTheme(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Dark
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={theme === "system"}
                      onChange={(e) => setTheme(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      System
                    </span>
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  System will automatically switch between light and dark based
                  on your device settings
                </p>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Account Information
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Details about your account and authentication
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Created
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.metadata?.creationTime
                      ? new Date(
                          user.metadata.creationTime
                        ).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Sign In
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.metadata?.lastSignInTime
                      ? new Date(
                          user.metadata.lastSignInTime
                        ).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Authentication Method
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.providerData?.[0]?.providerId === "google.com"
                      ? "Google Account"
                      : user?.providerData?.[0]?.providerId === "password"
                      ? "Email & Password"
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Verified
                  </label>
                  <p
                    className={`text-sm ${
                      user?.emailVerified
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {user?.emailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Saving...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
