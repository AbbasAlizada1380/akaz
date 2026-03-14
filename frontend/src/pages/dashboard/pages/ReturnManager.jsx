import React, { useState, useEffect } from 'react';
import { UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import ReturnSellsModal from './ReturnSellsModal'; // we'll create this next

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ReturnManager = () => {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const res = await axios.get(`${BASE_URL}/customeraccount`);
        setCustomers(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  if (loadingCustomers) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <span className="bg-primary/10 p-2 rounded-lg">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </span>
        Return Manager
      </h2>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-500" />
            Customers ({customers.length})
          </h3>
        </div>
        <div className="p-4 max-h-[600px] overflow-y-auto">
          {customers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No customers found</p>
          ) : (
            <ul className="space-y-2">
              {Array.isArray(customers) &&
                customers.map((acc) => (
                  <li key={acc.id}>
                    <button
                      onClick={() => handleCustomerClick(acc)}
                      className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        {acc.customer.fullname}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <PhoneIcon className="w-3 h-3" />
                        {acc.customer.phoneNumber || '—'}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Total sells:</span>
                        <span className="font-semibold">{acc.total?.length || 0}</span>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      <ReturnSellsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        customer={selectedCustomer}
        baseUrl={BASE_URL}
      />
    </div>
  );
};

export default ReturnManager;