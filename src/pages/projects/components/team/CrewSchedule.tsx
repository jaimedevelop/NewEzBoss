import React, { useState } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react';

interface ScheduleEntry {
    id: string;
    day: string;
    date: string;
    startTime: string;
    endTime: string;
    crewSize: number;
    activity: string;
}

interface CrewScheduleProps {
    projectId: string;
}

export const CrewSchedule: React.FC<CrewScheduleProps> = ({ projectId }) => {
    // Mock data for initial implementation
    const [schedule] = useState<ScheduleEntry[]>([
        {
            id: '1',
            day: 'Monday',
            date: 'Jan 29',
            startTime: '7:00 AM',
            endTime: '3:30 PM',
            crewSize: 3,
            activity: 'Foundation Reinforcement',
        },
        {
            id: '2',
            day: 'Tuesday',
            date: 'Jan 30',
            startTime: '7:00 AM',
            endTime: '4:00 PM',
            crewSize: 4,
            activity: 'Framing - North Wing',
        },
        {
            id: '3',
            day: 'Wednesday',
            date: 'Jan 31',
            startTime: '7:30 AM',
            endTime: '3:30 PM',
            crewSize: 3,
            activity: 'Exterior Sheathing',
        },
        {
            id: '4',
            day: 'Thursday',
            date: 'Feb 01',
            startTime: '7:00 AM',
            endTime: '4:00 PM',
            crewSize: 5,
            activity: 'Roof Trusses Installation',
        },
        {
            id: '5',
            day: 'Friday',
            date: 'Feb 02',
            startTime: '7:00 AM',
            endTime: '12:00 PM',
            crewSize: 3,
            activity: 'Site Cleanup and Inspection',
        },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button className="p-1 px-3 text-xs font-bold text-orange-600 bg-orange-50 rounded-md transition-all uppercase tracking-wider">Week</button>
                        <button className="p-1 px-3 text-xs font-bold text-gray-500 hover:text-gray-900 rounded-md transition-all uppercase tracking-wider">Month</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-bold text-gray-900">Jan 29 - Feb 04, 2024</span>
                        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm">
                    <Plus className="w-4 h-4" />
                    New Schedule
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {schedule.map((day) => (
                    <div key={day.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-200 hover:shadow-sm transition-all group flex flex-col md:flex-row md:items-center gap-6">
                        <div className="md:w-32 flex flex-col items-center md:items-start">
                            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">{day.day}</span>
                            <span className="text-xl font-black text-gray-900 leading-tight">{day.date}</span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{day.activity}</h4>
                                <span className="px-2 py-0.5 text-[10px] font-black bg-blue-50 text-blue-700 rounded uppercase tracking-tighter border border-blue-100">
                                    {day.crewSize} Crew
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5 font-medium">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {day.startTime} - {day.endTime}
                                </div>
                                <div className="flex items-center gap-1.5 font-medium">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    Main Site Area
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                                Edit
                            </button>
                            <button className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                                Notes
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-dashed border-gray-300">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                        <Calendar className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Schedule Intelligence</h4>
                        <p className="text-sm text-gray-600">Based on project estimates, your crew is fully utilized for the next 2 weeks.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrewSchedule;
