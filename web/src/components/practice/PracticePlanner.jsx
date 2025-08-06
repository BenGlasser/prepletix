import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { PracticePlan } from '../../models/PracticePlan';
import PracticePlanCard from './PracticePlanCard';
import PracticePlanForm from './PracticePlanForm';

export default function PracticePlanner() {
  const [practicePlans, setPracticePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'calendar'

  useEffect(() => {
    loadPracticePlans();
  }, []);

  const loadPracticePlans = async () => {
    try {
      const plansCollection = collection(db, 'practicePlans');
      const snapshot = await getDocs(plansCollection);
      const planList = snapshot.docs.map(doc => PracticePlan.fromFirestore(doc));
      // Sort by date, most recent first
      planList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPracticePlans(planList);
    } catch (error) {
      console.error('Error loading practice plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDuplicatePlan = (plan) => {
    const duplicated = new PracticePlan({
      ...plan,
      id: null,
      title: `${plan.title} (Copy)`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.currentUser?.uid
    });
    setEditingPlan(duplicated);
    setShowForm(true);
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this practice plan?')) {
      try {
        await deleteDoc(doc(db, 'practicePlans', planId));
        await loadPracticePlans();
      } catch (error) {
        console.error('Error deleting practice plan:', error);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlan(null);
    loadPracticePlans();
  };

  const getPlansByMonth = () => {
    const grouped = {};
    practicePlans.forEach(plan => {
      const month = plan.date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(plan);
    });
    return grouped;
  };

  if (showForm) {
    return (
      <PracticePlanForm 
        plan={editingPlan}
        onClose={handleFormClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading practice plans...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Planner</h2>
          
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  view === 'list' ? 'bg-white dark:bg-slate-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  view === 'calendar' ? 'bg-white dark:bg-slate-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Calendar View
              </button>
            </div>
            
            <button
              onClick={handleAddPlan}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-2xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Practice Plan</span>
            </button>
          </div>
        </div>

        {practicePlans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">No practice plans created yet</div>
            <button
              onClick={handleAddPlan}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              Create Your First Practice Plan
            </button>
          </div>
        ) : view === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {practicePlans.map((plan) => (
              <PracticePlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleEditPlan(plan)}
                onDuplicate={() => handleDuplicatePlan(plan)}
                onDelete={() => handleDeletePlan(plan.id)}
              />
            ))}
          </div>
        ) : (
          // Calendar View
          <div className="space-y-8">
            {Object.entries(getPlansByMonth()).map(([month, plans]) => (
              <div key={month} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {plans.map((plan) => (
                    <PracticePlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={() => handleEditPlan(plan)}
                      onDuplicate={() => handleDuplicatePlan(plan)}
                      onDelete={() => handleDeletePlan(plan.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}