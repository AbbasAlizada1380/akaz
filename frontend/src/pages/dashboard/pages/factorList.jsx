// components/FactorManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../pagination/Pagination.jsx';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FactorManager = () => {
    // State
    const [factors, setFactors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [selectedFactor, setSelectedFactor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingFactor, setEditingFactor] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        factorNumber: '',
        sellerId: '',
        totalAmount: '',
        paidAmount: '',
        remainingAmount: '',
        status: 'unpaid',
        notes: '',
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
            let url = `${BASE_URL}/factor?page=${currentPage}&limit=${limit}`;
            if (filterSellerId) {
                // Use seller-specific endpoint
                url = `${BASE_URL}/factor/seller/${filterSellerId}`;
            } else if (dateFrom && dateTo) {
                url = `${BASE_URL}/factor/range?from=${dateFrom}&to=${dateTo}`;
                if (filterSellerId) url += `&sellerId=${filterSellerId}`;
            }
            const res = await axios.get(url);
            if (res.data.success) {
                if (filterSellerId && !dateFrom) {
                    // The seller endpoint returns factors array directly
                    setFactors(res.data.factors || []);
                    setTotalItems(res.data.factors?.length || 0);
                    setTotalPages(1); // client-side pagination for this view
                } else {
                    setFactors(res.data.factors || []);
                    if (res.data.pagination) {
                        setTotalItems(res.data.pagination.totalItems);
                        setTotalPages(res.data.pagination.totalPages);
                    } else {
                        setTotalItems(res.data.factors?.length || 0);
                        setTotalPages(1);
                    }
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
            const res = await axios.get(`${BASE_URL}/seller`);
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
    }, [currentPage, filterSellerId, dateFrom, dateTo]);

    // View factor details
    const handleView = async (id) => {
        try {
            const res = await axios.get(`${BASE_URL}/factor/${id}`);
            if (res.data.success) {
                setSelectedFactor(res.data.factor);
                // Also fetch incomes if needed (already included if using getFactorById)
                if (res.data.incomes) {
                    setSelectedFactor({ ...res.data.factor, incomes: res.data.incomes });
                }
                setShowModal(true);
            }
        } catch (err) {
            alert('Failed to load factor details');
        }
    };

    // Delete factor (requires backend DELETE /factor/:id)
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this factor?')) return;
        try {
            await axios.delete(`${BASE_URL}/factor/${id}`);
            fetchFactors(); // refresh
        } catch (err) {
            alert('Delete failed. Endpoint may not be implemented.');
        }
    };

    // Open create form
    const handleCreate = () => {
        setEditingFactor(null);
        setFormData({
            factorNumber: '',
            sellerId: '',
            totalAmount: '',
            paidAmount: '',
            remainingAmount: '',
            status: 'unpaid',
            notes: '',
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
        });
        setShowForm(true);
    };

    // Submit create/update (backend endpoints needed)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingFactor) {
                // PUT /factor/:id
                await axios.put(`${BASE_URL}/factor/${editingFactor.id}`, formData);
            } else {
                // POST /factor
                await axios.post(`${BASE_URL}/factor`, formData);
            }
            setShowForm(false);
            fetchFactors();
        } catch (err) {
            alert('Save failed. Backend endpoints may not be implemented.');
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

    if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
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
                                    <tr><td colSpan="8" className="px-6 py-12 text-center">Loading...</td></tr>
                                ) : factors.length === 0 ? (
                                    <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No factors found</td></tr>
                                ) : (
                                    factors.map((factor) => (
                                        <tr key={factor.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-sm">{factor.factorNumber}</td>
                                            <td className="px-6 py-4">{factor.seller?.fullname || '-'}</td>
                                            <td className="px-6 py-4 text-right font-medium">{formatCurrency(factor.totalAmount)}</td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(factor.paidAmount)}</td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(factor.remainingAmount)}</td>
                                            <td className="px-6 py-4"><span className={getStatusBadge(factor.status)}>{factor.status}</span></td>
                                            <td className="px-6 py-4 text-sm">{new Date(factor.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button onClick={() => handleView(factor.id)} className="text-blue-600 hover:text-blue-800">View</button>
                                                <button onClick={() => handleEdit(factor)} className="text-green-600 hover:text-green-800">Edit</button>
                                                <button onClick={() => handleDelete(factor.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {!filterSellerId && !dateFrom && !dateTo && totalPages > 1 && (
                        <div className="border-t px-6 py-4">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
                                <p><strong>Seller:</strong> {selectedFactor.seller?.fullname || '-'}</p>
                                <p><strong>Date:</strong> {new Date(selectedFactor.createdAt).toLocaleString()}</p>
                                <p><strong>Total:</strong> {formatCurrency(selectedFactor.totalAmount)}</p>
                                <p><strong>Paid:</strong> {formatCurrency(selectedFactor.paidAmount)}</p>
                                <p><strong>Remaining:</strong> {formatCurrency(selectedFactor.remainingAmount)}</p>
                                <p><strong>Status:</strong> <span className={getStatusBadge(selectedFactor.status)}>{selectedFactor.status}</span></p>
                                {selectedFactor.notes && <p><strong>Notes:</strong> {selectedFactor.notes}</p>}
                            </div>
                            <h3 className="font-semibold mb-2">Associated Stock Incomes</h3>
                            {selectedFactor.incomes?.length > 0 ? (
                                <table className="min-w-full border">
                                    <thead className="bg-gray-50">
                                        <tr><th className="px-3 py-1 text-left">ID</th><th className="px-3 py-1 text-left">Product</th><th className="px-3 py-1 text-right">Amount</th><th className="px-3 py-1 text-right">Unit Price</th><th className="px-3 py-1 text-right">Total</th></tr>
                                    </thead>
                                    <tbody>
                                        {selectedFactor.incomes.map(inc => (
                                            <tr key={inc.id} className="border-t">
                                                <td className="px-3 py-1">{inc.id}</td>
                                                <td className="px-3 py-1">{inc.stock?.name || `Exist ID ${inc.existId}`}</td>
                                                <td className="px-3 py-1 text-right">{inc.amount}</td>
                                                <td className="px-3 py-1 text-right">{formatCurrency(inc.unit_price)}</td>
                                                <td className="px-3 py-1 text-right">{formatCurrency(inc.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-gray-500">No incomes linked.</p>}
                        </div>
                    </div>
                )}

                {/* Create/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{editingFactor ? 'Edit Factor' : 'New Factor'}</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium">Factor Number *</label>
                                        <input type="text" value={formData.factorNumber} onChange={e => setFormData({ ...formData, factorNumber: e.target.value })} required className="w-full border rounded-md px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Seller *</label>
                                        <select value={formData.sellerId} onChange={e => setFormData({ ...formData, sellerId: e.target.value })} required className="w-full border rounded-md px-3 py-2">
                                            <option value="">Select Seller</option>
                                            {sellers.map(s => <option key={s.id} value={s.id}>{s.fullname}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Total Amount</label>
                                        <input type="number" step="0.01" value={formData.totalAmount} onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Paid Amount</label>
                                        <input type="number" step="0.01" value={formData.paidAmount} onChange={e => setFormData({ ...formData, paidAmount: e.target.value })} className="w-full border rounded-md px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded-md px-3 py-2">
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partial">Partial</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Notes</label>
                                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows="3" className="w-full border rounded-md px-3 py-2"></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Save</button>
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