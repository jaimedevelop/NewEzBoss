import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, Wrench, Truck } from 'lucide-react';
import { useIsMobile } from '../../mobile/inventory/useIsMobile';

const sections = [
  {
    title: 'Products',
    icon: Package,
    path: '/products',
    description: 'Materials and supplies inventory',
    gradient: 'from-orange-500 to-orange-600',
    hoverGradient: 'hover:from-orange-600 hover:to-orange-700',
    borderHover: 'hover:border-orange-500',
    accentColor: 'bg-orange-500'
  },
  {
    title: 'Labor',
    icon: Briefcase,
    path: '/labor',
    description: 'Labor rates and categories',
    gradient: 'from-purple-500 to-purple-600',
    hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
    borderHover: 'hover:border-purple-500',
    accentColor: 'bg-purple-500'
  },
  {
    title: 'Tools',
    icon: Wrench,
    path: '/tools',
    description: 'Tools and equipment tracking',
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
    borderHover: 'hover:border-blue-500',
    accentColor: 'bg-blue-500'
  },
  {
    title: 'Equipment & Rentals',
    icon: Truck,
    path: '/equipment',
    description: 'Heavy equipment and rentals',
    gradient: 'from-green-500 to-green-600',
    hoverGradient: 'hover:from-green-600 hover:to-green-700',
    borderHover: 'hover:border-green-500',
    accentColor: 'bg-green-500'
  }
];

export const InventoryHub: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-8 pb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Select a category</p>
        </div>
        <div className="px-4 space-y-3 pb-8">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${section.gradient} active:opacity-90 transition-opacity`}
              >
                <div className="bg-white bg-opacity-20 rounded-xl p-3 flex-shrink-0">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-white">{section.title}</p>
                  <p className="text-xs text-white text-opacity-80 mt-0.5">{section.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Inventory Management</h1>
          <p className="text-lg text-gray-600">Select a category to manage your inventory</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className={`
                  bg-gradient-to-br ${section.gradient} ${section.hoverGradient}
                  rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300
                  p-12 flex flex-col items-center justify-center space-y-6 min-h-[300px]
                  border-2 border-transparent ${section.borderHover}
                  transform hover:scale-105 group
                `}
              >
                <div className="bg-white bg-opacity-20 rounded-full p-8 group-hover:bg-opacity-30 transition-all group-hover:scale-110 transform duration-300">
                  <Icon className="w-16 h-16 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">{section.title}</h2>
                  <p className="text-white text-opacity-90 text-lg">{section.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryHub;