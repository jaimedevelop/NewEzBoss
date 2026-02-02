import React, { useState } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';

interface TimeEntry {
    id: string;
    employeeName: string;
    date: string;
    description: string;
    hours: number;
    status: 'approved' | 'pending' | 'rejected';
}

interface TimecardSectionProps {
    projectId: string;
}

export const TimecardSection: React.FC<TimecardSectionProps> = ({ projectId }) => {
    // Mock data for initial implementation
    const [entries] = useState<TimeEntry[]>([
        {
            id: '1',
            employeeName: 'John Doe',
            date: '2024-01-28',
            description: 'Site survey and foundation check',
            hours: 8.5,
            status: 'approved',
        },
        {
            id: '2',
            employeeName: 'Jane Smith',
            date: '2024-01-28',
            description: 'Material coordination and safety briefing',
            hours: 7,
            status: 'approved',
        },
        {
            id: '3',
            employeeName: 'Mike Johnson',
            date: '2024-01-29',
            description: 'Framing work - North wall',
            hours: 9,
            status: 'pending',
        },
    ]);

    const totalHours = entries.reduce((acc, entry) => acc + entry.hours, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-sm font-semibold text-orange-800 uppercase tracking-wider">Total Hours</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
                    <p className="text-sm text-orange-700 mt-1">For this project</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Period</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">This Week</div>
                    <p className="text-sm text-blue-700 mt-1">Jan 28 - Feb 03</p>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FileText className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-green-800 uppercase tracking-wider">Status</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">2 Pending</div>
                    <p className="text-sm text-green-700 mt-1">Awaiting approval</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200">
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <h3 className="text-sm font-bold text-gray-900 mx-2">January 2024</h3>
                        <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200">
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <Download className="w-4 h-4" />
                        Report
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {new Date(entry.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        {entry.employeeName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {entry.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                        {entry.hours}h
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${entry.status === 'approved'
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TimecardSection;
