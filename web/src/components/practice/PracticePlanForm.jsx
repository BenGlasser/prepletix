import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { PracticePlan, DrillSlot, Drill } from '../../models/PracticePlan';

const focusAreas = [
  'Warm-up', 'Stick Skills', 'Passing', 'Catching', 'Shooting', 'Ground Balls',
  'Defense', 'Offense', 'Conditioning', 'Teamwork', 'Fun/Games', 'Cool Down'
];

export default function PracticePlanForm({ plan, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    duration: 90,
    focus: [],
    drills: [],
    notes: ''
  });
  const [availableDrills, setAvailableDrills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    loadDrills();
    if (plan) {
      setFormData({
        title: plan.title,
        date: plan.date,
        duration: plan.duration,
        focus: plan.focus || [],
        drills: plan.drills || [],
        notes: plan.notes || ''
      });
    }
  }, [plan]);

  const loadDrills = async () => {
    try {
      const drillsCollection = collection(db, 'drills');
      const snapshot = await getDocs(drillsCollection);
      const drillList = snapshot.docs.map(doc => Drill.fromFirestore(doc));
      setAvailableDrills(drillList);
    } catch (error) {
      console.error('Error loading drills:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const practicePlan = new PracticePlan({
        ...formData,
        createdBy: auth.currentUser?.uid
      });

      if (plan && plan.id) {
        await updateDoc(doc(db, 'practicePlans', plan.id), practicePlan.toFirestore());
      } else {
        await addDoc(collection(db, 'practicePlans'), practicePlan.toFirestore());
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving practice plan:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFocusToggle = (focus) => {
    setFormData(prev => ({
      ...prev,
      focus: prev.focus.includes(focus)
        ? prev.focus.filter(f => f !== focus)
        : [...prev.focus, focus]
    }));
  };

  const addDrillToPlan = (drill) => {
    const newDrillSlot = new DrillSlot({
      drillId: drill.id,
      drillName: drill.name,
      duration: drill.duration,
      order: formData.drills.length,
      notes: ''
    });

    setFormData(prev => ({
      ...prev,
      drills: [...prev.drills, newDrillSlot]
    }));
  };

  const updateDrillSlot = (index, field, value) => {
    const updatedDrills = [...formData.drills];
    updatedDrills[index] = { ...updatedDrills[index], [field]: value };
    setFormData(prev => ({ ...prev, drills: updatedDrills }));
  };

  const removeDrillSlot = (index) => {
    const updatedDrills = formData.drills.filter((_, i) => i !== index);
    // Update order for remaining drills
    updatedDrills.forEach((drill, i) => {
      drill.order = i;
    });
    setFormData(prev => ({ ...prev, drills: updatedDrills }));
  };

  const moveDrill = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.drills.length) return;

    const updatedDrills = [...formData.drills];
    [updatedDrills[index], updatedDrills[newIndex]] = [updatedDrills[newIndex], updatedDrills[index]];
    
    // Update order
    updatedDrills.forEach((drill, i) => {
      drill.order = i;
    });

    setFormData(prev => ({ ...prev, drills: updatedDrills }));
  };

  const getTotalDuration = () => {
    return formData.drills.reduce((total, drill) => total + (drill.duration || 0), 0);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'drills', label: 'Drills', icon: '🏃‍♂️' },
    { id: 'notes', label: 'Notes', icon: '📋' }
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {plan && plan.id ? 'Edit Practice Plan' : 'New Practice Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Practice Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="e.g., Shooting Skills Practice"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      min="15"
                      max="180"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Focus Areas
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {focusAreas.map((focus) => (
                        <label key={focus} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.focus.includes(focus)}
                            onChange={() => handleFocusToggle(focus)}
                            className="text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{focus}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Drills Tab */}
              {activeTab === 'drills' && (
                <div className="space-y-6">
                  {/* Drill Library */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Available Drills</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {availableDrills.map((drill) => (
                        <div
                          key={drill.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => addDrillToPlan(drill)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">{drill.name}</h4>
                            <span className="text-xs text-gray-500">{drill.duration}min</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{drill.description}</p>
                          <div className="flex space-x-2">
                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {drill.category}
                            </span>
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300 rounded">
                              {drill.skillLevel}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practice Plan */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Practice Plan</h3>
                      <div className="text-sm text-gray-600">
                        Total: {getTotalDuration()} minutes
                      </div>
                    </div>
                    
                    {formData.drills.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Click on drills above to add them to your practice plan
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.drills.map((drill, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{drill.drillName}</h4>
                                <div className="flex space-x-4 mt-2">
                                  <div>
                                    <label className="text-sm text-gray-600">Duration (min)</label>
                                    <input
                                      type="number"
                                      value={drill.duration}
                                      onChange={(e) => updateDrillSlot(index, 'duration', parseInt(e.target.value) || 0)}
                                      className="ml-2 w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                      min="1"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-sm text-gray-600">Notes</label>
                                    <input
                                      type="text"
                                      value={drill.notes}
                                      onChange={(e) => updateDrillSlot(index, 'notes', e.target.value)}
                                      className="ml-2 flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                      placeholder="Optional notes..."
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <button
                                  type="button"
                                  onClick={() => moveDrill(index, 'up')}
                                  disabled={index === 0}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveDrill(index, 'down')}
                                  disabled={index === formData.drills.length - 1}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeDrillSlot(index)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add any notes, reminders, or observations about this practice..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (plan && plan.id ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}