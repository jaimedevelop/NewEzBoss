import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { TimeBasedLabor } from '../TimeBased';

interface TimeFilterProps {
  onFilter: (searchTerm: string, category: string, skillLevel: string, status: string) => void;
  roles: TimeBasedLabor[];
}

export const TimeFilter: React.FC<TimeFilterProps> = ({ onFilter, roles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Extract unique categories from roles
  useEffect(() => {
    const uniqueCategories = Array.from(new Set(roles.map(r => r.category).filter(Boolean)));
    setCategories(uniqueCategories);
  }, [roles]);

  // Trigger filter whenever any filter changes
  useEffect(() => {
    onFilter(searchTerm, category, skillLevel, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, category, skillLevel, status]);

  const handleReset = () => {
    setSearchTerm('');
    setCategory('');
    setSkillLevel('');
    setStatus('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Skill Level Filter */}
        <div>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Skill Levels</option>
            <option value="entry">Entry</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Reset Button */}
          {(searchTerm || category || skillLevel || status) && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeFilter;