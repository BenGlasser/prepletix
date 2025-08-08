import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { useTeam } from "../../contexts/TeamContext";
import { PracticePlan, DrillSlot, Drill } from "../../models/PracticePlan";
import DatePicker from "../ui/DatePicker";
import {
  XMarkIcon,
  InformationCircleIcon,
  FlagIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import SortableDrillItem from "./SortableDrillItem";
import DrillDetailsModal from "../drills/DrillDetailsModal";

export default function PracticePlanForm({ plan, onClose }) {
  const { currentTeam } = useTeam();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    duration: 90,
    focus: [],
    drills: [],
    notes: "",
  });
  const [availableDrills, setAvailableDrills] = useState([]);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState(new Set(["drills"])); // Start with drills open
  const [activeId, setActiveId] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [drillFilters, setDrillFilters] = useState({
    name: "",
    category: [],
    skillLevel: [],
    duration: { min: "", max: "" },
  });
  const [selectedDrillForModal, setSelectedDrillForModal] = useState(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [autoSaveTimeoutId, setAutoSaveTimeoutId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Only activate when not focused on input elements
      activationConstraint: {
        delay: 0,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    loadDrills();
    if (plan) {
      // Ensure all drills have unique IDs for drag and drop
      const drillsWithUniqueIds = (plan.drills || []).map((drill, index) => ({
        ...drill,
        uniqueId:
          drill.uniqueId ||
          `drill-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
      }));

      setFormData({
        title: plan.title,
        date: plan.date,
        duration: plan.duration,
        focus: plan.focus || [],
        drills: drillsWithUniqueIds,
        notes: plan.notes || "",
      });
    }
  }, [plan]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutId) {
        clearTimeout(autoSaveTimeoutId);
      }
    };
  }, [autoSaveTimeoutId]);

  const loadDrills = async () => {
    try {
      const drillsCollection = collection(db, "drills");
      const snapshot = await getDocs(drillsCollection);
      const drillList = snapshot.docs.map((doc) => Drill.fromFirestore(doc));
      setAvailableDrills(drillList);
    } catch (error) {
      console.error("Error loading drills:", error);
    }
  };

  const autoSave = async () => {
    // Only auto-save if we're editing an existing plan and have required fields
    if (!plan || !plan.id || !formData.title.trim()) return;

    setIsAutoSaving(true);
    try {
      const practicePlan = new PracticePlan({
        ...formData,
        teamId: currentTeam?.id || "",
        createdBy: auth.currentUser?.uid,
      });

      await updateDoc(
        doc(db, "practicePlans", plan.id),
        practicePlan.toFirestore()
      );
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const debouncedAutoSave = () => {
    // Clear any existing timeout
    if (autoSaveTimeoutId) {
      clearTimeout(autoSaveTimeoutId);
    }

    // Set new timeout for 5 seconds
    const timeoutId = setTimeout(() => {
      autoSave();
      setAutoSaveTimeoutId(null);
    }, 5000);

    setAutoSaveTimeoutId(timeoutId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const practicePlan = new PracticePlan({
        ...formData,
        teamId: currentTeam?.id || "",
        createdBy: auth.currentUser?.uid,
      });

      let savedPlan;
      if (plan && plan.id) {
        await updateDoc(
          doc(db, "practicePlans", plan.id),
          practicePlan.toFirestore()
        );
        savedPlan = { ...practicePlan, id: plan.id };
      } else {
        const docRef = await addDoc(
          collection(db, "practicePlans"),
          practicePlan.toFirestore()
        );
        savedPlan = { ...practicePlan, id: docRef.id };
      }

      // Only navigate if this is a new plan (not editing existing)
      if (!plan || !plan.id) {
        navigate(`/practice/${savedPlan.id}`);
      }
      onClose();
    } catch (error) {
      console.error("Error saving practice plan:", error);
      setError(error.message);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputWithAutoSave = (field, value) => {
    handleInputChange(field, value);
    // Use debounced auto-save for keystroke changes
    debouncedAutoSave();
  };

  const handleKeyPress = (e, field, value) => {
    if (e.key === "Enter" && e.target.type !== "textarea") {
      e.preventDefault();
      handleInputChange(field, value);
      autoSave();
    }
  };

  const handleBlur = (field, value) => {
    handleInputChange(field, value);
    // Cancel any pending debounced save and save immediately on blur
    if (autoSaveTimeoutId) {
      clearTimeout(autoSaveTimeoutId);
      setAutoSaveTimeoutId(null);
    }
    autoSave();
  };

  const addDrillToPlan = (drill) => {
    const newDrillSlot = new DrillSlot({
      drillId: drill.id,
      drillName: drill.name,
      duration: drill.duration,
      order: formData.drills.length,
      notes: "",
      completed: false, // Initialize as not completed
      uniqueId: `drill-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`, // Generate unique ID for each instance
    });

    setFormData((prev) => ({
      ...prev,
      drills: [...prev.drills, newDrillSlot],
    }));
    // Auto-save immediately when adding drills
    autoSave();
  };

  const updateDrillSlot = (index, field, value) => {
    const updatedDrills = [...formData.drills];
    updatedDrills[index] = { ...updatedDrills[index], [field]: value };
    setFormData((prev) => ({ ...prev, drills: updatedDrills }));
    // Auto-save drill changes with debounce
    debouncedAutoSave();
  };

  const removeDrillSlot = (index) => {
    const updatedDrills = formData.drills.filter((_, i) => i !== index);
    // Update order for remaining drills
    updatedDrills.forEach((drill, i) => {
      drill.order = i;
    });
    setFormData((prev) => ({ ...prev, drills: updatedDrills }));
    // Auto-save immediately when removing drills
    autoSave();
  };

  const handleShowDrillDetails = async (drillSlot) => {
    // Find the full drill details from availableDrills
    const fullDrill = availableDrills.find((d) => d.id === drillSlot.drillId);
    if (fullDrill) {
      setSelectedDrillForModal(fullDrill);
      setShowDrillModal(true);
    }
  };

  const handleCloseDrillModal = () => {
    setShowDrillModal(false);
    setSelectedDrillForModal(null);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = drillItems.findIndex((drill) => drill.id === active.id);
      const newIndex = drillItems.findIndex((drill) => drill.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedDrills = arrayMove(formData.drills, oldIndex, newIndex);

        // Update order for all drills
        updatedDrills.forEach((drill, i) => {
          drill.order = i;
        });

        setFormData((prev) => ({ ...prev, drills: updatedDrills }));
        // Auto-save immediately after drag and drop
        autoSave();
      }
    }
  };

  // Generate unique IDs for drills - each instance gets its own unique ID
  const drillItems = formData.drills.map((drill, index) => ({
    ...drill,
    id: drill.uniqueId || `drill-instance-${index}`,
  }));

  const getTotalDuration = () => {
    return formData.drills.reduce(
      (total, drill) => total + (drill.duration || 0),
      0
    );
  };

  // Get unique values for filter options
  const getUniqueCategories = () => {
    return [...new Set(availableDrills.map((drill) => drill.category))].sort();
  };

  const getUniqueSkillLevels = () => {
    return [
      ...new Set(availableDrills.map((drill) => drill.skillLevel)),
    ].sort();
  };

  // Filter drills based on current filters
  const filteredDrills = availableDrills.filter((drill) => {
    // Name filter
    if (
      drillFilters.name &&
      !drill.name.toLowerCase().includes(drillFilters.name.toLowerCase())
    ) {
      return false;
    }

    // Category filter
    if (
      drillFilters.category.length > 0 &&
      !drillFilters.category.includes(drill.category)
    ) {
      return false;
    }

    // Skill level filter
    if (
      drillFilters.skillLevel.length > 0 &&
      !drillFilters.skillLevel.includes(drill.skillLevel)
    ) {
      return false;
    }

    // Duration filter
    if (
      drillFilters.duration.min &&
      drill.duration < parseInt(drillFilters.duration.min)
    ) {
      return false;
    }
    if (
      drillFilters.duration.max &&
      drill.duration > parseInt(drillFilters.duration.max)
    ) {
      return false;
    }

    return true;
  });

  const handleFilterChange = (filterType, value) => {
    setDrillFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const toggleFilterValue = (filterType, value) => {
    setDrillFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((v) => v !== value)
        : [...prev[filterType], value],
    }));
  };

  const clearFilters = () => {
    setDrillFilters({
      name: "",
      category: [],
      skillLevel: [],
      duration: { min: "", max: "" },
    });
  };

  const toggleSection = (sectionId) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);
  };

  const sections = [
    { id: "drills", label: "Drills", icon: PlayIcon },
    { id: "notes", label: "Notes", icon: DocumentTextIcon },
  ];

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case "drills":
        return (
          <div className="pt-3 space-y-6">
            {/* Drill Library */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Available Drills
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFilters();
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  Clear Filters
                </button>
              </div>

              {/* Filters */}
              <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-xl p-4 mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Name Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={drillFilters.name}
                      onChange={(e) =>
                        handleFilterChange("name", e.target.value)
                      }
                      placeholder="Search by name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  {/* Focus Area Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Focus Area
                    </label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {getUniqueCategories().map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFilterValue("category", category);
                            }}
                            className={`text-xs px-2 py-1 rounded-full transition-colors capitalize ${
                              drillFilters.category.includes(category)
                                ? "bg-primary-600 text-white"
                                : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Skill Level Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Skill Level
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {getUniqueSkillLevels().map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFilterValue("skillLevel", level);
                          }}
                          className={`text-xs px-2 py-1 rounded-full transition-colors capitalize ${
                            drillFilters.skillLevel.includes(level)
                              ? "bg-primary-600 text-white"
                              : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration (min)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={drillFilters.duration.min}
                        onChange={(e) =>
                          handleFilterChange("duration", {
                            ...drillFilters.duration,
                            min: e.target.value,
                          })
                        }
                        placeholder="Min"
                        min="0"
                        className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <input
                        type="number"
                        value={drillFilters.duration.max}
                        onChange={(e) =>
                          handleFilterChange("duration", {
                            ...drillFilters.duration,
                            max: e.target.value,
                          })
                        }
                        placeholder="Max"
                        min="0"
                        className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drills Table */}
              <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Focus Area
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Skill Level
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredDrills.map((drill) => (
                      <tr
                        key={drill.id}
                        onClick={() => addDrillToPlan(drill)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors duration-200"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {drill.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full font-medium capitalize">
                            {drill.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full font-medium capitalize">
                            {drill.skillLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {drill.duration} min
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          <div className="line-clamp-2">
                            {drill.description}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDrills.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No drills match your current filters
                  </div>
                )}
              </div>
            </div>

            {/* Practice Plan */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Practice Plan
                </h3>
                <div className="text-sm text-gray-600">
                  Total: {getTotalDuration()} minutes
                </div>
              </div>

              {formData.drills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Click on drills above to add them to your practice plan
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                  <SortableContext
                    items={drillItems.map((drill) => drill.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {drillItems.map((drill, index) => (
                        <SortableDrillItem
                          key={drill.id}
                          id={drill.id}
                          drill={drill}
                          index={index}
                          isActive={activeId === drill.id}
                          onUpdate={(field, value) =>
                            updateDrillSlot(index, field, value)
                          }
                          onRemove={() => removeDrillSlot(index)}
                          onShowDetails={handleShowDrillDetails}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        );

      case "notes":
        return (
          <div className="pt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Practice Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputWithAutoSave("notes", e.target.value)}
              onBlur={(e) => handleBlur("notes", e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              placeholder="Add any notes, reminders, or observations about this practice..."
            />
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
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-6">
              {/* Practice Title and Date */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-3 lg:space-y-0 mb-4">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    handleInputWithAutoSave("title", e.target.value)
                  }
                  onKeyPress={(e) => handleKeyPress(e, "title", e.target.value)}
                  onBlur={(e) => handleBlur("title", e.target.value)}
                  className="text-2xl lg:text-3xl font-bold bg-transparent border-none focus:outline-none text-gray-900 dark:text-white lg:flex-1 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={
                    plan && plan.id
                      ? "Practice Plan Title"
                      : "New Practice Plan"
                  }
                />

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <DatePicker
                    value={formData.date}
                    onChange={(date) => {
                      handleInputChange("date", date);
                      autoSave();
                    }}
                    className="bg-transparent border-none focus:outline-none text-gray-600 dark:text-gray-400 font-medium min-w-0"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center space-x-2 mb-2">
                <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    handleInputWithAutoSave(
                      "duration",
                      parseInt(e.target.value) || 0
                    )
                  }
                  onKeyPress={(e) =>
                    handleKeyPress(e, "duration", parseInt(e.target.value) || 0)
                  }
                  onBlur={(e) =>
                    handleBlur("duration", parseInt(e.target.value) || 0)
                  }
                  className="w-16 bg-transparent border-none focus:outline-none text-gray-600 dark:text-gray-400 font-medium"
                  min="15"
                  max="180"
                />
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  min
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <XMarkIcon className="w-3 h-3 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-red-800 dark:text-red-300 text-sm font-medium">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Accordion Sections */}
          <div className="space-y-3 mb-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {section.label}
                    </h3>
                  </div>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-500 ease-in-out ${
                      openSections.has(section.id) ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                <div
                  className={`transition-all duration-500 ease-in-out ${
                    openSections.has(section.id)
                      ? "max-h-[2000px] opacity-100"
                      : "max-h-0 opacity-0"
                  } overflow-hidden`}
                >
                  <div className="px-4 pb-4 border-t border-gray-100/50 dark:border-gray-700/50">
                    {renderSectionContent(section.id)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </div>

      {/* Drill Details Modal */}
      <DrillDetailsModal
        drill={selectedDrillForModal}
        isOpen={showDrillModal}
        onClose={handleCloseDrillModal}
      />
    </div>
  );
}
