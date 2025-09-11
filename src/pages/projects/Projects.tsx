import React, { useState, useMemo } from 'react';
import ProjectsHeader from './components/ProjectsHeader';
import ProjectsStats from './components/ProjectsStats';
import ProjectsSearchFilter from './components/ProjectsSearchFilter';
import ProjectsTable, { Project } from './components/ProjectsTable';
import ProjectModal from './components/ProjectModal';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: 'Sunset Plaza Construction',
      client: 'ABC Development Corp',
      clientEmail: 'contact@abcdev.com',
      clientPhone: '+1 (555) 123-4567',
      status: 'in-progress',
      progress: 75,
      startDate: '2024-12-01',
      endDate: '2025-02-15',
      budget: 450000,
      location: '123 Sunset Blvd, Los Angeles, CA',
      address: '123 Sunset Blvd, Los Angeles, CA 90028',
      teamSize: 8,
      projectType: 'commercial',
      description: 'Modern commercial plaza with retail spaces and office units'
    },
    {
      id: 2,
      name: 'Downtown Office Renovation',
      client: 'Metro Business Center',
      clientEmail: 'info@metrobiz.com',
      clientPhone: '+1 (555) 234-5678',
      status: 'planning',
      progress: 25,
      startDate: '2025-01-15',
      endDate: '2025-03-01',
      budget: 280000,
      location: '456 Main St, Downtown, CA',
      address: '456 Main St, Downtown, CA 90013',
      teamSize: 6,
      projectType: 'renovation',
      description: 'Complete office renovation including HVAC, electrical, and interior design'
    },
    {
      id: 3,
      name: 'Harbor View Apartments',
      client: 'Coastal Living LLC',
      clientEmail: 'projects@coastalliving.com',
      clientPhone: '+1 (555) 345-6789',
      status: 'in-progress',
      progress: 90,
      startDate: '2024-10-01',
      endDate: '2025-01-30',
      budget: 750000,
      location: '789 Harbor Dr, Marina, CA',
      address: '789 Harbor Dr, Marina, CA 90292',
      teamSize: 12,
      projectType: 'residential',
      description: 'Luxury apartment complex with ocean views and modern amenities'
    },
    {
      id: 4,
      name: 'Industrial Warehouse Build',
      client: 'Logistics Solutions Inc',
      clientEmail: 'construction@logisol.com',
      clientPhone: '+1 (555) 456-7890',
      status: 'on-hold',
      progress: 45,
      startDate: '2024-11-15',
      endDate: '2025-04-15',
      budget: 620000,
      location: '321 Industrial Way, Commerce, CA',
      address: '321 Industrial Way, Commerce, CA 90040',
      teamSize: 10,
      projectType: 'industrial',
      description: 'Large-scale warehouse facility with automated systems and loading docks'
    },
    {
      id: 5,
      name: 'Green Valley Shopping Center',
      client: 'Retail Development Group',
      clientEmail: 'development@rdgroup.com',
      clientPhone: '+1 (555) 567-8901',
      status: 'completed',
      progress: 100,
      startDate: '2024-08-01',
      endDate: '2024-12-15',
      budget: 920000,
      location: '555 Valley Rd, Green Valley, CA',
      address: '555 Valley Rd, Green Valley, CA 91390',
      teamSize: 15,
      projectType: 'commercial',
      description: 'Modern shopping center with anchor stores and dining facilities'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const inProgress = projects.filter(p => p.status === 'in-progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const overdue = projects.filter(p => {
      const endDate = new Date(p.endDate);
      const today = new Date();
      return endDate < today && p.status !== 'completed';
    }).length;
    const totalValue = projects.reduce((sum, p) => sum + p.budget, 0);

    return {
      totalProjects,
      inProgress,
      completed,
      overdue,
      totalValue
    };
  }, [projects]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'start-date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'end-date':
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case 'budget':
          return b.budget - a.budget;
        case 'progress':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchTerm, statusFilter, sortBy]);

  const handleNewProject = () => {
    setSelectedProject(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewProject = (project: Project) => {
    // For now, just edit - could implement a read-only view later
    handleEditProject(project);
  };

  const handleDeleteProject = (projectId: number) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const handleSaveProject = (projectData: Omit<Project, 'id'> | Project) => {
    if (modalMode === 'create') {
      const newProject: Project = {
        ...projectData as Omit<Project, 'id'>,
        id: Math.max(...projects.map(p => p.id), 0) + 1
      };
      setProjects(prev => [...prev, newProject]);
    } else {
      const updatedProject = projectData as Project;
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <ProjectsHeader onNewProject={handleNewProject} />

      {/* Stats */}
      <ProjectsStats stats={stats} />

      {/* Search and Filter */}
      <ProjectsSearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Projects Table */}
      <ProjectsTable
        projects={filteredAndSortedProjects}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onViewProject={handleViewProject}
      />

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
        project={selectedProject}
        mode={modalMode}
      />
    </div>
  );
};

export default Projects;