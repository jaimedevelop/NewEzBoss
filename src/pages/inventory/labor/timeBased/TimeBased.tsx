import React, { useState, useEffect } from 'react';
import { TimeHeader } from './components/TimeHeader';
import { TimeFilter } from './components/TimeFilter';
import { TimeTable } from './components/TimeTable';
import { TimeCreationModal } from './components/TimeCreationModal';

export interface TimeBasedLabor {
  id: string;
  roleName: string;
  description: string;
  hourlyRate: number;
  category: string;
  skillLevel: 'entry' | 'intermediate' | 'advanced' | 'expert';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TimeBased: React.FC = () => {
  const [roles, setRoles] = useState<TimeBasedLabor[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<TimeBasedLabor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TimeBasedLabor | null>(null);
  const [loading, setLoading] = useState(true);

  // Load roles from Firebase
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual Firebase call
      // const roleData = await getTimeBasedLabor();
      // setRoles(roleData);
      
      // Mock data for now
      const mockRoles: TimeBasedLabor[] = [
        {
          id: '1',
          roleName: 'Handyman Plumber',
          description: 'Entry-level plumbing work',
          hourlyRate: 20,
          category: 'Plumbing',
          skillLevel: 'entry',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          roleName: 'Experienced Plumber',
          description: 'Standard plumbing installations and repairs',
          hourlyRate: 30,
          category: 'Plumbing',
          skillLevel: 'intermediate',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          roleName: 'Foreman Plumber',
          description: 'Lead plumber with supervisory responsibilities',
          hourlyRate: 40,
          category: 'Plumbing',
          skillLevel: 'expert',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setRoles(mockRoles);
      setFilteredRoles(mockRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: TimeBasedLabor) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        // TODO: Call Firebase delete function
        // await deleteTimeBasedLabor(roleId);
        setRoles(roles.filter(r => r.id !== roleId));
        setFilteredRoles(filteredRoles.filter(r => r.id !== roleId));
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const handleSaveRole = async (roleData: Partial<TimeBasedLabor>) => {
    try {
      if (selectedRole) {
        // Update existing
        // TODO: Call Firebase update function
        const updatedRoles = roles.map(r => 
          r.id === selectedRole.id ? { ...r, ...roleData, updatedAt: new Date() } : r
        );
        setRoles(updatedRoles);
        setFilteredRoles(updatedRoles);
      } else {
        // Create new
        // TODO: Call Firebase create function
        const newRole: TimeBasedLabor = {
          id: Date.now().toString(),
          ...roleData as TimeBasedLabor,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setRoles([...roles, newRole]);
        setFilteredRoles([...filteredRoles, newRole]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleFilter = (searchTerm: string, category: string, skillLevel: string, status: string) => {
    let filtered = [...roles];

    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (category) {
      filtered = filtered.filter(role => role.category === category);
    }

    if (skillLevel) {
      filtered = filtered.filter(role => role.skillLevel === skillLevel);
    }

    if (status === 'active') {
      filtered = filtered.filter(role => role.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter(role => !role.isActive);
    }

    setFilteredRoles(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TimeHeader onAddRole={handleCreateRole} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TimeFilter onFilter={handleFilter} roles={roles} />
        
        <TimeTable
          roles={filteredRoles}
          loading={loading}
          onEdit={handleEditRole}
          onDelete={handleDeleteRole}
        />
      </div>

      {isModalOpen && (
        <TimeCreationModal
          role={selectedRole}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRole}
        />
      )}
    </div>
  );
};

export default TimeBased;