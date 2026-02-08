import React from 'react';
import { FileText, Plus, Receipt } from 'lucide-react';

interface QuickActionsProps {
    onImportStatement?: () => void;
    onAddPayment?: () => void;
    onCreateInvoice?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
    onImportStatement,
    onAddPayment,
    onCreateInvoice
}) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Import Statement */}
                <button
                    onClick={onImportStatement}
                    className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                >
                    <div className="p-3 bg-blue-100 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <FileText size={24} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-blue-900">Import Statement</span>
                </button>

                {/* Add Payment */}
                <button
                    onClick={onAddPayment}
                    className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all group"
                >
                    <div className="p-3 bg-orange-100 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Plus size={24} className="text-orange-600" />
                    </div>
                    <span className="text-sm font-semibold text-orange-900">Add Payment</span>
                </button>

                {/* Create Invoice */}
                <button
                    onClick={onCreateInvoice}
                    className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-xl transition-all group"
                >
                    <div className="p-3 bg-green-100 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Receipt size={24} className="text-green-600" />
                    </div>
                    <span className="text-sm font-semibold text-green-900">Create Invoice</span>
                </button>
            </div>
        </div>
    );
};

export default QuickActions;
