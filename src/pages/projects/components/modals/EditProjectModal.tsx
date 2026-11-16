import React, { useState, useEffect, useId } from 'react';
import { DollarSign } from 'lucide-react';
import { ProjectFormDialog } from './ProjectFormDialog';
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
    const fieldId = useId();
    const { currentUser } = useAuthContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
    const [tags, setTags] = useState((project.tags ?? []).join('\n'));

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
        if (selectedClient?.serviceAddress || selectedClient?.billingAddress) {
            setAddress((selectedClient.billingEqualToService ? selectedClient.billingAddress : selectedClient.serviceAddress) || "");
            setCity((selectedClient.billingEqualToService ? selectedClient.billingCity : selectedClient.serviceCity) || '');
            setState((selectedClient.billingEqualToService ? selectedClient.billingState : selectedClient.serviceState) || '');
            setZipCode((selectedClient.billingEqualToService ? selectedClient.billingZipCode : selectedClient.serviceZipCode) || '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting || !project.id) return;

        setIsSubmitting(true);
        setError(null);
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
                clientName: selectedClient.companyName || selectedClient.name || "",
                serviceAddress,
                startDate,
                estimatedEndDate,
                actualEndDate: actualEndDate || null,
                status,
                originalBudget: parseFloat(originalBudget) || 0,
                currentBudget: parseFloat(currentBudget) || 0,
                completionPercentage: Number(completionPercentage),
                tags: tags === (project.tags ?? []).join('\n') ? project.tags : tags.split('\n').map(tag => tag.trim()).filter(Boolean),
                projectType,
            };

            const result = await updateProject(project.id, {...updates, version: project.version});
            if (result.success) {
                onUpdated();
            } else {
                setError(result.error instanceof Error ? result.error.message : 'Failed to update project.');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to update project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProjectFormDialog
            title="Edit Project"
            submitLabel="Save Changes"
            canSubmit={!isLoadingClients}
            isSubmitting={isSubmitting}
            error={error}
            onClose={onClose}
            onSubmit={handleSubmit}
            general={
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor={`${fieldId}-name`}>Project Name<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                        <input
                            type="text"
                            id={`${fieldId}-name`}
                            pattern={'.*\\S.*'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Kitchen Remodel - Smith Residence"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor={`${fieldId}-status`}>Status<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                        <select
                            id={`${fieldId}-status`}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
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
                        <label htmlFor={`${fieldId}-projectType`}>Project Type</label>
                        <select
                            id={`${fieldId}-projectType`}
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
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

                    <div>
                        <label htmlFor={`${fieldId}-clientId`}>Client<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                        {isLoadingClients ? (
                            <div className="text-sm text-gray-500">Loading clients...</div>
                        ) : (
                            <select
                                id={`${fieldId}-clientId`}
                                value={clientId}
                                onChange={(e) => handleClientChange(e.target.value)}
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

                    <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-description`}>Description</label>
                        <textarea
                            id={`${fieldId}-description`}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Brief description of the project..."
                        />
                    </div>
                </div>
            }
            address={
                <div className="grid gap-4">
                    <div className="grid gap-4">
                        <input
                            type="text"
                            pattern={'.*\\S.*'}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            aria-label="Street address"
                            placeholder="Street address"
                            required
                        />
                        <input
                            type="text"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            aria-label="Apt, suite, etc. (optional)"
                            placeholder="Apt, suite, etc. (optional)"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <input
                                type="text"
                                pattern={'.*\\S.*'}
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                aria-label="City"
                                placeholder="City"
                                required
                            />
                            <input
                                type="text"
                                pattern={'.*\\S.*'}
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                aria-label="State"
                                placeholder="State"
                                required
                            />
                            <input
                                type="text"
                                pattern={'.*\\S.*'}
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                aria-label="ZIP"
                                placeholder="ZIP"
                                required
                            />
                        </div>
                    </div>
                </div>
            }
            schedule={
                <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor={`${fieldId}-startDate`}>Start Date<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                            <input
                                type="date"
                                id={`${fieldId}-startDate`}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor={`${fieldId}-estimatedEndDate`}>Estimated End<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                            <input
                                type="date"
                                id={`${fieldId}-estimatedEndDate`}
                                value={estimatedEndDate}
                                onChange={(e) => setEstimatedEndDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor={`${fieldId}-actualEndDate`}>Actual End</label>
                            <input
                                type="date"
                                id={`${fieldId}-actualEndDate`}
                                value={actualEndDate}
                                onChange={(e) => setActualEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${fieldId}-originalBudget`}>Original Budget</label>
                            <div className="relative">
                                <DollarSign aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    id={`${fieldId}-originalBudget`}
                                    value={originalBudget}
                                    onChange={(e) => setOriginalBudget(e.target.value)}
                                    className="project-form-currency"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor={`${fieldId}-currentBudget`}>Current Budget</label>
                            <div className="relative">
                                <DollarSign aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    id={`${fieldId}-currentBudget`}
                                    value={currentBudget}
                                    onChange={(e) => setCurrentBudget(e.target.value)}
                                    className="project-form-currency"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            }
            progress={
                <div className="grid gap-4">
                    <div>
                        <label htmlFor={`${fieldId}-completionPercentage`}>Completion Percentage</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                id={`${fieldId}-completionPercentage`}
                                value={completionPercentage}
                                onChange={(e) => setCompletionPercentage(e.target.value)}
                                className="flex-1 min-w-0"
                                min="0"
                                max="100"
                                step="any"
                                required
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                                {completionPercentage}%
                            </span>
                        </div>
                    </div>

                    <label className="block text-sm font-medium text-gray-700">
                        Tags (one per line)
                        <textarea className="mt-1"
                            value={tags} onChange={event => setTags(event.target.value)} rows={3} />
                    </label>
                </div>
            }
        />
    );
};

export default EditProjectModal;
