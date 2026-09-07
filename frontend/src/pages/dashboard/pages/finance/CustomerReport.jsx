import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const CustomerReport = () => {
  const [totalDue, setTotalDue] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'AFN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Toggle customer expansion
  const toggleCustomer = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  // Fetch debt data
  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/customeraccount/debt`);
        if (res.data.success) {
          setCustomers(res.data.data || []);
          setTotalDue(res.data.total || 0);
        } else {
          setError('Failed to load debt data');
        }
      } catch (err) {
        console.error('Error fetching debt data:', err);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchDebtData();
  }, []);

  // Get color for department (same as SellerReport)
  const getDepartmentColor = (index) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-rose-100 text-rose-800 border-rose-200',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-primary"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="pr-4 text-3xl font-bold bg-gray-50">Customer Debt List</span>
          </div>
          <p className="mt-2 ml-1 text-gray-600">
            Customers with outstanding balances by department
          </p>
        </div>

        {/* Total Outstanding Debt Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-primary">
          <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Total Outstanding Debt</h2>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : (
              <>
                <div className="text-4xl font-bold text-primary">{formatCurrency(totalDue)}</div>
                <p className="text-gray-500 mt-2">Sum of all unpaid customer balances across all departments</p>
              </>
            )}
          </div>
        </div>

        {/* Customer Debt Table with Expandable Rows */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary">
          <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Customers with Debt</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Customer Name</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Total Debt</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Departments</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No customers with outstanding debt.
                    </td>
                  </tr>
                ) : (
                  customers.map((item, index) => (
                    <React.Fragment key={item.customer.id}>
                      {/* Main Row */}
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer" 
                        onClick={() => toggleCustomer(item.customer.id)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {item.customer.fullname}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-xl font-semibold">
                            {formatCurrency(item.total_due)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.departments?.map((dept, idx) => (
                              <span key={idx} className={`px-2 py-0.5 text-xs rounded-full ${getDepartmentColor(idx)}`}>
                                {dept.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            className="text-primary hover:text-primary-dark transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCustomer(item.customer.id);
                            }}
                          >
                            <svg className={`w-5 h-5 transform transition-transform ${expandedCustomer === item.customer.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row - Department Breakdown */}
                      {expandedCustomer === item.customer.id && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-gray-50">
                            <div className="ml-4 border-l-4 border-primary pl-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Department Breakdown for {item.customer.fullname}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.departments?.map((dept, idx) => (
                                  <div key={idx} className={`border rounded-lg p-3 ${getDepartmentColor(idx)}`}>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">{dept.name}</span>
                                      <span className="text-sm font-bold">{formatCurrency(dept.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 text-sm text-gray-600">
                                Total Departments: <span className="font-semibold">{item.departments?.length || 0}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with summary */}
          {!loading && !error && customers.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total Customers: <span className="font-semibold">{customers.length}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Total Debt: <span className="font-semibold text-primary">{formatCurrency(totalDue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerReport;