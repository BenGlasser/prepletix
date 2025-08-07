import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Drill } from '../../models/PracticePlan';
import { 
  XMarkIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  PlayIcon,
  DocumentTextIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const categories = [
  'warm-up', 'shooting', 'passing', 'catching', 'ground-balls', 'defense', 'offense', 
  'conditioning', 'teamwork', 'fun', 'scrimmage', 'cool-down', 'general'
];

const skillLevels = ['beginner', 'intermediate', 'advanced'];

export default function DrillForm({ drill, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    skillLevel: 'beginner',
    duration: 10,
    description: '',
    instructions: '',
    notes: '',
    videoUrl: '',
    equipmentNeeded: [],
    ageGroup: 'all',
    maxPlayers: '',
    minPlayers: ''
  });
  const [error, setError] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [openSections, setOpenSections] = useState(new Set(['basic'])); // Start with basic info open
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    if (drill) {
      setFormData({
        name: drill.name || '',
        category: drill.category || 'general',
        skillLevel: drill.skillLevel || 'beginner',
        duration: drill.duration || 10,
        description: drill.description || '',
        instructions: drill.instructions || '',
        notes: drill.notes || '',
        videoUrl: drill.videoUrl || '',
        equipmentNeeded: drill.equipmentNeeded || [],
        ageGroup: drill.ageGroup || 'all',
        maxPlayers: drill.maxPlayers || '',
        minPlayers: drill.minPlayers || ''
      });
    }
  }, [drill]);

  const autoSave = async () => {
    // Only auto-save if we're editing an existing drill and have required fields
    if (!drill || !drill.id || !formData.name.trim()) return;
    
    setIsAutoSaving(true);
    try {
      const drillData = new Drill({
        ...formData,
        maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
        minPlayers: formData.minPlayers ? parseInt(formData.minPlayers) : null,
      });
      
      await updateDoc(doc(db, 'drills', drill.id), drillData.toFirestore());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputWithAutoSave = (field, value) => {
    handleInputChange(field, value);
    // Auto-save after a brief delay to avoid too frequent saves
    setTimeout(autoSave, 500);
  };

  const handleKeyPress = (e, field, value) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault();
      handleInputChange(field, value);
      autoSave();
    }
  };

  const handleBlur = (field, value) => {
    handleInputChange(field, value);
    autoSave();
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

  const handleAddEquipment = () => {
    if (equipmentInput.trim() && !formData.equipmentNeeded.includes(equipmentInput.trim())) {
      setFormData(prev => ({
        ...prev,
        equipmentNeeded: [...prev.equipmentNeeded, equipmentInput.trim()]
      }));
      setEquipmentInput('');
      // Auto-save when adding equipment
      setTimeout(autoSave, 100);
    }
  };

  const handleRemoveEquipment = (index) => {
    setFormData(prev => ({
      ...prev,
      equipmentNeeded: prev.equipmentNeeded.filter((_, i) => i !== index)
    }));
    // Auto-save when removing equipment
    setTimeout(autoSave, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const drillData = new Drill({
        ...formData,
        maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
        minPlayers: formData.minPlayers ? parseInt(formData.minPlayers) : null,
      });

      if (drill && drill.id) {
        await updateDoc(doc(db, 'drills', drill.id), drillData.toFirestore());
      } else {
        await addDoc(collection(db, 'drills'), drillData.toFirestore());
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving drill:', error);
      setError(error.message);
    }
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  };

  const sections = [
    { id: 'basic', label: 'Basic Information', icon: InformationCircleIcon },
    { id: 'details', label: 'Additional Details', icon: DocumentTextIcon }
  ];

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'basic':
        return (
          <div className="pt-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Drill Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputWithAutoSave('name', e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'name', e.target.value)}
                  onBlur={(e) => handleBlur('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="e.g., 3-Man Weave Passing Drill"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Focus Area *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    handleInputChange('category', e.target.value);
                    autoSave();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category} className="capitalize">
                      {category.replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skill Level *
                </label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => {
                    handleInputChange('skillLevel', e.target.value);
                    autoSave();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {skillLevels.map(level => (
                    <option key={level} value={level} className="capitalize">
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="60"
                  value={formData.duration}
                  onChange={(e) => handleInputWithAutoSave('duration', parseInt(e.target.value) || 1)}
                  onKeyPress={(e) => handleKeyPress(e, 'duration', parseInt(e.target.value) || 1)}
                  onBlur={(e) => handleBlur('duration', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => handleInputWithAutoSave('videoUrl', e.target.value)}
                  onBlur={(e) => handleBlur('videoUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {formData.videoUrl && extractVideoId(formData.videoUrl) && (
                  <div className="mt-2">
                    <div className="aspect-video w-full max-w-sm rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${extractVideoId(formData.videoUrl)}`}
                        title="Video preview"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputWithAutoSave('description', e.target.value)}
                onBlur={(e) => handleBlur('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                placeholder="Brief description of the drill..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => handleInputWithAutoSave('instructions', e.target.value)}
                onBlur={(e) => handleBlur('instructions', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                placeholder="Step-by-step instructions for the drill..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputWithAutoSave('notes', e.target.value)}
                onBlur={(e) => handleBlur('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                placeholder="Additional coaching notes, variations, tips..."
              />
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="pt-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age Group
                </label>
                <select
                  value={formData.ageGroup}
                  onChange={(e) => {
                    handleInputChange('ageGroup', e.target.value);
                    autoSave();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Ages</option>
                  <option value="U6">U6</option>
                  <option value="U8">U8</option>
                  <option value="U10">U10</option>
                  <option value="U12">U12</option>
                  <option value="U14">U14</option>
                  <option value="U16">U16</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Players
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.minPlayers}
                  onChange={(e) => handleInputWithAutoSave('minPlayers', e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'minPlayers', e.target.value)}
                  onBlur={(e) => handleBlur('minPlayers', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maxPlayers}
                  onChange={(e) => handleInputWithAutoSave('maxPlayers', e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'maxPlayers', e.target.value)}
                  onBlur={(e) => handleBlur('maxPlayers', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Equipment Needed
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="e.g., Cones, Lacrosse balls..."
                />
                <button
                  type="button"
                  onClick={handleAddEquipment}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.equipmentNeeded.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.equipmentNeeded.map((equipment, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-sm rounded-full"
                    >
                      {equipment}
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(index)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-4xl mx-auto min-h-full">
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {drill && drill.id ? 'Edit Drill' : 'New Drill'}
              </h2>
              <div className="flex items-center space-x-3 mt-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {drill && drill.id ? 'Update drill information' : 'Create a new coaching drill'}
                </p>
                {isAutoSaving && (
                  <div className="flex items-center space-x-1 text-primary-600 dark:text-primary-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                    <span className="text-xs font-medium">Saving...</span>
                  </div>
                )}
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
                <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.label}</h3>
                  </div>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-500 ease-in-out ${
                      openSections.has(section.id) ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
                
                <div className={`transition-all duration-500 ease-in-out ${
                  openSections.has(section.id) 
                    ? 'max-h-[2000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                } overflow-hidden`}>
                  <div className="px-4 pb-4 border-t border-gray-100/50 dark:border-gray-700/50">
                    {renderSectionContent(section.id)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}