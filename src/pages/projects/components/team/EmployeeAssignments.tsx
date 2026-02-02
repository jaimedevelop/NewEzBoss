import React, { useState } from 'react';
import { Users, UserPlus, Search, MoreVertical, Mail, Phone, Calendar } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    assignedDate: string;
    avatar?: string;
}

interface EmployeeAssignmentsProps {
    projectId: string;
}

export const EmployeeAssignments: React.FC<EmployeeAssignmentsProps> = ({ projectId }) => {
    // Mock data for initial implementation
    const [employees] = useState<Employee[]>([
        {
            id: '1',
            name: 'John Doe',
            role: 'Project Manager',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            assignedDate: '2024-01-15',
        },
        {
            id: '2',
            name: 'Jane Smith',
            role: 'Site Supervisor',
            email: 'jane.smith@example.com',
            phone: '(555) 234-5678',
            assignedDate: '2024-01-16',
        },
        {
            id: '3',
            name: 'Mike Johnson',
            role: 'Lead Carpenter',
            email: 'mike.j@example.com',
            phone: '(555) 345-6789',
            assignedDate: '2024-01-20',
        },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search team members..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium whitespace-nowrap shadow-sm">
                    <UserPlus className="w-4 h-4" />
                    Assign Member
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map((employee) => (
                    <div key={employee.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group">
                        <button className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">
                                {employee.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 truncate">
                                    {employee.name}
                                </h3>
                                <p className="text-sm font-medium text-orange-600 mb-3 uppercase tracking-wider text-xs">
                                    {employee.role}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="truncate">{employee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{employee.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Assigned: {new Date(employee.assignedDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                                View Profile
                            </button>
                            <button className="flex-1 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent">
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {employees.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No team members assigned</p>
                    <p className="text-sm">Start by assigning employees to this project.</p>
                </div>
            )}
        </div>
    );
};

export default EmployeeAssignments;
