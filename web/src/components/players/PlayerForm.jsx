import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Player, ParentContact, MedicalInfo } from '../../models/Player';

export default function PlayerForm({ player, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    jerseyNumber: '',
    photoUrl: '',
    contacts: [new ParentContact({ isPrimary: true })],
    medicalInfo: new MedicalInfo(),
    notes: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        photoUrl: player.photoUrl,
        contacts: player.contacts.length > 0 ? player.contacts : [new ParentContact({ isPrimary: true })],
        medicalInfo: player.medicalInfo || new MedicalInfo(),
        notes: player.notes || []
      });
    }
  }, [player]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const playerData = new Player({
        ...formData,
        jerseyNumber: parseInt(formData.jerseyNumber) || null
      });

      if (player) {
        await updateDoc(doc(db, 'players', player.id), playerData.toFirestore());
      } else {
        await addDoc(collection(db, 'players'), playerData.toFirestore());
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving player:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    
    // If setting as primary, unset others
    if (field === 'isPrimary' && value) {
      updatedContacts.forEach((contact, i) => {
        if (i !== index) contact.isPrimary = false;
      });
    }
    
    setFormData(prev => ({ ...prev, contacts: updatedContacts }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, new ParentContact()]
    }));
  };

  const removeContact = (index) => {
    if (formData.contacts.length > 1) {
      const updatedContacts = formData.contacts.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, contacts: updatedContacts }));
    }
  };

  const handleMedicalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: { ...prev.medicalInfo, [field]: value }
    }));
  };

  const handleArrayChange = (field, index, value) => {
    const updatedArray = [...formData.medicalInfo[field]];
    updatedArray[index] = value;
    handleMedicalChange(field, updatedArray);
  };

  const addArrayItem = (field) => {
    const updatedArray = [...(formData.medicalInfo[field] || []), ''];
    handleMedicalChange(field, updatedArray);
  };

  const removeArrayItem = (field, index) => {
    const updatedArray = formData.medicalInfo[field].filter((_, i) => i !== index);
    handleMedicalChange(field, updatedArray);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {player ? 'Edit Player' : 'Add New Player'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jersey Number
                </label>
                <input
                  type="number"
                  value={formData.jerseyNumber}
                  onChange={(e) => handleInputChange('jerseyNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo URL
              </label>
              <input
                type="url"
                value={formData.photoUrl}
                onChange={(e) => handleInputChange('photoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <button
                type="button"
                onClick={addContact}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                + Add Contact
              </button>
            </div>
            
            {formData.contacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={contact.isPrimary}
                      onChange={(e) => handleContactChange(index, 'isPrimary', e.target.checked)}
                      className="text-primary-600"
                    />
                    <label className="text-sm font-medium">Primary Contact</label>
                  </div>
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <select
                    value={contact.relationship}
                    onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="parent">Parent</option>
                    <option value="guardian">Guardian</option>
                    <option value="emergency">Emergency Contact</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={contact.email}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Medical Information */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Medical Information</h3>
            
            {/* Allergies */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </label>
              {(formData.medicalInfo.allergies || []).map((allergy, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={allergy}
                    onChange={(e) => handleArrayChange('allergies', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Allergy"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('allergies', index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('allergies')}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                + Add Allergy
              </button>
            </div>

            {/* Medications */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medications
              </label>
              {(formData.medicalInfo.medications || []).map((medication, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => handleArrayChange('medications', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Medication"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('medications', index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('medications')}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                + Add Medication
              </button>
            </div>

            {/* Medical Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Notes
              </label>
              <textarea
                value={formData.medicalInfo.notes || ''}
                onChange={(e) => handleMedicalChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional medical information..."
              />
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
              {loading ? 'Saving...' : (player ? 'Update Player' : 'Add Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}