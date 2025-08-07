import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc, getDoc, addDoc, query, where } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { useTeam } from '../../contexts/TeamContext';
import { PracticePlan } from '../../models/PracticePlan';
import PracticePlanCard from './PracticePlanCard';
import PracticePlanForm from './PracticePlanForm';
import { 
  PlusIcon, 
  ListBulletIcon, 
  CalendarDaysIcon,
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';

export default function PracticePlanner() {
  const { currentTeam, loading: teamLoading } = useTeam();
  const [practicePlans, setPracticePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  
  const { planId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentTeam && !teamLoading) {
      loadPracticePlans();
    }
  }, [currentTeam, teamLoading, loadPracticePlans]);

  useEffect(() => {
    // Handle URL parameters for editing specific plans
    if (planId === 'new') {
      setEditingPlan(null);
      setShowForm(true);
    } else if (planId) {
      loadSpecificPlan(planId);
    } else {
      // If no planId, make sure form is closed
      setShowForm(false);
      setEditingPlan(null);
    }
  }, [planId, loadSpecificPlan]);

  const loadSpecificPlan = useCallback(async (id) => {
    try {
      const planDoc = await getDoc(doc(db, 'practicePlans', id));
      if (planDoc.exists()) {
        const plan = PracticePlan.fromFirestore(planDoc);
        setEditingPlan(plan);
        setShowForm(true);
      } else {
        console.error('Practice plan not found');
        navigate('/practice'); // Redirect if plan doesn't exist
      }
    } catch (error) {
      console.error('Error loading practice plan:', error);
      navigate('/practice'); // Redirect on error
    }
  }, [navigate]);

  const loadPracticePlans = useCallback(async () => {
    if (!currentTeam) return;
    
    try {
      // Query practice plans filtered by current team
      const plansQuery = query(
        collection(db, 'practicePlans'),
        where('teamId', '==', currentTeam.id)
      );
      const snapshot = await getDocs(plansQuery);
      const planList = snapshot.docs.map(doc => PracticePlan.fromFirestore(doc));
      // Sort by date, most recent first
      planList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPracticePlans(planList);
    } catch (error) {
      console.error('Error loading practice plans:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  const handleAddPlan = () => {
    setEditingPlan(null);
    setShowForm(true);
    navigate('/practice/new');
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
    navigate(`/practice/${plan.id}/edit`);
  };

  const handleDuplicatePlan = async (plan) => {
    try {
      const duplicated = new PracticePlan({
        ...plan,
        id: null,
        title: `${plan.title} (Copy)`,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: auth.currentUser?.uid
      });

      // Save the duplicated plan immediately
      const docRef = await addDoc(collection(db, 'practicePlans'), duplicated.toFirestore());
      const savedDuplicate = { ...duplicated, id: docRef.id };
      
      setEditingPlan(savedDuplicate);
      setShowForm(true);
      navigate(`/practice/${docRef.id}/edit`);
    } catch (error) {
      console.error('Error duplicating practice plan:', error);
    }
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
    navigate('/practice');
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

  if (teamLoading || loading) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <div className="text-gray-500 dark:text-gray-400">Loading practice plans...</div>
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
            <div className="text-sm text-gray-400">Please select or create a team to view practice plans.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-accent-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto min-h-full">
        {/* Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Planner</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Plan and organize your team practices</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === 'list' ? 'bg-white dark:bg-slate-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <ListBulletIcon className="w-4 h-4" />
                  <span>List View</span>
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === 'calendar' ? 'bg-white dark:bg-slate-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>Calendar View</span>
                </button>
              </div>
              
              <button
                onClick={handleAddPlan}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-[1.02] font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                <span>New Practice Plan</span>
              </button>
            </div>
          </div>
        </div>

        {practicePlans.length === 0 ? (
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No practice plans yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Get started by creating your first practice plan. Plan drills, set focus areas, and organize your training sessions.
              </p>
              <button
                onClick={handleAddPlan}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 flex items-center space-x-2 shadow-lg shadow-primary-600/25 transition-all duration-200 hover:scale-[1.02] font-medium mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create Your First Practice Plan</span>
              </button>
            </div>
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
          <div className="space-y-6">
            {Object.entries(getPlansByMonth()).map(([month, plans]) => (
              <div key={month} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300">
                      {plans.length} plan{plans.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
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