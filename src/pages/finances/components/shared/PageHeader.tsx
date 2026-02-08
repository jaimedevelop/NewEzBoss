import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, DollarSign } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; path: string }[];
    actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, breadcrumbs, actions }) => {
    const navigate = useNavigate();

    return (
        <div className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {/* Back Arrow */}
                    <button
                        onClick={() => navigate('/finances')}
                        className="p-3 rounded-lg hover:bg-white hover:bg-opacity-30 transition-all"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>

                    {/* Icon */}
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                        <DollarSign className="h-8 w-8" />
                    </div>

                    <div>
                        {/* Breadcrumbs */}
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <nav className="flex items-center space-x-2 text-sm mb-2">
                                {breadcrumbs.map((crumb, index) => (
                                    <React.Fragment key={crumb.path}>
                                        <button
                                            onClick={() => navigate(crumb.path)}
                                            className="text-orange-100 hover:text-white transition-colors underline"
                                        >
                                            {crumb.label}
                                        </button>
                                        {index < breadcrumbs.length - 1 && (
                                            <ChevronRight size={16} className="text-orange-200" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </nav>
                        )}

                        <h1 className="text-3xl font-bold">{title}</h1>
                        {description && (
                            <p className="text-orange-100 text-lg mt-1">{description}</p>
                        )}
                    </div>
                </div>

                {actions && <div className="flex items-center space-x-3">{actions}</div>}
            </div>
        </div>
    );
};

export default PageHeader;
