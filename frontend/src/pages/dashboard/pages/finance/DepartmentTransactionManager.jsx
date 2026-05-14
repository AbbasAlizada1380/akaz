import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const DepartmentTransactionManager = () => {
    // State
    const [transactions, setTransactions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]); // for name resolution in table
    const [loading, setLoading] = useState(false);
    const [loadingDepts, setLoadingDepts] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [filterUser, setFilterUser] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
    });

    // Form data
    const [formData, setFormData] = useState({
        userId: '',
        depId: '',
        amount: '',
        is_deposit: true,
    });

    // Fetch users and all departments on mount
    useEffect(() => {
        fetchUsers();
        fetchAllDepartments();
    }, []);

    // Fetch transactions when filters or pagination change
    useEffect(() => {
        fetchTransactions();
    }, [filterUser, filterDept, filterType, pagination.currentPage]);

    const fetchAllDepartments = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/department`);
            setAllDepartments(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/users`);
            setUsers(res.data.data || res.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to load users');
        }
    };

    const fetchDepartmentsByUser = async (userId) => {
        setLoadingDepts(true);
        try {
            const res = await axios.get(`${BASE_URL}/department/user/${userId}`);
            setDepartments(res.data.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to load departments for this user');
            setDepartments([]);
        } finally {
            setLoadingDepts(false);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
            };
            if (filterUser) params.userId = filterUser;
            if (filterDept) params.depId = filterDept;
            if (filterType !== 'all') params.type = filterType;
            const res = await axios.get(`${BASE_URL}/departmentTransaction`, { params });
            setTransactions(res.data.data || []);
            setPagination(prev => ({
                ...prev,
                totalPages: res.data.pagination?.totalPages || 1,
                totalItems: res.data.pagination?.totalItems || 0,
            }));
        } catch (err) {
            console.error(err);
            alert('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const resetForm = () => {
        setFormData({ userId: '', depId: '', amount: '', is_deposit: true });
        setEditingId(null);
        setModalOpen(false);
        setDepartments([]);
    };

    const handleUserSelect = async (userId) => {
        setFormData(prev => ({ ...prev, userId, depId: '' }));
        if (userId) {
            await fetchDepartmentsByUser(userId);
        } else {
            setDepartments([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!formData.userId) {
            alert('Please select a user.');
            return;
        }
        if (!formData.depId || !formData.amount || parseFloat(formData.amount) <= 0) {
            alert('Please select a department and enter a valid amount.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                depId: parseInt(formData.depId),
                amount: parseFloat(formData.amount),
                is_deposit: formData.is_deposit,
                userId: parseInt(formData.userId),
            };
            if (editingId) {
                await axios.put(`${BASE_URL}/departmentTransaction/${editingId}`, payload);
                alert('Transaction updated successfully');
            } else {
                await axios.post(`${BASE_URL}/departmentTransaction`, payload);
                alert('Transaction created successfully');
            }
            resetForm();
            fetchTransactions();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (transaction) => {
        setEditingId(transaction.id);
        setFormData({
            userId: transaction.userId,
            depId: transaction.depId,
            amount: transaction.amount,
            is_deposit: transaction.is_deposit,
        });
        fetchDepartmentsByUser(transaction.userId);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${BASE_URL}/departmentTransaction/${deleteId}`);
            alert('Transaction deleted');
            setDeleteModalOpen(false);
            fetchTransactions();
        } catch (err) {
            console.error(err);
            alert('Delete failed');
        }
    };

    // Helper to get department name from allDepartments
    const getDepartmentName = (depId) => {
        const dept = allDepartments.find(d => d.id === depId);
        return dept ? dept.name : 'Unknown';
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.username || user.name || user.email || `User ${userId}` : `User ${userId}`;
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    // Department options for modal (based on selected user)
    const departmentOptions = departments.map(dept => (
        <option key={dept.id} value={dept.id}>{dept.name}</option>
    ));

    // User options for filter and modal
    const userOptions = users.map(user => (
        <option key={user.id} value={user.id}>
            {user.username || user.name || user.email || `User ${user.id}`}
        </option>
    ));

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Department Transactions</h1>
                <button
                    onClick={() => { resetForm(); setModalOpen(true); }}
                    className="bg-primary text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition"
                >
                    <FiPlus /> Add Transaction
                </button>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
                <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="">All Users</option>
                    {userOptions}
                </select>
                <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="">All Departments</option>
                    {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdraw">Withdraw</option>
                </select>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <td><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading...</td></td>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No transactions found</td></tr>
                            ) : (
                                transactions.map(tr => (
                                    <tr key={tr.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm text-gray-700">{getUserName(tr.userId)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{getDepartmentName(tr.depId)}</td>
                                        <td className="px-6 py-4 text-sm font-medium">${parseFloat(tr.amount).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tr.is_deposit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {tr.is_deposit ? 'Deposit' : 'Withdraw'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(tr.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleEdit(tr)} className="text-blue-600 hover:text-blue-800 mr-3" title="Edit">
                                                <FiEdit2 size={18} />
                                            </button>
                                            <button onClick={() => { setDeleteId(tr.id); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-800" title="Delete">
                                                <FiTrash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            Showing {transactions.length} of {pagination.totalItems}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronLeft />
                            </button>
                            <span className="px-4 py-2 text-sm">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={resetForm} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <FiX size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">User *</label>
                                <select
                                    name="userId"
                                    value={formData.userId}
                                    onChange={(e) => handleUserSelect(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="">Select a user</option>
                                    {userOptions}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Department *</label>
                                <select
                                    name="depId"
                                    value={formData.depId}
                                    onChange={handleFormChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                    disabled={!formData.userId || loadingDepts}
                                >
                                    <option value="">Select a department</option>
                                    {departmentOptions}
                                </select>
                                {loadingDepts && <p className="text-gray-500 text-xs mt-1">Loading departments...</p>}
                                {formData.userId && !loadingDepts && departments.length === 0 && (
                                    <p className="text-yellow-600 text-xs mt-1">No departments found for this user (no holdings).</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Amount ($)*</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleFormChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Transaction Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="is_deposit"
                                            checked={formData.is_deposit === true}
                                            onChange={() => setFormData({ ...formData, is_deposit: true })}
                                        />
                                        Deposit
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="is_deposit"
                                            checked={formData.is_deposit === false}
                                            onChange={() => setFormData({ ...formData, is_deposit: false })}
                                        />
                                        Withdraw
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                    {submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-96 p-6 text-center">
                        <div className="text-red-600 text-5xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
                        <p className="text-gray-600 mb-4">Are you sure you want to delete this transaction? This action cannot be undone.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentTransactionManager;