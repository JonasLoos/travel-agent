import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, DollarSign, Plane } from 'lucide-react';

interface TravelPlanFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const TravelPlanForm: React.FC<TravelPlanFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    travelers: 1,
    budget: '',
    preferences: [] as string[],
    origin: ''
  });

  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const preferenceOptions = [
    'Beach & Relaxation',
    'Adventure & Outdoor',
    'Culture & History',
    'Food & Dining',
    'Shopping',
    'Nightlife',
    'Family-friendly',
    'Luxury',
    'Budget-friendly',
    'Romantic',
    'Business',
    'Solo Travel'
  ];

  const handlePreferenceToggle = (preference: string) => {
    setSelectedPreferences(prev => 
      prev.includes(preference) 
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }
    
    if (!formData.origin.trim()) {
      newErrors.origin = 'Departure location is required';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    } else {
      const startDate = new Date(formData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        newErrors.start_date = 'Start date cannot be in the past';
      }
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    
    if (formData.travelers < 1 || formData.travelers > 10) {
      newErrors.travelers = 'Number of travelers must be between 1 and 10';
    }
    
    if (formData.budget && parseFloat(formData.budget) < 0) {
      newErrors.budget = 'Budget cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      ...formData,
      preferences: selectedPreferences,
      budget: formData.budget ? parseFloat(formData.budget) : undefined
    };
    onSubmit(submitData);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Plan Your Trip</h2>
            <p className="text-sm text-gray-600">Tell us about your travel preferences</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Destination
          </label>
          <input
            type="text"
            required
            value={formData.destination}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, destination: e.target.value }));
              clearError('destination');
            }}
            placeholder="e.g., Paris, France"
            className={`input-field ${errors.destination ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.destination && (
            <p className="text-red-600 text-sm mt-1">{errors.destination}</p>
          )}
        </div>

        {/* Origin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Plane className="h-4 w-4 inline mr-2" />
            Departing From
          </label>
          <input
            type="text"
            required
            value={formData.origin}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, origin: e.target.value }));
              clearError('origin');
            }}
            placeholder="e.g., New York, NY"
            className={`input-field ${errors.origin ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.origin && (
            <p className="text-red-600 text-sm mt-1">{errors.origin}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, start_date: e.target.value }));
                clearError('start_date');
              }}
              className={`input-field ${errors.start_date ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.start_date && (
              <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, end_date: e.target.value }));
                clearError('end_date');
              }}
              className={`input-field ${errors.end_date ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.end_date && (
              <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>
            )}
          </div>
        </div>

        {/* Travelers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="h-4 w-4 inline mr-2" />
            Number of Travelers
          </label>
          <input
            type="number"
            min="1"
            max="10"
            required
            value={formData.travelers}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, travelers: parseInt(e.target.value) }));
              clearError('travelers');
            }}
            className={`input-field ${errors.travelers ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.travelers && (
            <p className="text-red-600 text-sm mt-1">{errors.travelers}</p>
          )}
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="h-4 w-4 inline mr-2" />
            Budget (Optional)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.budget}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, budget: e.target.value }));
              clearError('budget');
            }}
            placeholder="e.g., 5000"
            className={`input-field ${errors.budget ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank for flexible budget</p>
          {errors.budget && (
            <p className="text-red-600 text-sm mt-1">{errors.budget}</p>
          )}
        </div>

        {/* Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Travel Preferences (Select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {preferenceOptions.map((preference) => (
              <label
                key={preference}
                className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPreferences.includes(preference)}
                  onChange={() => handlePreferenceToggle(preference)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{preference}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
          >
            Create Travel Plan
          </button>
        </div>
      </form>
    </div>
  );
};

export default TravelPlanForm; 