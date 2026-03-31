import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine, Sparkles } from 'lucide-react';

const CollectionCreationOption: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-xl w-full">
                {/* Back */}
                <button
                    onClick={() => navigate('/collections')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-8 text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Collections
                </button>

                {/* Heading */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Create a Collection</h1>
                    <p className="text-gray-500">
                        Build a new job template manually or let AI select items from your inventory.
                    </p>
                </div>

                {/* Option cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Manual */}
                    <button
                        onClick={() => navigate('/collections/new')}
                        className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-gray-400 transition-all duration-300 hover:shadow-md"
                    >
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4 group-hover:bg-gray-200 transition-colors">
                                <PenLine className="w-6 h-6 text-gray-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Create Manually</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Set up your collection step by step — choose a trade, add category tabs, and
                                select items yourself.
                            </p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {/* AI */}
                    <button
                        onClick={() => navigate('/collections/ai')}
                        className="group relative overflow-hidden bg-white border-2 border-orange-200 rounded-xl p-6 text-left hover:border-orange-500 transition-all duration-300 hover:shadow-md"
                    >
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
                                <Sparkles className="w-6 h-6 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Create with AI</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Describe a job in plain English and AI will scan your inventory and build the
                                collection for you.
                            </p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Badge */}
                        <span className="absolute top-3 right-3 text-xs bg-orange-100 text-orange-600 font-medium px-2 py-0.5 rounded-full">
                            New
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CollectionCreationOption;