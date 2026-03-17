import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const Report = () => {
  const [totalDue, setTotalDue] = useState(0);
  const [customers, setCustomers] = useState([]);      // list of customers with debt
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('eng-en', { style: 'currency', currency: 'AFN' }).format(amount);
  };

  // Fetch total debt and customer list on mount
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

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">

        {/* Header with decorative elements */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-primary"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="pr-4 text-3xl font-bold bg-gray-50">Debt List</span>
          </div>
          <p className="mt-2 ml-1 text-gray-600">
            Customers with outstanding balances
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
                <p className="text-gray-500 mt-2">Sum of all unpaid customer balances</p>
              </>
            )}
          </div>
        </div>

        {/* Customer Debt Table */}
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
              <thead className="bg-primary border-t ">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Customer Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Outstanding Debt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                      No customers with outstanding debt.
                    </td>
                  </tr>
                ) : (
                  customers.map((item, index) => (
                    <tr key={item.customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.customer.fullname}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-xl font-semibold">
                          {formatCurrency(item.totalDue)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;