import React from 'react';
import { MapPin, Navigation, Signal, WifiOff } from 'lucide-react';

interface GPSTrackingProps {
    projectId: string;
}

export const GPSTracking: React.FC<GPSTrackingProps> = ({ projectId }) => {
    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Live Team Locations</h3>
                        <p className="text-sm text-gray-500">Real-time GPS tracking for active crew members</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Live System Active</span>
                    </div>
                </div>

                <div className="relative aspect-video w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {/* Placeholder for Map - In a real app, this would be Google Maps, Leaflet, etc. */}
                    <div className="absolute inset-0 opacity-40">
                        {/* CSS-based grid to look like a map background */}
                        <div className="h-full w-full" style={{
                            backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}></div>
                    </div>

                    <div className="text-center z-10 px-6">
                        <div className="bg-white p-4 rounded-2xl shadow-xl max-w-sm border border-orange-100">
                            <MapPin className="w-10 h-10 text-orange-600 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-gray-900 mb-2">GPS Visualization Pending</h4>
                            <p className="text-sm text-gray-600 mb-6">
                                The live map view will be integrated here to show team member locations during active work hours.
                            </p>
                            <button className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200">
                                Configure Tracking
                            </button>
                        </div>
                    </div>

                    {/* Fake Pins */}
                    <div className="absolute top-1/4 left-1/3 animate-bounce shadow-lg">
                        <div className="bg-orange-600 p-1.5 rounded-full border-2 border-white">
                            <Navigation className="w-3 h-3 text-white fill-white rotate-45" />
                        </div>
                    </div>
                    <div className="absolute bottom-1/3 right-1/4 animate-bounce delay-150">
                        <div className="bg-blue-600 p-1.5 rounded-full border-2 border-white shadow-lg">
                            <Navigation className="w-3 h-3 text-white fill-white -rotate-45" />
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                            <Signal className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Signal Strength</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">Excellent</div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                            <Navigation className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Devices</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">4 Active</div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Site Zone</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">Main Cabin</div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                            <WifiOff className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Offline</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">1 Device</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GPSTracking;
