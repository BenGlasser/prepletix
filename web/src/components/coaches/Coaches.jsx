import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { useTeam } from "../../contexts/TeamContext";
import {
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

// Generate a consistent color for each user based on their email
const getUserColor = (email) => {
  if (!email) return "bg-gray-500";

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-teal-500",
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
};

// Generate invitation code
const generateInvitationCode = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Function to download profile picture and upload to Firebase Storage
const uploadProfilePictureToStorage = async (photoURL, userId) => {
  if (!photoURL) return null;
  
  try {
    // Download the image from Google
    const response = await fetch(photoURL);
    if (!response.ok) {
      console.warn("Failed to fetch profile picture:", response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    
    // Create a reference to store the image in Firebase Storage
    const imageRef = ref(storage, `profile-pictures/${userId}.jpg`);
    
    // Upload the image
    await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(imageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile picture to storage:", error);
    return null;
  }
};

export default function Coaches() {
  const { user } = useAuth();
  const { teamId } = useParams();
  const { createInvitation } = useTeam();
  const [currentTeam, setCurrentTeam] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newCoachEmail, setNewCoachEmail] = useState("");
  const [newCoachName, setNewCoachName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const messagesEndRef = useRef(null);

  // Load team data from URL param
  useEffect(() => {
    if (teamId) {
      const loadTeam = async () => {
        try {
          const teamDoc = await getDoc(doc(db, "teams", teamId));
          if (teamDoc.exists()) {
            setCurrentTeam({ id: teamDoc.id, ...teamDoc.data() });
          }
        } catch (error) {
          console.error("Error loading team:", error);
        }
      };
      loadTeam();
    }
  }, [teamId]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-add current user as coach
  const ensureCurrentUserAsCoach = useCallback(async () => {
    if (!teamId || !user) return;

    try {
      const coachesRef = collection(db, "teams", teamId, "coaches");
      const q = query(
        coachesRef,
        where("email", "==", user.email.toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Upload profile picture to Firebase Storage if available
        const uploadedPhotoURL = await uploadProfilePictureToStorage(user.photoURL, user.uid);
        
        // Current user is not in coaches list, add them
        await addDoc(coachesRef, {
          email: user.email.toLowerCase(),
          name: user.displayName || user.email.split("@")[0],
          createdAt: new Date(),
          addedBy: user.uid,
          addedByName: user.displayName || user.email,
          isOwner: true, // Mark as team owner/creator
          photoURL: uploadedPhotoURL, // Use uploaded Storage URL
        });
      }
    } catch (error) {
      console.error("Error ensuring current user as coach:", error);
    }
  }, [teamId, user]);

  // Load coaches when team is available
  useEffect(() => {
    if (teamId) {
      // First ensure current user is added as coach
      ensureCurrentUserAsCoach();

      const coachesRef = collection(db, "teams", teamId, "coaches");
      const q = query(coachesRef, orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const coachesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCoaches(coachesData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching coaches:", error);
          setLoading(false);
        }
      );

      return unsubscribe;
    }
  }, [teamId, ensureCurrentUserAsCoach]);

  // Load messages when team is available
  useEffect(() => {
    if (teamId) {
      const messagesRef = collection(db, "teams", teamId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messagesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(messagesData);
        },
        (error) => {
          console.error("Error fetching messages:", error);
        }
      );

      return unsubscribe;
    }
  }, [teamId]);

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    if (!newCoachEmail.trim() || !newCoachName.trim() || !teamId) return;

    setCreatingInvite(true);
    try {
      console.log("🎫 Creating invitation via TeamService...");
      
      // Use the proper TeamService createInvitation method
      const invitation = await createInvitation(teamId);
      
      // Generate the invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/coaches/join/${invitation.invitationCode}`;
      setInvitationLink(link);

      setNewCoachEmail("");
      setNewCoachName("");
      
      console.log("✅ Invitation created successfully:", invitation);
    } catch (error) {
      console.error("Error creating coach invitation:", error);
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const closeInvitationModal = () => {
    setInvitationLink("");
    setLinkCopied(false);
    setShowAddCoach(false);
  };

  const handleRemoveCoach = async (coachId) => {
    if (!teamId) return;

    try {
      await deleteDoc(doc(db, "teams", teamId, "coaches", coachId));
    } catch (error) {
      console.error("Error removing coach:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !teamId) return;

    try {
      // Find the current user's coach record to get their saved photo
      const currentUserCoach = coaches.find(coach => coach.userId === user.uid);
      
      const messagesRef = collection(db, "teams", teamId, "messages");
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        createdAt: new Date(),
        userId: user.uid,
        userEmail: user.email,
        userName: currentUserCoach?.name || user.displayName || user.email?.split("@")[0] || "User",
        userPhotoURL: currentUserCoach?.photoURL || user.photoURL || null,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Don't show loading screens or redirect - just show the page structure
  // Content will populate when team data is available

  return (
    !loading && (
      <div className="px-6 py-8 min-h-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Coaches
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage coaching staff and team communication
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coaches List */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Coaching Staff ({coaches.length})
                  </h2>
                  <button
                    onClick={() => setShowAddCoach(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Add Coach"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4">
                  {!teamId && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Please select a team to manage coaches</p>
                    </div>
                  )}

                  {/* Add Coach Form */}
                  {teamId && showAddCoach && !invitationLink && (
                    <form
                      onSubmit={handleCreateInvitation}
                      className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newCoachName}
                          onChange={(e) => setNewCoachName(e.target.value)}
                          placeholder="Coach name"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                          required
                        />
                        <input
                          type="email"
                          value={newCoachEmail}
                          onChange={(e) => setNewCoachEmail(e.target.value)}
                          placeholder="Coach email"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                          required
                        />
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={creatingInvite}
                            className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                          >
                            {creatingInvite
                              ? "Creating..."
                              : "Create Invitation"}
                          </button>
                          <button
                            type="button"
                            onClick={closeInvitationModal}
                            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Invitation Link Display */}
                  {invitationLink && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-medium text-green-900 dark:text-green-100">
                            Invitation Created!
                          </h3>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Share this link with the new coach. They can click it
                          to join your team automatically.
                        </p>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={invitationLink}
                            readOnly
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-md text-sm text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={copyInvitationLink}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            {linkCopied ? (
                              <>
                                <CheckIcon className="h-4 w-4" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <ClipboardDocumentIcon className="h-4 w-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={closeInvitationModal}
                          className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Coaches List */}
                  {teamId && (
                    <div className="space-y-2">
                      {coaches.map((coach) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center space-x-3">
                            {coach.photoURL ? (
                              <img
                                src={coach.photoURL}
                                alt={coach.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 ${getUserColor(
                                  coach.email
                                )} rounded-full flex items-center justify-center text-white text-sm font-semibold`}
                              >
                                {coach.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {coach.name}
                                {coach.isOwner && (
                                  <span className="ml-1 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {coach.email}
                              </div>
                            </div>
                          </div>
                          {coach.email !== user.email && !coach.isOwner && (
                            <button
                              onClick={() => handleRemoveCoach(coach.id)}
                              className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove Coach"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      {coaches.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>No coaches added yet.</p>
                          <button
                            onClick={() => setShowAddCoach(true)}
                            className="text-primary-600 hover:text-primary-700 text-sm mt-2"
                          >
                            Add your first coach
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message Board */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm h-[600px] flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Team Chat
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Communicate with your coaching team
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!teamId && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p>Please select a team to access team chat</p>
                    </div>
                  )}

                  {teamId &&
                    messages.map((message) => {
                      const isOwnMessage = message.userId === user.uid;
                      const userColor = getUserColor(message.userEmail);

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md ${
                              isOwnMessage ? "order-2" : "order-1"
                            }`}
                          >
                            <div
                              className={`flex items-end space-x-2 ${
                                isOwnMessage
                                  ? "flex-row-reverse space-x-reverse"
                                  : ""
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {message.userPhotoURL ? (
                                  <img
                                    src={message.userPhotoURL}
                                    alt={message.userName}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className={`w-6 h-6 ${userColor} rounded-full flex items-center justify-center`}
                                  >
                                    <span className="text-white text-xs font-semibold">
                                      {message.userName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div
                                className={`${
                                  isOwnMessage
                                    ? "bg-primary-600 text-white"
                                    : `${userColor.replace(
                                        "bg-",
                                        "bg-"
                                      )} text-white`
                                } rounded-lg px-3 py-2 max-w-full`}
                              >
                                <div className="text-sm break-words">
                                  {message.text}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`text-xs text-gray-500 dark:text-gray-400 mt-1 px-2 ${
                                isOwnMessage ? "text-right" : "text-left"
                              }`}
                            >
                              {isOwnMessage ? "You" : message.userName} •{" "}
                              {message.createdAt?.toDate
                                ? message.createdAt
                                    .toDate()
                                    .toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                : "now"}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {teamId && messages.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p>No messages yet.</p>
                      <p className="text-sm mt-1">Start the conversation!</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={
                        teamId ? "Type a message..." : "Select a team to chat"
                      }
                      disabled={!teamId}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || !teamId}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
}
