import { useState } from 'react';
import { seedAllData } from '../../utils/seedData';

export default function DataSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedData = async () => {
    setSeeding(true);
    setMessage('');
    
    try {
      await seedAllData();
      setMessage('Sample data added successfully! You can now explore the app with test players and drills.');
    } catch (error) {
      setMessage(`Error seeding data: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium text-blue-900 mb-2">Demo Data</h3>
      <p className="text-sm text-blue-700 mb-4">
        Add sample players and drills to explore all features of Prepletix.
      </p>
      
      {message && (
        <div className={`p-3 rounded mb-4 text-sm ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}
      
      <button
        onClick={handleSeedData}
        disabled={seeding}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {seeding ? 'Adding Sample Data...' : 'Add Sample Data'}
      </button>
    </div>
  );
}