import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { Player, ParentContact, MedicalInfo } from "../../models/Player";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";
import {
  XMarkIcon,
  UserIcon,
  HashtagIcon,
  PhotoIcon,
  PhoneIcon,
  EnvelopeIcon,
  HeartIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function PlayerForm({ player, teamId, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    jerseyNumber: "",
    photoUrl: "",
    contacts: [new ParentContact({ isPrimary: true })],
    medicalInfo: new MedicalInfo(),
    notes: [],
  });
  const [error, setError] = useState("");
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [createdPlayerId, setCreatedPlayerId] = useState(null); // Track created player ID

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        photoUrl: player.photoUrl,
        contacts:
          player.contacts.length > 0
            ? player.contacts
            : [new ParentContact({ isPrimary: true })],
        medicalInfo: player.medicalInfo || new MedicalInfo(),
        notes: player.notes || [],
      });
    }
  }, [player]);

  const savePlayerData = async (updatedData = formData) => {
    // For new players, require more substantial content before auto-saving
    if (!player && !createdPlayerId) {
      if (!updatedData.name?.trim() || updatedData.name.trim().length < 2) {
        return; // Don't save new players without a meaningful name
      }
    }

    setError("");

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
        teamId: teamId || player?.teamId || "",
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
        createdAt: player?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Apply deep cleaning to remove any remaining undefined values
      const cleanFirestoreData = cleanObject(firestoreData);

      console.log(
        "Saving player data:",
        JSON.stringify(cleanFirestoreData, null, 2)
      );

      if (player || createdPlayerId) {
        // Update existing player
        const playerId = player?.id || createdPlayerId;
        await updateDoc(doc(db, "players", playerId), cleanFirestoreData);
      } else {
        // Create new player
        const docRef = await addDoc(
          collection(db, "players"),
          cleanFirestoreData
        );
        setCreatedPlayerId(docRef.id);
        // Update the player reference for future saves
        window.history.replaceState(null, null, `/players/${docRef.id}/edit`);
      }
    } catch (error) {
      console.error("Error saving player:", error);
      console.error("Error details:", error.code, error.message);
      setError(`Save failed: ${error.message}`);
    }
  };

  const debouncedSave = (updatedData) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      savePlayerData(updatedData);
    }, 500); // Save 500ms after user stops typing
    setSaveTimeout(timeout);
  };

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    debouncedSave(updatedData);
  };

  const handleInputBlur = async (field, value) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Only auto-save on blur for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  const handleInputKeyDown = async (e, field, value) => {
    if (e.key === "Enter") {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      const updatedData = { ...formData, [field]: value };
      setFormData(updatedData);

      // Only auto-save on enter for existing players
      if (player || createdPlayerId) {
        await savePlayerData(updatedData);
      }
    }
  };

  const handleContactChange = (index, field, value) => {
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
  };

  const handleContactBlur = async (index, field, value) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    const updatedContacts = [...formData.contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    const updatedData = { ...formData, contacts: updatedContacts };
    setFormData(updatedData);

    // Only auto-save on blur for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  const handleContactKeyDown = async (e, index, field, value) => {
    if (e.key === "Enter") {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      const updatedContacts = [...formData.contacts];
      updatedContacts[index] = { ...updatedContacts[index], [field]: value };
      const updatedData = { ...formData, contacts: updatedContacts };
      setFormData(updatedData);

      // Only auto-save on enter for existing players
      if (player || createdPlayerId) {
        await savePlayerData(updatedData);
      }
    }
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, new ParentContact()],
    }));
  };

  const removeContact = (index) => {
    if (formData.contacts.length > 1) {
      const updatedContacts = formData.contacts.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, contacts: updatedContacts }));
    }
  };

  const handleMedicalChange = (field, value) => {
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: value },
    };
    setFormData(updatedData);
    debouncedSave(updatedData);
  };

  const handleMedicalBlur = async (field, value) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: value },
    };
    setFormData(updatedData);

    // Only auto-save on blur for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  const handleMedicalKeyDown = async (e, field, value) => {
    if (e.key === "Enter") {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: value },
      };
      setFormData(updatedData);

      // Only auto-save on enter for existing players
      if (player || createdPlayerId) {
        await savePlayerData(updatedData);
      }
    }
  };

  const handleArrayChange = (field, index, value) => {
    const updatedArray = [...(formData.medicalInfo[field] || [])];
    updatedArray[index] = value;
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
    };
    setFormData(updatedData);
    debouncedSave(updatedData);
  };

  const handleArrayBlur = async (field, index, value) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    const updatedArray = [...(formData.medicalInfo[field] || [])];
    updatedArray[index] = value;
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
    };
    setFormData(updatedData);

    // Only auto-save on blur for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  const handleArrayKeyDown = async (e, field, index, value) => {
    if (e.key === "Enter") {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      const updatedArray = [...(formData.medicalInfo[field] || [])];
      updatedArray[index] = value;
      const updatedData = {
        ...formData,
        medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
      };
      setFormData(updatedData);

      // Only auto-save on enter for existing players
      if (player || createdPlayerId) {
        await savePlayerData(updatedData);
      }
    }
  };

  const addArrayItem = async (field) => {
    const updatedArray = [...(formData.medicalInfo[field] || []), ""];
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
    };
    setFormData(updatedData);

    // Only auto-save for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  const removeArrayItem = async (field, index) => {
    const updatedArray = (formData.medicalInfo[field] || []).filter(
      (_, i) => i !== index
    );
    const updatedData = {
      ...formData,
      medicalInfo: { ...formData.medicalInfo, [field]: updatedArray },
    };
    setFormData(updatedData);

    // Only auto-save for existing players
    if (player || createdPlayerId) {
      await savePlayerData(updatedData);
    }
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-center">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {player ? "Edit Player" : "Add New Player"}
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                icon={XMarkIcon}
              />
            </div>
          </div>

          <div className="p-8">
            <div className="space-y-8">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-red-800 dark:text-red-400 text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Basic Information */}
              <div className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                  <UserIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <span>Basic Information</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    onBlur={(e) => handleInputBlur("name", e.target.value)}
                    onKeyDown={(e) =>
                      handleInputKeyDown(e, "name", e.target.value)
                    }
                    icon={UserIcon}
                    placeholder="Enter player's full name"
                  />
                  <Input
                    label="Jersey Number"
                    type="number"
                    value={formData.jerseyNumber}
                    onChange={(e) =>
                      handleInputChange("jerseyNumber", e.target.value)
                    }
                    onBlur={(e) =>
                      handleInputBlur("jerseyNumber", e.target.value)
                    }
                    onKeyDown={(e) =>
                      handleInputKeyDown(e, "jerseyNumber", e.target.value)
                    }
                    icon={HashtagIcon}
                    placeholder="Jersey #"
                  />
                </div>
                <Input
                  label="Photo URL"
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) =>
                    handleInputChange("photoUrl", e.target.value)
                  }
                  onBlur={(e) => handleInputBlur("photoUrl", e.target.value)}
                  onKeyDown={(e) =>
                    handleInputKeyDown(e, "photoUrl", e.target.value)
                  }
                  icon={PhotoIcon}
                  placeholder="https://..."
                  className="mt-6"
                />
              </div>

              {/* Contacts */}
              <div className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <PhoneIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <span>Contact Information</span>
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                    icon={PlusIcon}
                  >
                    Add Contact
                  </Button>
                </div>

                {formData.contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-6 mb-4"
                  >
                    <div className="flex justify-between items-center mb-6">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index)}
                          icon={TrashIcon}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Input
                        placeholder="Contact Name"
                        value={contact.name}
                        onChange={(e) =>
                          handleContactChange(index, "name", e.target.value)
                        }
                        onBlur={(e) =>
                          handleContactBlur(index, "name", e.target.value)
                        }
                        onKeyDown={(e) =>
                          handleContactKeyDown(e, index, "name", e.target.value)
                        }
                        icon={UserIcon}
                      />
                      <Select
                        value={contact.relationship}
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
                        value={contact.phone}
                        onChange={(e) =>
                          handleContactChange(index, "phone", e.target.value)
                        }
                        onBlur={(e) =>
                          handleContactBlur(index, "phone", e.target.value)
                        }
                        onKeyDown={(e) =>
                          handleContactKeyDown(
                            e,
                            index,
                            "phone",
                            e.target.value
                          )
                        }
                        icon={PhoneIcon}
                      />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={contact.email}
                        onChange={(e) =>
                          handleContactChange(index, "email", e.target.value)
                        }
                        onBlur={(e) =>
                          handleContactBlur(index, "email", e.target.value)
                        }
                        onKeyDown={(e) =>
                          handleContactKeyDown(
                            e,
                            index,
                            "email",
                            e.target.value
                          )
                        }
                        icon={EnvelopeIcon}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Medical Information */}
              <div className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                  <HeartIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <span>Medical Information</span>
                </h3>

                {/* Allergies */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Allergies
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addArrayItem("allergies")}
                      icon={PlusIcon}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Add Allergy
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(formData.medicalInfo.allergies || []).map(
                      (allergy, index) => (
                        <div key={index} className="flex space-x-3">
                          <Input
                            value={allergy}
                            onChange={(e) =>
                              handleArrayChange(
                                "allergies",
                                index,
                                e.target.value
                              )
                            }
                            onBlur={(e) =>
                              handleArrayBlur(
                                "allergies",
                                index,
                                e.target.value
                              )
                            }
                            onKeyDown={(e) =>
                              handleArrayKeyDown(
                                e,
                                "allergies",
                                index,
                                e.target.value
                              )
                            }
                            placeholder="Enter allergy"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeArrayItem("allergies", index)}
                            icon={TrashIcon}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Medications */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Medications
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addArrayItem("medications")}
                      icon={PlusIcon}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Add Medication
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(formData.medicalInfo.medications || []).map(
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
                              handleArrayBlur(
                                "medications",
                                index,
                                e.target.value
                              )
                            }
                            onKeyDown={(e) =>
                              handleArrayKeyDown(
                                e,
                                "medications",
                                index,
                                e.target.value
                              )
                            }
                            placeholder="Enter medication"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeArrayItem("medications", index)
                            }
                            icon={TrashIcon}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Medical Notes */}
                <Textarea
                  label="Medical Notes"
                  value={formData.medicalInfo.notes || ""}
                  onChange={(e) => handleMedicalChange("notes", e.target.value)}
                  onBlur={(e) => handleMedicalBlur("notes", e.target.value)}
                  onKeyDown={(e) =>
                    handleMedicalKeyDown(e, "notes", e.target.value)
                  }
                  rows={4}
                  placeholder="Any additional medical information, conditions, or special instructions..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
