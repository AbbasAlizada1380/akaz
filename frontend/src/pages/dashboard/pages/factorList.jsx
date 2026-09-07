// components/FactorManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../pagination/Pagination.jsx';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FactorManager = ({ refreshKey }) => {
    // State
    const [factors, setFactors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [selectedFactor, setSelectedFactor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingFactor, setEditingFactor] = useState(null);
    const [showPendingOnly, setShowPendingOnly] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        factorNumber: '',
        sellerId: '',
        totalAmount: '',
        paidAmount: '',
        remainingAmount: '',
        status: 'unpaid',
        notes: '',
        mode: 'stock',
    });

    // Filters
    const [filterSellerId, setFilterSellerId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    // Fetch factors with pagination and filters
    const fetchFactors = async () => {
        setLoading(true);
        try {
            let url;
            if (showPendingOnly) {
                url = `${BASE_URL}/stockIncome/pending/factors?page=${currentPage}&limit=${limit}`;
            } else {
                url = `${BASE_URL}/factor?page=${currentPage}&limit=${limit}`;
            }
            
            if (filterSellerId) {
                url = `${BASE_URL}/factor/seller/${filterSellerId}`;
                if (dateFrom && dateTo) {
                    url = `${BASE_URL}/factor/range?from=${dateFrom}&to=${dateTo}&sellerId=${filterSellerId}`;
                }
            } else if (dateFrom && dateTo) {
                url = `${BASE_URL}/factor/range?from=${dateFrom}&to=${dateTo}`;
            }
            
            const res = await axios.get(url);
            if (res.data.success) {
                if (res.data.pagination) {
                    setFactors(res.data.factors || []);
                    setTotalItems(res.data.pagination.totalItems || 0);
                    setTotalPages(res.data.pagination.totalPages || 1);
                } else {
                    setFactors(res.data.factors || []);
                    setTotalItems(res.data.factors?.length || 0);
                    setTotalPages(1);
                }
            } else {
                throw new Error(res.data.message);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch sellers for dropdowns
    const fetchSellers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/seller/active`);
            setSellers(res.data.data || []);
        } catch (err) {
            console.error('Error fetching sellers:', err);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    useEffect(() => {
        fetchFactors();
    }, [currentPage, filterSellerId, dateFrom, dateTo, showPendingOnly, refreshKey]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterSellerId, dateFrom, dateTo, showPendingOnly]);

    // View factor details
    const handleView = async (id) => {
        try {
            const res = await axios.get(`${BASE_URL}/factor/${id}`);
            if (res.data.success) {
                setSelectedFactor(res.data.factor);
                setShowModal(true);
            }
        } catch (err) {
            alert('Failed to load factor details');
        }
    };

    // Approve pending factor
    const handleApprove = async (factorId) => {
        if (!window.confirm('Are you sure you want to approve this pending factor? This will add all items to stock.')) return;
        try {
            await axios.post(`${BASE_URL}/stockIncome/factor/${factorId}/approve`);
            alert('Factor approved successfully! All items added to stock.');
            fetchFactors();
        } catch (err) {
            alert('Failed to approve factor. Error: ' + err.response?.data?.message || err.message);
        }
    };

    // Reject pending factor
    const handleReject = async (factorId) => {
        if (!window.confirm('Are you sure you want to reject this pending factor? This will delete all associated records.')) return;
        try {
            await axios.post(`${BASE_URL}/stockIncome/factor/${factorId}/reject`);
            alert('Factor rejected successfully!');
            fetchFactors();
        } catch (err) {
            alert('Failed to reject factor. Error: ' + err.response?.data?.message || err.message);
        }
    };

    // Delete factor
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this factor?')) return;
        try {
            await axios.delete(`${BASE_URL}/factor/${id}`);
            fetchFactors();
        } catch (err) {
            alert('Delete failed.');
        }
    };

    // Open create form
    const handleCreate = () => {
        setEditingFactor(null);
        setFormData({
            factorNumber: `FACTOR-${Date.now()}`,
            sellerId: '',
            totalAmount: '',
            paidAmount: '',
            remainingAmount: '',
            status: 'unpaid',
            notes: '',
            mode: 'stock',
        });
        setShowForm(true);
    };

    // Open edit form
    const handleEdit = (factor) => {
        setEditingFactor(factor);
        setFormData({
            factorNumber: factor.factorNumber,
            sellerId: factor.sellerId,
            totalAmount: factor.totalAmount,
            paidAmount: factor.paidAmount,
            remainingAmount: factor.remainingAmount,
            status: factor.status,
            notes: factor.notes || '',
            mode: factor.mode || 'stock',
        });
        setShowForm(true);
    };

    // Submit create/update
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingFactor) {
                await axios.put(`${BASE_URL}/factor/${editingFactor.id}`, formData);
            } else {
                await axios.post(`${BASE_URL}/factor`, formData);
            }
            setShowForm(false);
            fetchFactors();
        } catch (err) {
            alert('Save failed.');
        }
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const closeModal = () => setShowModal(false);

    const formatCurrency = (amount) => {
        return `$${parseFloat(amount || 0).toFixed(2)}`;
    };

    const getStatusBadge = (status) => {
        const colors = {
            paid: 'bg-green-100 text-green-800',
            partial: 'bg-yellow-100 text-yellow-800',
            unpaid: 'bg-red-100 text-red-800',
        };
        return `px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`;
    };

    const getModeBadge = (mode) => {
        const colors = {
            stock: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
        };
        return `px-2 py-1 rounded text-xs font-medium ${colors[mode] || 'bg-gray-100'}`;
    };

    // Clear filters
    const clearFilters = () => {
        setFilterSellerId('');
        setDateFrom('');
        setDateTo('');
        setShowPendingOnly(false);
        setCurrentPage(1);
    };

    if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header with Create Button and Filters */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Factors Management</h1>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition"
                    >
                        + New Factor
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
                            <select
                                value={filterSellerId}
                                onChange={(e) => setFilterSellerId(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                            >
                                <option value="">All Sellers</option>
                                {sellers.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullname}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showPendingOnly}
                                    onChange={(e) => setShowPendingOnly(e.target.checked)}
                                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">Show Pending Only</span>
                            </label>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factor #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center">
                                            <div className="flex justify-center items-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : factors.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                            No factors found
                                        </td>
                                    </tr>
                                ) : (
                                    factors.map((factor) => (
                                        <tr key={factor.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <span className={getModeBadge(factor.mode)}>
                                                    {factor.mode === 'stock' ? 'In Stock' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm">{factor.factorNumber}</td>
                                            <td className="px-6 py-4">{factor.factorSeller?.fullname || '-'}</td>
                                            <td className="px-6 py-4 text-right font-medium">{formatCurrency(factor.totalAmount)}</td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(factor.paidAmount)}</td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(factor.remainingAmount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={getStatusBadge(factor.status)}>{factor.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{new Date(factor.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button
                                                    onClick={() => handleView(factor.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    View
                                                </button>
                                                {factor.mode === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(factor.id)}
                                                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(factor.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {factor.mode === 'stock' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(factor)}
                                                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(factor.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t px-6 py-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                    
                    {/* Total items info */}
                    {totalItems > 0 && (
                        <div className="px-6 py-3 border-t bg-gray-50 text-sm text-gray-500">
                            Showing {Math.min((currentPage - 1) * limit + 1, totalItems)} to {Math.min(currentPage * limit, totalItems)} of {totalItems} factors
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                {showModal && selectedFactor && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Factor {selectedFactor.factorNumber}</h2>
                                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <div className="space-y-2 mb-4">
                                <p><strong>Mode:</strong> <span className={getModeBadge(selectedFactor.mode)}>{selectedFactor.mode}</span></p>
                                <p><strong>Seller:</strong> {selectedFactor.factorSeller?.fullname || '-'}</p>
                                <p><strong>Date:</strong> {new Date(selectedFactor.createdAt).toLocaleString()}</p>
                                <p><strong>Total:</strong> {formatCurrency(selectedFactor.totalAmount)}</p>
                                <p><strong>Paid:</strong> {formatCurrency(selectedFactor.paidAmount)}</p>
                                <p><strong>Remaining:</strong> {formatCurrency(selectedFactor.remainingAmount)}</p>
                                <p><strong>Status:</strong> <span className={getStatusBadge(selectedFactor.status)}>{selectedFactor.status}</span></p>
                                {selectedFactor.notes && <p><strong>Notes:</strong> {selectedFactor.notes}</p>}
                            </div>
                            <h3 className="font-semibold mb-2">Associated Stock Incomes</h3>
                            {selectedFactor.incomeDetails?.length > 0 ? (
                                <table className="min-w-full border">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-1 text-left">ID</th>
                                            <th className="px-3 py-1 text-left">Product</th>
                                            <th className="px-3 py-1 text-right">Amount</th>
                                            <th className="px-3 py-1 text-right">Unit Price</th>
                                            <th className="px-3 py-1 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedFactor.incomeDetails.map(inc => (
                                            <tr key={inc.id} className="border-t">
                                                <td className="px-3 py-1">{inc.id}</td>
                                                <td className="px-3 py-1">{inc.stockIncomeStockExist?.name || `Exist ID ${inc.existId}`}</td>
                                                <td className="px-3 py-1 text-right">{inc.amount}</td>
                                                <td className="px-3 py-1 text-right">{formatCurrency(inc.net_unite_price)}</td>
                                                <td className="px-3 py-1 text-right">{formatCurrency(inc.amount * inc.net_unite_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500">No incomes linked.</p>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{editingFactor ? 'Edit Factor' : 'New Factor'}</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Factor Number *</label>
                                        <input
                                            type="text"
                                            value={formData.factorNumber}
                                            onChange={e => setFormData({ ...formData, factorNumber: e.target.value })}
                                            required
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seller *</label>
                                        <select
                                            value={formData.sellerId}
                                            onChange={e => setFormData({ ...formData, sellerId: e.target.value })}
                                            required
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        >
                                            <option value="">Select Seller</option>
                                            {sellers.map(s => (
                                                <option key={s.id} value={s.id}>{s.fullname}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                                        <select
                                            value={formData.mode}
                                            onChange={e => setFormData({ ...formData, mode: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        >
                                            <option value="stock">Add to Stock</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.totalAmount}
                                            onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.paidAmount}
                                            onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partial">Partial</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            rows="3"
                                            className="w-full border rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 border rounded-md hover:bg-gray-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition"
                                    >
                                        {editingFactor ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FactorManager;   