import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useTeam } from '../../contexts/TeamContext';
import { Drill } from '../../models/PracticePlan';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const categories = [
  'warm-up', 'shooting', 'passing', 'catching', 'ground-balls', 'defense', 'offense', 
  'conditioning', 'teamwork', 'fun', 'scrimmage', 'cool-down', 'general'
];

const skillLevels = ['beginner', 'intermediate', 'advanced'];

export default function DrillLibrary() {
  const { currentTeam, loading: teamLoading } = useTeam();
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    category: [],
    skillLevel: []
  });
  const [editingFields, setEditingFields] = useState({});
  const [editValues, setEditValues] = useState({});
  const [equipmentInput, setEquipmentInput] = useState('');

  const { drillId, teamId } = useParams();
  const navigate = useNavigate();

  const loadDrills = useCallback(async () => {
    if (!currentTeam) return;
    
    try {
      // Load both team-specific drills and global drills
      // Note: Firestore 'or' queries can be complex, so we'll use a simpler approach
      const drillsCollection = collection(db, 'drills');
      const snapshot = await getDocs(drillsCollection);
      const allDrills = snapshot.docs.map(doc => Drill.fromFirestore(doc));
      
      // Filter to show only team drills and global drills
      const drillList = allDrills.filter(drill => 
        drill.isGlobal || drill.teamId === currentTeam.id
      );
      
      // Sort by name
      drillList.sort((a, b) => a.name.localeCompare(b.name));
      setDrills(drillList);
    } catch (error) {
      console.error('Error loading drills:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    if (currentTeam && !teamLoading) {
      loadDrills();
    }
  }, [currentTeam, teamLoading, loadDrills]);

  useEffect(() => {
    // Handle URL parameters for specific drill focus
    if (drillId && drills.length > 0) {
      const drill = drills.find(d => d.id === drillId);
      if (drill) {
        setSelectedDrill(drill);
        // Initialize edit values for the selected drill
        setEditValues({
          name: drill.name,
          category: drill.category,
          skillLevel: drill.skillLevel,
          duration: drill.duration,
          description: drill.description,
          videoUrl: drill.videoUrl,
          ageGroup: drill.ageGroup,
          minPlayers: drill.minPlayers,
          maxPlayers: drill.maxPlayers
        });
      }
    } else if (!drillId) {
      setSelectedDrill(null);
    }
  }, [drillId, drills]);

  // Filter functions
  const getUniqueCategories = () => {
    return [...new Set(drills.map(drill => drill.category))].sort();
  };

  const getUniqueSkillLevels = () => {
    return [...new Set(drills.map(drill => drill.skillLevel))].sort();
  };

  const filteredDrills = drills.filter(drill => {
    // Name filter
    if (filters.name && !drill.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (filters.category.length > 0 && !filters.category.includes(drill.category)) {
      return false;
    }
    
    // Skill level filter
    if (filters.skillLevel.length > 0 && !filters.skillLevel.includes(drill.skillLevel)) {
      return false;
    }
    
    return true;
  });

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleFilterValue = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      category: [],
      skillLevel: []
    });
  };

  const handleAddDrill = async () => {
    try {
      // Create a new drill with default values
      const newDrill = new Drill({
        teamId: currentTeam.id,
        name: 'New Drill',
        category: 'general',
        skillLevel: 'beginner',
        duration: 10,
        description: '',
        videoUrl: '',
        equipmentNeeded: [],
        ageGroup: 'all',
        minPlayers: null,
        maxPlayers: null,
        isGlobal: false
      });
      
      // Save to database
      const docRef = await addDoc(collection(db, 'drills'), newDrill.toFirestore());
      
      // Add ID to the drill object
      newDrill.id = docRef.id;
      
      // Add to local state
      const updatedDrills = [...drills, newDrill].sort((a, b) => a.name.localeCompare(b.name));
      setDrills(updatedDrills);
      
      // Select the new drill and navigate to it
      setSelectedDrill(newDrill);
      navigate(`/teams/${teamId}/drills/${docRef.id}`);
      
      // Initialize edit values
      setEditValues({
        name: newDrill.name,
        category: newDrill.category,
        skillLevel: newDrill.skillLevel,
        duration: newDrill.duration,
        description: newDrill.description,
        videoUrl: newDrill.videoUrl,
        ageGroup: newDrill.ageGroup,
        minPlayers: newDrill.minPlayers,
        maxPlayers: newDrill.maxPlayers
      });
      
      // Auto-edit the name field
      setEditingFields({ name: true });
    } catch (error) {
      console.error('Error creating new drill:', error);
    }
  };

  const handleFieldEdit = (fieldName) => {
    setEditingFields({ ...editingFields, [fieldName]: true });
  };

  const handleFieldSave = async (fieldName) => {
    const newValue = editValues[fieldName];
    const currentValue = selectedDrill[fieldName];
    
    if (newValue === currentValue) {
      setEditingFields({ ...editingFields, [fieldName]: false });
      return;
    }

    try {
      const updatedDrill = new Drill({
        ...selectedDrill,
        [fieldName]: fieldName.includes('Players') ? (newValue ? parseInt(newValue) : null) : newValue
      });
      
      await updateDoc(doc(db, 'drills', selectedDrill.id), updatedDrill.toFirestore());
      
      // Update local state
      selectedDrill[fieldName] = fieldName.includes('Players') ? (newValue ? parseInt(newValue) : null) : newValue;
      setSelectedDrill({ ...selectedDrill });
      
      // Update drills list
      const updatedDrills = drills.map(d => d.id === selectedDrill.id ? { ...selectedDrill } : d);
      setDrills(updatedDrills);
      
      setEditingFields({ ...editingFields, [fieldName]: false });
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
      setEditValues({ ...editValues, [fieldName]: currentValue });
    }
  };

  const handleFieldCancel = (fieldName) => {
    setEditValues({ ...editValues, [fieldName]: selectedDrill[fieldName] });
    setEditingFields({ ...editingFields, [fieldName]: false });
  };

  const handleFieldKeyDown = (e, fieldName) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault();
      handleFieldSave(fieldName);
    } else if (e.key === 'Escape') {
      handleFieldCancel(fieldName);
    }
  };

  const handleAddEquipment = async () => {
    if (equipmentInput.trim() && !selectedDrill.equipmentNeeded.includes(equipmentInput.trim())) {
      const newEquipment = [...selectedDrill.equipmentNeeded, equipmentInput.trim()];
      
      try {
        const updatedDrill = new Drill({
          ...selectedDrill,
          equipmentNeeded: newEquipment
        });
        
        await updateDoc(doc(db, 'drills', selectedDrill.id), updatedDrill.toFirestore());
        
        selectedDrill.equipmentNeeded = newEquipment;
        setSelectedDrill({ ...selectedDrill });
        
        const updatedDrills = drills.map(d => d.id === selectedDrill.id ? { ...selectedDrill } : d);
        setDrills(updatedDrills);
        
        setEquipmentInput('');
      } catch (error) {
        console.error('Error adding equipment:', error);
      }
    }
  };

  const handleRemoveEquipment = async (index) => {
    const newEquipment = selectedDrill.equipmentNeeded.filter((_, i) => i !== index);
    
    try {
      const updatedDrill = new Drill({
        ...selectedDrill,
        equipmentNeeded: newEquipment
      });
      
      await updateDoc(doc(db, 'drills', selectedDrill.id), updatedDrill.toFirestore());
      
      selectedDrill.equipmentNeeded = newEquipment;
      setSelectedDrill({ ...selectedDrill });
      
      const updatedDrills = drills.map(d => d.id === selectedDrill.id ? { ...selectedDrill } : d);
      setDrills(updatedDrills);
    } catch (error) {
      console.error('Error removing equipment:', error);
    }
  };

  const handleViewDrill = (drill) => {
    setSelectedDrill(drill);
    navigate(`/teams/${teamId}/drills/${drill.id}`);
  };

  const handleDeleteDrill = async (drillId) => {
    if (window.confirm('Are you sure you want to delete this drill?')) {
      try {
        await deleteDoc(doc(db, 'drills', drillId));
        await loadDrills();
        if (selectedDrill && selectedDrill.id === drillId) {
          setSelectedDrill(null);
          navigate(`/teams/${teamId}/drills`);
        }
      } catch (error) {
        console.error('Error deleting drill:', error);
      }
    }
  };


  const extractVideoId = (url) => {
    if (!url) return null;
    
    // YouTube URL patterns
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  };


  if (teamLoading || loading) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <div className="text-gray-500 dark:text-gray-400">Loading drills...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-2">No team selected</div>
            <div className="text-sm text-gray-400">Please select or create a team to view drills.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 min-h-full">
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Drill Library</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your coaching drills and exercises</p>
            </div>
            
            <button
              onClick={handleAddDrill}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-[1.02] font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Drill</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drills List */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">All Drills ({filteredDrills.length})</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-xl p-4 mb-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Name Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Search
                      </label>
                      <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={filters.name}
                          onChange={(e) => handleFilterChange('name', e.target.value)}
                          placeholder="Search drills..."
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    </div>

                    {/* Focus Area Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Focus Area
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {getUniqueCategories().map(category => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleFilterValue('category', category)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors capitalize ${
                              filters.category.includes(category)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skill Level Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Skill Level
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {getUniqueSkillLevels().map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => toggleFilterValue('skillLevel', level)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors capitalize ${
                              filters.skillLevel.includes(level)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drills Table */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl">
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredDrills.map((drill) => (
                        <tr
                          key={drill.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors duration-200 ${
                            selectedDrill && selectedDrill.id === drill.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                          onClick={() => handleViewDrill(drill)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-2">
                              {drill.videoUrl && <PlayIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                              <span>{drill.name}</span>
                            </div>
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
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDrill(drill);
                                }}
                                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                                title="View drill"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDrill(drill.id);
                                }}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete drill"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredDrills.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {filters.name || filters.category.length > 0 || filters.skillLevel.length > 0
                        ? 'No drills match your current filters'
                        : 'No drills found. Create your first drill to get started!'
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Drill Details */}
          <div className="lg:col-span-1">
            {selectedDrill ? (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    {editingFields.name ? (
                      <div className="flex-1 mr-4">
                        <input
                          type="text"
                          value={editValues.name || ''}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          onKeyDown={(e) => handleFieldKeyDown(e, 'name')}
                          onBlur={() => handleFieldSave('name')}
                          className="text-lg font-semibold bg-transparent border-b-2 border-primary-500 focus:outline-none text-gray-900 dark:text-white w-full"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h3 
                        className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                        onClick={() => handleFieldEdit('name')}
                        title="Click to edit"
                      >
                        {selectedDrill.name}
                      </h3>
                    )}
                    
                    <button
                      onClick={() => handleDeleteDrill(selectedDrill.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete drill"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      {editingFields.category ? (
                        <select
                          value={editValues.category || ''}
                          onChange={(e) => {
                            setEditValues({ ...editValues, category: e.target.value });
                            handleFieldSave('category');
                          }}
                          className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full font-medium capitalize border-none focus:outline-none"
                        >
                          {categories.map(category => (
                            <option key={category} value={category} className="capitalize">
                              {category.replace('-', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="inline-block px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full font-medium capitalize cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800/30"
                          onClick={() => handleFieldEdit('category')}
                          title="Click to edit"
                        >
                          {selectedDrill.category.replace('-', ' ')}
                        </span>
                      )}
                      
                      {editingFields.skillLevel ? (
                        <select
                          value={editValues.skillLevel || ''}
                          onChange={(e) => {
                            setEditValues({ ...editValues, skillLevel: e.target.value });
                            handleFieldSave('skillLevel');
                          }}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full font-medium capitalize border-none focus:outline-none"
                        >
                          {skillLevels.map(level => (
                            <option key={level} value={level} className="capitalize">
                              {level}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full font-medium capitalize cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                          onClick={() => handleFieldEdit('skillLevel')}
                          title="Click to edit"
                        >
                          {selectedDrill.skillLevel}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Duration:</strong> 
                      {editingFields.duration ? (
                        <input
                          type="number"
                          value={editValues.duration || ''}
                          onChange={(e) => setEditValues({ ...editValues, duration: parseInt(e.target.value) || 1 })}
                          onKeyDown={(e) => handleFieldKeyDown(e, 'duration')}
                          onBlur={() => handleFieldSave('duration')}
                          className="ml-1 w-16 bg-transparent border-b border-gray-400 focus:outline-none focus:border-primary-500"
                          autoFocus
                          min="1"
                          max="60"
                        />
                      ) : (
                        <span 
                          className="ml-1 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                          onClick={() => handleFieldEdit('duration')}
                          title="Click to edit"
                        >
                          {selectedDrill.duration}
                        </span>
                      )} minutes
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                      {editingFields.description ? (
                        <textarea
                          value={editValues.description || ''}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          onKeyDown={(e) => handleFieldKeyDown(e, 'description')}
                          onBlur={() => handleFieldSave('description')}
                          className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500 resize-none"
                          rows={4}
                          autoFocus
                        />
                      ) : (
                        <p 
                          className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 min-h-[20px]"
                          onClick={() => handleFieldEdit('description')}
                          title="Click to edit"
                        >
                          {selectedDrill.description || 'Click to add description...'}
                        </p>
                      )}
                    </div>

                    {/* Video URL Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Video URL</h4>
                      {editingFields.videoUrl ? (
                        <input
                          type="url"
                          value={editValues.videoUrl || ''}
                          onChange={(e) => setEditValues({ ...editValues, videoUrl: e.target.value })}
                          onKeyDown={(e) => handleFieldKeyDown(e, 'videoUrl')}
                          onBlur={() => handleFieldSave('videoUrl')}
                          className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
                          placeholder="https://www.youtube.com/watch?v=..."
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 min-h-[20px]"
                          onClick={() => handleFieldEdit('videoUrl')}
                          title="Click to edit"
                        >
                          {selectedDrill.videoUrl ? (
                            <span className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm underline">
                              {selectedDrill.videoUrl}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">Click to add video URL...</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Video Embedding */}
                    {selectedDrill.videoUrl && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Video Demonstration</h4>
                        {(() => {
                          const videoId = extractVideoId(selectedDrill.videoUrl);
                          if (videoId) {
                            return (
                              <div className="aspect-video rounded-lg overflow-hidden">
                                <iframe
                                  src={`https://www.youtube.com/embed/${videoId}`}
                                  title={selectedDrill.name}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                ></iframe>
                              </div>
                            );
                          } else {
                            return (
                              <a
                                href={selectedDrill.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm underline"
                              >
                                View Video
                              </a>
                            );
                          }
                        })()}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Equipment Needed</h4>
                      <div className="space-y-2">
                        {selectedDrill.equipmentNeeded && selectedDrill.equipmentNeeded.length > 0 && (
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {selectedDrill.equipmentNeeded.map((equipment, index) => (
                              <li key={index} className="flex items-center justify-between">
                                <span>{equipment}</span>
                                <button
                                  onClick={() => handleRemoveEquipment(index)}
                                  className="text-gray-400 hover:text-red-500 ml-2"
                                  title="Remove equipment"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={equipmentInput}
                            onChange={(e) => setEquipmentInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                            className="flex-1 text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="Add equipment..."
                          />
                          <button
                            type="button"
                            onClick={handleAddEquipment}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Additional fields */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-gray-700 dark:text-gray-300">Age Group:</strong>
                        {editingFields.ageGroup ? (
                          <select
                            value={editValues.ageGroup || ''}
                            onChange={(e) => {
                              setEditValues({ ...editValues, ageGroup: e.target.value });
                              handleFieldSave('ageGroup');
                            }}
                            className="ml-1 text-sm bg-transparent border-b border-gray-400 focus:outline-none focus:border-primary-500"
                          >
                            <option value="all">All Ages</option>
                            <option value="U6">U6</option>
                            <option value="U8">U8</option>
                            <option value="U10">U10</option>
                            <option value="U12">U12</option>
                            <option value="U14">U14</option>
                            <option value="U16">U16</option>
                          </select>
                        ) : (
                          <span 
                            className="ml-1 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            onClick={() => handleFieldEdit('ageGroup')}
                            title="Click to edit"
                          >
                            {selectedDrill.ageGroup || 'all'}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <strong className="text-gray-700 dark:text-gray-300">Players:</strong>
                        {editingFields.minPlayers ? (
                          <input
                            type="number"
                            value={editValues.minPlayers || ''}
                            onChange={(e) => setEditValues({ ...editValues, minPlayers: e.target.value })}
                            onKeyDown={(e) => handleFieldKeyDown(e, 'minPlayers')}
                            onBlur={() => handleFieldSave('minPlayers')}
                            className="ml-1 w-12 text-sm bg-transparent border-b border-gray-400 focus:outline-none focus:border-primary-500"
                            min="1"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="ml-1 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            onClick={() => handleFieldEdit('minPlayers')}
                            title="Click to edit"
                          >
                            {selectedDrill.minPlayers || '1'}
                          </span>
                        )}-
                        {editingFields.maxPlayers ? (
                          <input
                            type="number"
                            value={editValues.maxPlayers || ''}
                            onChange={(e) => setEditValues({ ...editValues, maxPlayers: e.target.value })}
                            onKeyDown={(e) => handleFieldKeyDown(e, 'maxPlayers')}
                            onBlur={() => handleFieldSave('maxPlayers')}
                            className="w-12 text-sm bg-transparent border-b border-gray-400 focus:outline-none focus:border-primary-500"
                            min="1"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            onClick={() => handleFieldEdit('maxPlayers')}
                            title="Click to edit"
                          >
                            {selectedDrill.maxPlayers || '∞'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <PlayIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a drill to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}