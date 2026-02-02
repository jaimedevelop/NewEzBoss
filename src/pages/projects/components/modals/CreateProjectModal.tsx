// src/pages/projects/components/modals/CreateProjectModal.tsx

import React, { useState, useEffect } from 'react';
import { X, FolderKanban, DollarSign } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { createProject } from '../../../../services/projects';
import { getClients } from '../../../../services/clients/clients.queries';
import type { ProjectData, ServiceAddress } from '../../../../services/projects';
import type { Client } from '../../../../services/clients/clients.types';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreated }) => {
    const { currentUser } = useAuthContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [clientId, setClientId] = useState('');
    const [projectType, setProjectType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [estimatedEndDate, setEstimatedEndDate] = useState('');
    const [originalBudget, setOriginalBudget] = useState('');

    // Address fields
    const [address, setAddress] = useState('');
    const [address2, setAddress2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        if (!currentUser?.uid) return;

        setIsLoadingClients(true);
        try {
            const result = await getClients(currentUser.uid);
            if (result.success && result.data) {
                setClients(result.data.clients);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setIsLoadingClients(false);
        }
    };

    const handleClientChange = (selectedClientId: string) => {
        setClientId(selectedClientId);

        // Auto-fill address if client has one
        const selectedClient = clients.find(c => c.id === selectedClientId);
        if (selectedClient?.address) {
            setAddress(selectedClient.address);
            setCity(selectedClient.city || '');
            setState(selectedClient.state || '');
            setZipCode(selectedClient.zipCode || '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser?.uid || !clientId) return;

        setIsSubmitting(true);
        try {
            const selectedClient = clients.find(c => c.id === clientId);
            if (!selectedClient) {
                console.error('Client not found');
                return;
            }

            const serviceAddress: ServiceAddress = {
                address,
                address2: address2 || undefined,
                city,
                state,
                zipCode,
            };

            const budget = parseFloat(originalBudget) || 0;

            const projectData: ProjectData = {
                name,
                description,
                clientId,
                clientName: selectedClient.name,
                serviceAddress,
                startDate,
                estimatedEndDate,
                status: 'planning',
                originalBudget: budget,
                currentBudget: budget,
                actualCost: 0,
                profitMargin: 0,
                phases: [],
                assignedEmployees: [],
                estimateIds: [],
                changeOrderIds: [],
                workOrderIds: [],
                purchaseOrderIds: [],
                completionPercentage: 0,
                projectType,
                tags: [],
                userId: currentUser.uid,
            };

            const result = await createProject(projectData);
            if (result.success) {
                onCreated();
            } else {
                console.error('Failed to create project:', result.error);
            }
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = () => {
        return (
            name.trim() !== '' &&
            clientId !== '' &&
            startDate !== '' &&
            estimatedEndDate !== '' &&
            address.trim() !== '' &&
            city.trim() !== '' &&
            state.trim() !== '' &&
            zipCode.trim() !== ''
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                    <div className="flex items-center gap-3">
                        <FolderKanban className="w-6 h-6 text-orange-600" />
                        <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-400"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                            placeholder="e.g., Kitchen Remodel - Smith Residence"
                            required
                        />
                    </div>

                    {/* Client Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Client *
                        </label>
                        {isLoadingClients ? (
                            <div className="text-sm text-gray-500">Loading clients...</div>
                        ) : (
                            <select
                                value={clientId}
                                onChange={(e) => handleClientChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                required
                            >
                                <option value="">Select a client</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Project Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Type
                        </label>
                        <select
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                        >
                            <option value="">Select type (optional)</option>
                            <option value="Residential">Residential</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Renovation">Renovation</option>
                            <option value="New Construction">New Construction</option>
                            <option value="Repair">Repair</option>
                        </select>
                    </div>

                    {/* Service Address */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Service Address *
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                            placeholder="Street address"
                            required
                        />
                        <input
                            type="text"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                            placeholder="Apt, suite, etc. (optional)"
                        />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                placeholder="City"
                                required
                            />
                            <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                placeholder="State"
                                required
                            />
                            <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                placeholder="ZIP"
                                required
                            />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estimated End Date *
                            </label>
                            <input
                                type="date"
                                value={estimatedEndDate}
                                onChange={(e) => setEstimatedEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Original Budget
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                value={originalBudget}
                                onChange={(e) => setOriginalBudget(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none resize-none"
                            rows={3}
                            placeholder="Brief description of the project..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || isSubmitting}
                        className="px-8 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin" />
                        ) : null}
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateProjectModal;
