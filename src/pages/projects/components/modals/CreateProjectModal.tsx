import React, { useState, useEffect, useId } from 'react';
import { DollarSign } from 'lucide-react';
import { ProjectFormDialog } from './ProjectFormDialog';
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
    const fieldId = useId();
    const { currentUser } = useAuthContext();
    const [creationRequestId] = useState(() => crypto.randomUUID());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

        const selectedClient = clients.find(c => c.id === selectedClientId);
        const useBilling = selectedClient?.billingEqualToService !== false;
        setAddress((useBilling ? selectedClient?.billingAddress : selectedClient?.serviceAddress) ?? '');
        setAddress2((useBilling ? selectedClient?.billingAddress2 : selectedClient?.serviceAddress2) ?? '');
        setCity((useBilling ? selectedClient?.billingCity : selectedClient?.serviceCity) ?? '');
        setState((useBilling ? selectedClient?.billingState : selectedClient?.serviceState) ?? '');
        setZipCode((useBilling ? selectedClient?.billingZipCode : selectedClient?.serviceZipCode) ?? '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting || !currentUser?.uid || !clientId) return;

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

            const budget = parseFloat(originalBudget) || 0;

            const projectData: ProjectData = {
                name,
                description,
                clientId,
                clientName: selectedClient.companyName || selectedClient.name || "",
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

            const result = await createProject(projectData, creationRequestId);
            if (result.success) {
                onCreated();
            } else {
                setError(result.error instanceof Error ? result.error.message : 'Failed to create project.');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to create project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProjectFormDialog
            title="Create New Project"
            submitLabel="Create Project"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label htmlFor={`${fieldId}-estimatedEndDate`}>Estimated End Date<span aria-hidden="true" className="ml-1 text-red-500">*</span></label>
                            <input
                                type="date"
                                id={`${fieldId}-estimatedEndDate`}
                                value={estimatedEndDate}
                                onChange={(e) => setEstimatedEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

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
                </div>
            }
        />
    );
};

export default CreateProjectModal;
