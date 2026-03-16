import React, { useState, useEffect } from 'react';
import { ShoppingBagIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Pagination from '../pagination/Pagination.jsx'; // adjust import path

const ReturnSellsModal = ({ isOpen, onClose, customer, baseUrl }) => {
  const [sells, setSells] = useState([]);
  const [loading, setLoading] = useState(false);
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState(null);
  const [unitPrice, setUnitePrice] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [selectedSell, setSelectedSell] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  // Renamed for clarity: now holds the quantity being returned
  const [returnedQuantity, setReturnedQuantity] = useState(0);
  const [refundMoney, setRefundMoney] = useState(0);

  // Reset page when customer changes
  useEffect(() => {
    if (customer) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [customer]);

  // Fetch sells when modal opens, customer changes, or page changes
  useEffect(() => {
    if (isOpen && customer) {
      fetchSells(pagination.page);
    }
  }, [isOpen, customer, pagination.page]);

  const fetchSells = async (page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${baseUrl}/customeraccount/customer/${customer.customer.id}/sells`, {
        params: { page, limit: pagination.limit },
      });
      setSells(res.data.data);
      setPagination({
        ...pagination,
        page: res.data.pagination.page,
        totalItems: res.data.pagination.totalItems,
        totalPages: res.data.pagination.totalPages,
        limit: res.data.pagination.limit,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (sell) => {
    setSelectedSell(sell);
    setReturnedQuantity(1);                     // default to 1 item
    setRefundMoney(sell.unitPrice);              // default refund = one item's price
    setReturnModalOpen(true);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const confirmReturn = async () => {
    try {
      console.log(returnedQuantity);
      console.log(unitPrice);
      console.log(refundMoney);
      console.log(selectedSell);
      setReturningId(selectedSell.id);
      await axios.post(`${baseUrl}/sells/return`, {
        unitPrice,
        quantity: returnedQuantity,       // backend expects quantity in this field
        refundedMoney: refundMoney,
        returnSell: selectedSell
      });
      setReturnModalOpen(false);
      setSelectedSell(null);

      await fetchSells(pagination.page);

      alert("Return processed successfully");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setReturningId(null);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('eng-en', {
      style: 'currency',
      currency: 'AFN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBagIcon className="w-5 h-5 text-primary" />
              Sells for {customer?.customer?.fullname}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
            )}

            {!loading && !error && sells.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBagIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No sells found for this customer.</p>
              </div>
            )}

            {!loading && !error && sells.length > 0 && (
              <>
                <ul className="space-y-4 mb-4">
                  {sells.map((sell) => {
                    const isReturned = sell.is_returned === true;
                    const total = parseFloat(sell.total);
                    const received = parseFloat(sell.received);
                    const remained = parseFloat(sell.remained);
                    const isFullyPaid = remained === 0;

                    return (
                      <li
                        key={sell.id}
                        className={`bg-gray-50 rounded-xl p-4 border transition-shadow ${isReturned ? 'border-red-200 opacity-60' : 'border-gray-200 hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                                #{sell.id}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(sell.createdAt).toLocaleDateString()}
                              </span>
                              {isReturned && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  Returned
                                </span>
                              )}
                              {!isReturned && (
                                <span
                                  className={`text-xs px-2 py-1 rounded ${isFullyPaid
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                >
                                  {isFullyPaid ? 'Paid' : 'Partial'}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Qty:</span>{' '}
                                <span className="font-medium">{sell.amount}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Unit Price:</span>{' '}
                                <span className="font-medium">{formatCurrency(sell.unitPrice)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Total:</span>{' '}
                                <span className="font-medium">{formatCurrency(total)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Received:</span>{' '}
                                <span className="font-medium">{formatCurrency(received)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Remained:</span>{' '}
                                <span className="font-medium text-primary">{formatCurrency(remained)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => openReturnModal(sell)}
                            disabled={returningId === sell.id || isReturned}
                            className={`ml-4 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2 ${isReturned
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                              }`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                            {returningId === sell.id ? 'Processing...' : 'Return'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>

          {returnModalOpen && selectedSell && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setReturnModalOpen(false)}
              />

              <div className="relative bg-white rounded-xl shadow-xl w-96 p-6 z-10">
                <h3 className="text-lg font-semibold mb-4">
                  Return Sell #{selectedSell.id}
                </h3>

                {/* Returned Quantity */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Returned Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedSell.amount}
                    value={returnedQuantity}
                    onChange={(e) => setReturnedQuantity(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                {/* Unit Price (read‑only) */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Unit Price (original)
                  </label>
                  <input
                    type="text"
                    value={unitPrice}
                    onChange={(e) => setUnitePrice(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  />
                </div>

                {/* Refund Money */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Refund Money
                  </label>
                  <input
                    type="number"
                    value={refundMoney}
                    onChange={(e) => setRefundMoney(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {/* Optional hint: show maximum possible refund based on returned quantity */}
                  <p className="text-xs text-gray-500 mt-1">
                    Max refund: {formatCurrency(returnedQuantity * selectedSell.unitPrice)}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setReturnModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmReturn}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Confirm Return
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnSellsModal;