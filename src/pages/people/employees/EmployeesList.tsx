// src/pages/employees/components/EmployeesList.tsx

import React, { useState } from 'react';
import { useLetterNavigation } from '../hooks/useLetterNavigation';
import { Mail, Phone, MapPin, Edit2, Trash2, Calendar, DollarSign, UserCheck, UserX, AlertCircle, Copy } from 'lucide-react';
import { deleteEmployee, formatPhoneNumber, type Employee } from '../../../services/employees';

interface EmployeesListProps {
  employeesGrouped: Record<string, Employee[]>;
  isLoading: boolean;
  searchTerm?: string;
  onEditEmployee: (employee: Employee) => void;
  onDuplicateEmployee: (employee: Employee) => void;
  onEmployeeDeleted: () => void;
}

const EmployeesList: React.FC<EmployeesListProps> = ({
  employeesGrouped,
  isLoading,
  searchTerm = '',
  onEditEmployee,
  onDuplicateEmployee,
  onEmployeeDeleted,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { letters, activeLetter, listRef, sectionRefs, onScroll, jumpToLetter } =
    useLetterNavigation(employeesGrouped, searchTerm);

  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}?`)) {
      return;
    }

    setDeletingId(employeeId);
    const result = await deleteEmployee(employeeId);

    if (result.success) {
      onEmployeeDeleted();
    } else {
      alert(result.error || 'Failed to delete employee');
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No employees found</p>
          <p className="text-gray-400 text-sm mt-2">Click "Add Employee" to create your first employee</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[min(680px,65vh)] overflow-hidden">
      {/* Alphabetical Tabs */}
      <div className="w-12 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        {['All', ...letters].map(letter => (
          <button
            key={letter}
            aria-current={activeLetter === letter ? 'location' : undefined}
            onClick={() => jumpToLetter(letter)}
            className={`w-full py-2 text-sm font-semibold transition-colors ${activeLetter === letter
              ? 'bg-orange-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Employees List */}
      <div ref={listRef} onScroll={onScroll} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-6">
        <div className="space-y-4">
          {letters.map(letter => (
            <section className="last:min-h-[min(680px,65vh)]" key={letter} ref={element => { sectionRefs.current[letter] = element; }}>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">{letter}</h2>
              <div className="space-y-4">
          {employeesGrouped[letter].map(employee => (
            <div
              key={employee.id}
              data-person-card
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Name and Employee ID */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {employee.name || 'Unnamed Employee'}
                    </h3>
                    {employee.employeeId && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {employee.employeeId}
                      </span>
                    )}
                    {employee.isComplete === false && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3" />
                        Incomplete
                      </span>
                    )}
                    {employee.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        <UserCheck className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                        <UserX className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Role Badge */}
                  {employee.employeeRole && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded">
                        {employee.employeeRole}
                      </span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${employee.email}`} className="hover:text-orange-600">
                          {employee.email}
                        </a>
                      </div>
                    )}
                    {employee.phoneMobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${employee.phoneMobile}`} className="hover:text-orange-600">
                          {formatPhoneNumber(employee.phoneMobile)}
                        </a>
                        {employee.phoneOther && (
                          <span className="text-gray-400">
                            • {formatPhoneNumber(employee.phoneOther)}
                          </span>
                        )}
                      </div>
                    )}
                    {employee.address && employee.city && employee.state && employee.zipCode && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {employee.address}, {employee.city}, {employee.state} {employee.zipCode}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {employee.hireDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Hired: {new Date(`${employee.hireDate}T00:00:00`).toLocaleDateString()}</span>
                      </div>
                    )}
                    {employee.hourlyRate != null && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${employee.hourlyRate.toFixed(2)}/hr</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact */}
                  {employee.emergencyContactName && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Emergency Contact:</span> {employee.emergencyContactName}
                      {employee.emergencyContactPhone && (
                        <span> • {formatPhoneNumber(employee.emergencyContactPhone)}</span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {employee.notes && (
                    <p className="mt-2 text-sm text-gray-500 italic">
                      {employee.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEditEmployee(employee)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit employee"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDuplicateEmployee(employee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Duplicate employee"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id!, employee.name || 'this employee')}
                    disabled={deletingId === employee.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete employee"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeesList;
