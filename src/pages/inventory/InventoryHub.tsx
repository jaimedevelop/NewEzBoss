import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, Wrench, Truck } from 'lucide-react';

export const InventoryHub: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Products',
      icon: Package,
      path: '/products',
      description: 'Materials and supplies inventory'
    },
    {
      title: 'Labor',
      icon: Users,
      path: '/labor',
      description: 'Labor rates and categories'
    },
    {
      title: 'Tools',
      icon: Wrench,
      path: '/tools',
      description: 'Tools and equipment tracking'
    },
    {
      title: 'Equipment',
      icon: Truck,
      path: '/equipment',
      description: 'Heavy equipment and rentals'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Inventory Management
          </h1>
          <p className="text-lg text-gray-600">
            Select a category to manage your inventory
          </p>
        </div>

        {/* Grid of Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-12 flex flex-col items-center justify-center space-y-6 min-h-[300px] border-2 border-transparent hover:border-blue-500 group"
              >
                <div className="bg-blue-50 rounded-full p-8 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-16 h-16 text-blue-600" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                    {section.title}
                  </h2>
                  <p className="text-gray-500">
                    {section.description}
                  </p>
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