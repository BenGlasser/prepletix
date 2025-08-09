import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { AttendanceRecord } from "../../models/Attendance";
import {
  uploadPlayerPhoto,
  compressImage,
  deletePlayerPhoto,
} from "../../utils/photoUpload";
import PhotoSelectionModal from "../ui/PhotoSelectionModal";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Checkbox from "../ui/Checkbox";
import {
  PhoneIcon,
  HeartIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CameraIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  UserIcon,
  HashtagIcon,
  EnvelopeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function PlayerProfile({ player, onClose, onDelete }) {
  const [openSections, setOpenSections] = useState(new Set([])); // Start with all cards closed
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ category: "general", content: "" });
  const [playerNotes, setPlayerNotes] = useState(player.notes || []);
  const accordionRefs = useRef({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(player.photoUrl);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Form data state for inline editing
  const [formData, setFormData] = useState({
    name: player.name || "",
    jerseyNumber: player.jerseyNumber || "",
    photoUrl: player.photoUrl || "",
    contacts: player.contacts?.length > 0 ? player.contacts : [],
    medicalInfo: player.medicalInfo || {
      allergies: [],
      medications: [],
      notes: "",
    },
    notes: player.notes || [],
  });

  // Auto-save functionality similar to PlayerForm
  const savePlayerData = useCallback(
    async (updatedData = formData) => {
      try {
        // Helper function to deeply clean undefined values
        const cleanObject = (obj) => {
          if (obj === null || obj === undefined) return null;
          if (Array.isArray(obj)) {
            return obj
              .filter(
                (item) => item !== undefined && item !== null && item !== ""
              )
              .map((item) => cleanObject(item));
          }
          if (typeof obj === "object" && obj instanceof Date) {
            return obj;
          }
          if (typeof obj === "object") {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
              if (value !== undefined) {
                cleaned[key] = cleanObject(value);
              }
            }
            return cleaned;
          }
          return obj;
        };

        // Create completely sanitized Firestore data object
        const firestoreData = {
          teamId: player.teamId,
          name: updatedData.name || "",
          jerseyNumber: updatedData.jerseyNumber
            ? parseInt(updatedData.jerseyNumber)
            : null,
          photoUrl: updatedData.photoUrl || "",
          contacts: (updatedData.contacts || [])
            .filter(
              (contact) =>
                contact && (contact.name || contact.phone || contact.email)
            )
            .map((contact) => ({
              name: contact.name || "",
              relationship: contact.relationship || "parent",
              phone: contact.phone || "",
              email: contact.email || "",
              isPrimary: Boolean(contact.isPrimary),
            })),
          medicalInfo: {
            allergies: (updatedData.medicalInfo?.allergies || []).filter(
              (item) => item && typeof item === "string" && item.trim() !== ""
            ),
            medications: (updatedData.medicalInfo?.medications || []).filter(
              (item) => item && typeof item === "string" && item.trim() !== ""
            ),
            conditions: [],
            emergencyContact: null,
            physicianName: "",
            physicianPhone: "",
            insuranceProvider: "",
            notes: updatedData.medicalInfo?.notes || "",
          },
          notes: (updatedData.notes || [])
            .filter((note) => note && note.content)
            .map((note) => ({
              id: note.id || "",
              content: note.content || "",
              category: note.category || "general",
              isPrivate: Boolean(note.isPrivate),
              createdAt: note.createdAt || new Date(),
              createdBy: note.createdBy || "",
            })),
          createdAt: player.createdAt || new Date(),
          updatedAt: new Date(),
        };

        // Apply deep cleaning to remove any remaining undefined values
        const cleanFirestoreData = cleanObject(firestoreData);

        // Update existing player
        await updateDoc(doc(db, "players", player.id), cleanFirestoreData);

        // Update local player object for other components
        Object.assign(player, cleanFirestoreData);
      } catch (error) {
        console.error("Error saving player:", error);
      }
    },
    [player, formData]
  );

  const debouncedSave = useCallback(
    (updatedData) => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      const timeout = setTimeout(() => {
        savePlayerData(updatedData);
      }, 500); // Save 500ms after user stops typing
      setSaveTimeout(timeout);
    },
    [saveTimeout, savePlayerData]
  );

  const handleInputChange = useCallback(
    (field, value) => {
      const updatedData = { ...formData, [field]: value };
      setFormData(updatedData);
      debouncedSave(updatedData);
    },
    [formData, debouncedSave]
  );

  const handleInputBlur = useCallback(
    async (field, value) => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      const updatedData = { ...formData, [field]: value };
      setFormData(updatedData);
      await savePlayerData(updatedData);
    },
    [saveTimeout, formData, savePlayerData]
  );

  const handleContactChange = useCallback(
    (index, field, value) => {
      const updatedContacts = [...formData.contacts];
      updatedContacts[index] = { ...updatedContacts[index], [field]: value };

      // If setting as primary, unset others
      if (field === "isPrimary" && value) {
        updatedContacts.forEach((contact, i) => {
          if (i !== index) contact.isPrimary = false;
        });
      }

      const updatedData = { ...formData, contacts: updatedContacts };
      setFormData(updatedData);
      debouncedSave(updatedData);
    },
    [formData, debouncedSave]
  );

  const handleMedicalChange = useCallback(
    (field, value) => {
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: value },
      };
      setFormData(updatedData);
      debouncedSave(updatedData);
    },
    [formData, debouncedSave]
  );

  const handleArrayChange = useCallback(
    (field, index, value) => {
      const updatedArray = [...(formData.medicalInfo[field] || [])];
      updatedArray[index] = value;
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
      };
      setFormData(updatedData);
      debouncedSave(updatedData);
    },
    [formData, debouncedSave]
  );

  const addArrayItem = useCallback(
    async (field) => {
      const updatedArray = [...(formData.medicalInfo[field] || []), ""];
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
      };
      setFormData(updatedData);
      await savePlayerData(updatedData);
    },
    [formData, savePlayerData]
  );

  const removeArrayItem = useCallback(
    async (field, index) => {
      const updatedArray = (formData.medicalInfo[field] || []).filter(
        (_, i) => i !== index
      );
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
      };
      setFormData(updatedData);
      await savePlayerData(updatedData);
    },
    [formData, savePlayerData]
  );

  const addContact = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          name: "",
          relationship: "parent",
          phone: "",
          email: "",
          isPrimary: false,
        },
      ],
    }));
  }, []);

  const removeContact = useCallback(
    (index) => {
      if (formData.contacts.length > 1) {
        const updatedContacts = formData.contacts.filter((_, i) => i !== index);
        const updatedData = { ...formData, contacts: updatedContacts };
        setFormData(updatedData);
        savePlayerData(updatedData);
      }
    },
    [formData, savePlayerData]
  );

  const loadAttendanceHistory = useCallback(async () => {
    try {
      const attendanceQuery = query(
        collection(db, "players", player.id, "attendance"),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(attendanceQuery);
      const records = snapshot.docs.map((doc) =>
        AttendanceRecord.fromFirestore(doc)
      );
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  }, [player.id]);

  useEffect(() => {
    if (openSections.has("attendance")) {
      loadAttendanceHistory();
    }
  }, [openSections, player.id, loadAttendanceHistory]);

  const sections = [
    { id: "attendance", label: "Attendance", icon: CalendarDaysIcon },
    { id: "notes", label: "Notes", icon: DocumentTextIcon },
    { id: "medical", label: "Medical Info", icon: HeartIcon },
    { id: "contact", label: "Contact Info", icon: PhoneIcon },
  ];

  const toggleSection = (sectionId) => {
    const newOpenSections = new Set(openSections);
    const isOpening = !newOpenSections.has(sectionId);

    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);

    // If opening an accordion, scroll it into view after animation
    if (isOpening) {
      setTimeout(() => {
        const accordionElement = accordionRefs.current[sectionId];
        if (accordionElement) {
          const rect = accordionElement.getBoundingClientRect();
          const windowHeight = window.innerHeight;

          // Check if the accordion extends below the viewport
          if (rect.bottom > windowHeight) {
            // Calculate how much to scroll to bring the bottom into view
            const scrollAmount = rect.bottom - windowHeight + 100; // Add 100px buffer
            window.scrollBy({
              top: scrollAmount,
              behavior: "smooth",
            });
          }
        }
      }, 300); // Wait for accordion animation to complete
    }
  };

  const getAttendanceStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, rate };
  };

  const handlePhotoClick = () => {
    setShowPhotoModal(true);
  };

  const handlePhotoSelect = async (photoBlob) => {
    setUploadingPhoto(true);

    try {
      console.log("PlayerProfile: Starting photo update process");
      console.log("PlayerProfile: Current photo URL:", currentPhotoUrl);

      // Compress the image before uploading (works with both Blob and File)
      const compressedBlob = await compressImage(photoBlob);
      console.log("PlayerProfile: Image compressed successfully");

      // Delete old photo if it exists - wait for completion
      if (currentPhotoUrl) {
        console.log("PlayerProfile: Deleting old photo...");
        await deletePlayerPhoto(currentPhotoUrl);
        console.log("PlayerProfile: Old photo deletion completed");
      }

      // Upload new photo
      console.log("PlayerProfile: Uploading new photo...");
      const photoUrl = await uploadPlayerPhoto(compressedBlob, player.id);
      console.log("PlayerProfile: New photo uploaded:", photoUrl);

      // Update player document with new photo URL
      await updateDoc(doc(db, "players", player.id), {
        photoUrl,
        updatedAt: new Date(),
      });
      console.log("PlayerProfile: Player document updated");

      // Update local state
      setCurrentPhotoUrl(photoUrl);
      console.log("PlayerProfile: Photo update process completed");
    } catch (error) {
      console.error("PlayerProfile: Error updating photo:", error);
      alert("Failed to update photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.content.trim()) return;

    try {
      const noteData = {
        id: Date.now().toString(), // Simple ID for client-side identification
        category: newNote.category,
        content: newNote.content.trim(),
        createdAt: new Date().toISOString(),
        playerId: player.id,
      };

      // Update only the player document's notes array
      const updatedNotes = [...playerNotes, noteData];
      await updateDoc(doc(db, "players", player.id), {
        notes: updatedNotes,
      });

      // Update local state immediately to show the new note
      setPlayerNotes(updatedNotes);

      // Reset form
      setNewNote({ category: "general", content: "" });
      setIsAddingNote(false);
    } catch (error) {
      console.error("Error saving note:", error);
      // Show more specific error feedback
      if (error.code === "permission-denied") {
        alert(
          "Permission denied. You may not have access to edit this player."
        );
      } else {
        alert("Failed to save note. Please try again.");
      }
    }
  };

  const handleCancelNote = () => {
    setNewNote({ category: "general", content: "" });
    setIsAddingNote(false);
  };

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case "attendance":
        return (
          <div className="pt-3">
            {loadingAttendance ? (
              <p className="text-gray-500 dark:text-gray-400">
                Loading attendance...
              </p>
            ) : (
              <>
                {/* Attendance Stats */}
                {attendanceRecords.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">
                      Attendance Summary
                    </h4>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {getAttendanceStats().rate}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          Attendance Rate
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {getAttendanceStats().present}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          Present
                        </div>
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-400">
                          {getAttendanceStats().total}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          Total Events
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Records */}
                {attendanceRecords.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex flex-col sm:flex-row justify-between sm:items-center p-3 sm:p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl gap-2 sm:gap-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {record.date}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {record.eventType}
                          </p>
                          {record.note && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              "{record.note}"
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-end sm:self-center ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : record.status === "absent"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : record.status === "late"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}
                        >
                          {record.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No attendance records yet
                  </p>
                )}
              </>
            )}
          </div>
        );

      case "contact":
        return (
          <div className="pt-3 space-y-3">
            <div className="flex justify-end mb-4">
              <button
                onClick={addContact}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>

            {formData.contacts?.length > 0 ? (
              formData.contacts.map((contact, index) => (
                <div
                  key={index}
                  className="border border-gray-300 dark:border-slate-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex justify-between items-center mb-4">
                    <Checkbox
                      label="Primary Contact"
                      checked={contact.isPrimary}
                      onChange={(e) =>
                        handleContactChange(
                          index,
                          "isPrimary",
                          e.target.checked
                        )
                      }
                    />
                    {formData.contacts.length > 1 && (
                      <button
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                        title="Remove Contact"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Input
                      placeholder="Contact Name"
                      value={contact.name || ""}
                      onChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                      onBlur={(e) =>
                        handleInputBlur(`contact_${index}_name`, e.target.value)
                      }
                      icon={UserIcon}
                    />
                    <Select
                      value={contact.relationship || "parent"}
                      onChange={(e) =>
                        handleContactChange(
                          index,
                          "relationship",
                          e.target.value
                        )
                      }
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Guardian</option>
                      <option value="emergency">Emergency Contact</option>
                    </Select>
                    <Input
                      type="tel"
                      placeholder="Phone Number"
                      value={contact.phone || ""}
                      onChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                      onBlur={(e) =>
                        handleInputBlur(
                          `contact_${index}_phone`,
                          e.target.value
                        )
                      }
                      icon={PhoneIcon}
                    />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={contact.email || ""}
                      onChange={(e) =>
                        handleContactChange(index, "email", e.target.value)
                      }
                      onBlur={(e) =>
                        handleInputBlur(
                          `contact_${index}_email`,
                          e.target.value
                        )
                      }
                      icon={EnvelopeIcon}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No contact information available
              </p>
            )}
          </div>
        );

      case "medical":
        return (
          <div className="pt-3 space-y-6">
            {/* Allergies */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Allergies
                </h4>
                <button
                  onClick={() => addArrayItem("allergies")}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Allergy</span>
                </button>
              </div>
              <div className="space-y-3">
                {(formData.medicalInfo?.allergies || []).map(
                  (allergy, index) => (
                    <div key={index} className="flex space-x-3">
                      <Input
                        value={allergy}
                        onChange={(e) =>
                          handleArrayChange("allergies", index, e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputBlur(`allergy_${index}`, e.target.value)
                        }
                        placeholder="Enter allergy"
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeArrayItem("allergies", index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded"
                        title="Remove Allergy"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )
                )}
                {(!formData.medicalInfo?.allergies ||
                  formData.medicalInfo.allergies.length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No allergies listed
                  </p>
                )}
              </div>
            </div>

            {/* Medications */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Medications
                </h4>
                <button
                  onClick={() => addArrayItem("medications")}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Medication</span>
                </button>
              </div>
              <div className="space-y-3">
                {(formData.medicalInfo?.medications || []).map(
                  (medication, index) => (
                    <div key={index} className="flex space-x-3">
                      <Input
                        value={medication}
                        onChange={(e) =>
                          handleArrayChange(
                            "medications",
                            index,
                            e.target.value
                          )
                        }
                        onBlur={(e) =>
                          handleInputBlur(`medication_${index}`, e.target.value)
                        }
                        placeholder="Enter medication"
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeArrayItem("medications", index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded"
                        title="Remove Medication"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )
                )}
                {(!formData.medicalInfo?.medications ||
                  formData.medicalInfo.medications.length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No medications listed
                  </p>
                )}
              </div>
            </div>

            {/* Medical Notes */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Medical Notes
              </h4>
              <Textarea
                value={formData.medicalInfo?.notes || ""}
                onChange={(e) => handleMedicalChange("notes", e.target.value)}
                onBlur={(e) => handleInputBlur("medical_notes", e.target.value)}
                rows={4}
                placeholder="Any additional medical information, conditions, or special instructions..."
              />
            </div>
          </div>
        );

      case "notes":
        return (
          <div className="pt-3">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Notes
              </h4>
              <button
                onClick={() => setIsAddingNote(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Add Note</span>
              </button>
            </div>

            {/* Add Note Form */}
            {isAddingNote && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newNote.category}
                      onChange={(e) =>
                        setNewNote({ ...newNote, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="general">General</option>
                      <option value="medical">Medical</option>
                      <option value="behavior">Behavior</option>
                      <option value="skill">Skill</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Note
                    </label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) =>
                        setNewNote({ ...newNote, content: e.target.value })
                      }
                      placeholder="Add your note here..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNote}
                      disabled={!newNote.content.trim()}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Save Note
                    </button>
                    <button
                      onClick={handleCancelNote}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Notes */}
            {playerNotes?.length > 0 ? (
              <div className="space-y-3">
                {playerNotes.map((note, index) => (
                  <div
                    key={index}
                    className="border border-gray-300 dark:border-slate-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`inline-block px-3 py-1 text-xs rounded-lg capitalize font-medium ${
                          note.category === "medical"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            : note.category === "behavior"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : note.category === "skill"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                            : note.category === "performance"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {note.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : !isAddingNote ? (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  No notes yet
                </p>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                >
                  Add your first note
                </button>
              </div>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto min-h-full">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-300 dark:border-gray-700/50 p-3 sm:p-5 mb-6">
          {/* Mobile: Compact layout with buttons in top-right */}
          <div className="sm:hidden">
            {/* Top row: Photo, Name/Jersey, Buttons */}
            <div className="flex items-start gap-3">
              {/* Photo on left */}
              <div
                className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl flex items-center justify-center shadow-lg cursor-pointer relative group/photo flex-shrink-0"
                onClick={handlePhotoClick}
                title="Tap to take photo"
              >
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt={player.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200">
                  <CameraIcon className="w-3 h-3 text-white" />
                </div>
                {/* Scan line animation during upload */}
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-90 animate-scan-line"></div>
                  </div>
                )}
              </div>
              
              {/* Name and Jersey stacked in middle */}
              <div className="flex-1 min-w-0">
                <input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={(e) => handleInputBlur("name", e.target.value)}
                  placeholder="Player Name"
                  className="w-full text-base font-bold bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 mb-1"
                />
                <input
                  type="number"
                  value={formData.jerseyNumber}
                  onChange={(e) => handleInputChange("jerseyNumber", e.target.value)}
                  onBlur={(e) => handleInputBlur("jerseyNumber", e.target.value)}
                  placeholder="25"
                  className="text-lg text-primary-600 dark:text-primary-400 font-bold bg-transparent border-0 outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              
              {/* Action buttons in top-right */}
              <div className="flex space-x-1 flex-shrink-0">
                <button
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors duration-200"
                  title="Delete Player"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white p-1 rounded transition-colors duration-200"
                  title="Go Back"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Bottom row: Medical badges */}
            {(formData.medicalInfo?.allergies?.length > 0 || formData.medicalInfo?.medications?.length > 0) && (
              <div className="flex gap-1 mt-2 ml-15">
                {formData.medicalInfo?.allergies?.length > 0 && (
                  <span className="inline-block px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded font-medium">
                    A{formData.medicalInfo.allergies.length}
                  </span>
                )}
                {formData.medicalInfo?.medications?.length > 0 && (
                  <span className="inline-block px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded font-medium">
                    M{formData.medicalInfo.medications.length}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Desktop: Original layout */}
          <div className="hidden sm:flex justify-between items-start gap-4">
            <div className="flex items-center space-x-6 w-full">
              <div
                className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer relative group/photo flex-shrink-0"
                onClick={handlePhotoClick}
                title="Tap to take photo"
              >
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt={player.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-2xl md:text-3xl">
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-90 animate-scan-line"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-blue-500/10"></div>
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="mb-3">
                  <input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    onBlur={(e) => handleInputBlur("name", e.target.value)}
                    placeholder="Player Name"
                    className="w-full text-2xl md:text-3xl font-bold bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="number"
                    value={formData.jerseyNumber}
                    onChange={(e) => handleInputChange("jerseyNumber", e.target.value)}
                    onBlur={(e) => handleInputBlur("jerseyNumber", e.target.value)}
                    placeholder="25"
                    className="w-24 text-xl text-primary-600 dark:text-primary-400 font-semibold bg-transparent border-0 outline-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.medicalInfo?.allergies?.length > 0 && (
                    <span className="inline-block px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full font-medium">
                      Has Allergies ({formData.medicalInfo.allergies.length})
                    </span>
                  )}
                  {formData.medicalInfo?.medications?.length > 0 && (
                    <span className="inline-block px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full font-medium">
                      Medications ({formData.medicalInfo.medications.length})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg transition-colors duration-200"
                title="Delete Player"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white p-2.5 rounded-lg transition-colors duration-200"
                title="Go Back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => (accordionRefs.current[section.id] = el)}
              className="bg-white dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-300 dark:border-gray-700/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <section.icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {section.label}
                  </h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-500 ease-in-out ${
                    openSections.has(section.id) ? "rotate-180" : "rotate-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div
                className={`transition-all duration-500 ease-in-out ${
                  openSections.has(section.id)
                    ? "max-h-[2000px] opacity-100"
                    : "max-h-0 opacity-0"
                } overflow-hidden`}
              >
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700/50">
                  {renderSectionContent(section.id)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelect={handlePhotoSelect}
        currentPhotoUrl={currentPhotoUrl}
        playerName={player.name}
      />
    </div>
  );
}
