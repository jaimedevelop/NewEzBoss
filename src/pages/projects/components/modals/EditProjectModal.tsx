// src/pages/projects/components/modals/EditProjectModal.tsx

import React, { useState, useEffect } from 'react';
import { X, FolderKanban, DollarSign } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { updateProject } from '../../../../services/projects';
import { getClients } from '../../../../services/clients/clients.queries';
import type { ProjectWithId, ServiceAddress, ProjectStatus } from '../../../../services/projects';
import type { Client } from '../../../../services/clients/clients.types';

interface EditProjectModalProps {
    project: ProjectWithId;
    onClose: () => void;
    onUpdated: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onUpdated }) => {
    const { currentUser } = useAuthContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // Form state
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [clientId, setClientId] = useState(project.clientId);
    const [projectType, setProjectType] = useState(project.projectType || '');
    const [status, setStatus] = useState<ProjectStatus>(project.status);
    const [startDate, setStartDate] = useState(project.startDate);
    const [estimatedEndDate, setEstimatedEndDate] = useState(project.estimatedEndDate);
    const [actualEndDate, setActualEndDate] = useState(project.actualEndDate || '');
    const [originalBudget, setOriginalBudget] = useState(project.originalBudget.toString());
    const [currentBudget, setCurrentBudget] = useState(project.currentBudget.toString());
    const [completionPercentage, setCompletionPercentage] = useState(project.completionPercentage.toString());

    // Address fields
    const [address, setAddress] = useState(project.serviceAddress.address);
    const [address2, setAddress2] = useState(project.serviceAddress.address2 || '');
    const [city, setCity] = useState(project.serviceAddress.city);
    const [state, setState] = useState(project.serviceAddress.state);
    const [zipCode, setZipCode] = useState(project.serviceAddress.zipCode);

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

        if (!project.id) return;

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

            const updates = {
                name,
                description,
                clientId,
                clientName: selectedClient.name,
                serviceAddress,
                startDate,
                estimatedEndDate,
                actualEndDate: actualEndDate || undefined,
                status,
                originalBudget: parseFloat(originalBudget) || 0,
                currentBudget: parseFloat(currentBudget) || 0,
                completionPercentage: parseInt(completionPercentage) || 0,
                projectType,
            };

            const result = await updateProject(project.id, updates);
            if (result.success) {
                onUpdated();
            } else {
                console.error('Failed to update project:', result.error);
            }
        } catch (error) {
            console.error('Error updating project:', error);
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
                        <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
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

                    {/* Status and Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status *
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                required
                            >
                                <option value="planning">Planning</option>
                                <option value="active">Active</option>
                                <option value="on-hold">On Hold</option>
                                <option value="completed">Completed</option>
                                <option value="invoiced">Invoiced</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                Estimated End *
                            </label>
                            <input
                                type="date"
                                value={estimatedEndDate}
                                onChange={(e) => setEstimatedEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Actual End
                            </label>
                            <input
                                type="date"
                                value={actualEndDate}
                                onChange={(e) => setActualEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Budget
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={currentBudget}
                                    onChange={(e) => setCurrentBudget(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Completion Percentage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Completion Percentage
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                value={completionPercentage}
                                onChange={(e) => setCompletionPercentage(e.target.value)}
                                className="flex-1"
                                min="0"
                                max="100"
                                step="5"
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                                {completionPercentage}%
                            </span>
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
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;
