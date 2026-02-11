import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import FinancesSummaryCards from './components/hub/FinancesSummaryCards';
import FinancesAlertBanner from './components/hub/FinancesAlertBanner';
import BankAccountsHubCard from './components/hub/BankAccountsHubCard';
import BudgetHubCard from './components/hub/BudgetHubCard';
import CalendarHubCard from './components/hub/CalendarHubCard';
import CashFlowProjection from './components/hub/CashFlowProjection';
import QuickActions from './components/hub/QuickActions';
import { useAuthContext } from '../../contexts/AuthContext';
import { subscribeToBankAccounts, type BankAccount } from '../../services/finances/bank';
import { subscribeToPayments, type Payment } from '../../services/finances';
import { DollarSign } from 'lucide-react';

const Finances: React.FC = () => {
    const { currentUser } = useAuthContext();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [showAlert, setShowAlert] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubAccounts = subscribeToBankAccounts(currentUser.uid, setAccounts);
        const unsubPayments = subscribeToPayments(currentUser.uid, setPayments);

        return () => {
            unsubAccounts();
            unsubPayments();
        };
    }, [currentUser?.uid]);

    // Calculate metrics
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Placeholder calculations - will be replaced with real data
    const monthlyBurnRate = -8150;
    const lifestyleRequirement = 6500;
    const currentMonthIncome = 3200;
    const monthStatus: 'on-track' | 'warning' | 'critical' =
        currentMonthIncome >= lifestyleRequirement * 0.75 ? 'on-track' :
            currentMonthIncome >= lifestyleRequirement * 0.5 ? 'warning' : 'critical';

    // Get recent transactions (placeholder - will need to fetch from transactions collection)
    const recentTransactions = [
        { id: '1', description: 'Client Payment - Project ABC', amount: 2500, date: new Date(2026, 1, 5) },
        { id: '2', description: 'Office Supplies', amount: -150, date: new Date(2026, 1, 4) },
        { id: '3', description: 'Contractor Payment', amount: -800, date: new Date(2026, 1, 3) },
    ];

    // Get upcoming payments
    const upcomingPayments = payments
        .filter(p => {
            const dueDate = p.dueDate instanceof Date ? p.dueDate :
                typeof p.dueDate === 'string' ? new Date(p.dueDate) :
                    p.dueDate.toDate();
            return dueDate > new Date();
        })
        .sort((a, b) => {
            const dateA = a.dueDate instanceof Date ? a.dueDate :
                typeof a.dueDate === 'string' ? new Date(a.dueDate) :
                    a.dueDate.toDate();
            const dateB = b.dueDate instanceof Date ? b.dueDate :
                typeof b.dueDate === 'string' ? new Date(b.dueDate) :
                    b.dueDate.toDate();
            return dateA.getTime() - dateB.getTime();
        })
        .map(p => ({
            id: p.id!,
            name: p.title,
            amount: p.amount,
            dueDate: p.dueDate instanceof Date ? p.dueDate :
                typeof p.dueDate === 'string' ? new Date(p.dueDate) :
                    p.dueDate.toDate()
        }));

    // Check for financial warnings
    const hasWarning = upcomingPayments.length > 0 && totalBalance < upcomingPayments[0].amount * 2;
    const warningMessage = hasWarning
        ? `Warning: You have $${upcomingPayments[0]?.amount.toFixed(0)} in bills due soon but your current balance is $${totalBalance.toFixed(0)}`
        : '';

    return (
        <div className="space-y-8">
            {/* Header */}
            <VariableHeader
                title="Finances"
                subtitle="Track your cash position, budget, and upcoming financial obligations."
                Icon={DollarSign}
            />

            {/* Summary Cards */}
            <FinancesSummaryCards
                currentCashPosition={totalBalance}
                monthlyBurnRate={monthlyBurnRate}
                lifestyleRequirement={lifestyleRequirement}
                monthStatus={monthStatus}
            />

            {/* Alert Banner */}
            {hasWarning && showAlert && (
                <FinancesAlertBanner
                    message={warningMessage}
                    severity="warning"
                    onDismiss={() => setShowAlert(false)}
                />
            )}

            {/* Three Main Section Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BankAccountsHubCard
                    totalBalance={totalBalance}
                    recentTransactions={recentTransactions}
                />

                <BudgetHubCard
                    income={currentMonthIncome}
                    lifestyleRequirement={lifestyleRequirement}
                    currentMonthProgress={currentMonthIncome}
                    currentMonthGoal={lifestyleRequirement}
                />

                <CalendarHubCard
                    upcomingPayments={upcomingPayments}
                />
            </div>

            {/* Bottom Section */}
            <div className="space-y-6">
                <CashFlowProjection />

                <QuickActions
                    onImportStatement={() => navigate('/finances/bank')}
                    onAddPayment={() => navigate('/finances/calendar')}
                    onCreateInvoice={() => {
                        // Placeholder - implement invoice creation
                        console.log('Create invoice clicked');
                    }}
                />
            </div>
        </div>
    );
};

export default Finances;
