import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX } from 'react-icons/fi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockIncomeManager = () => {
    const [stockIncomes, setStockIncomes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewingRecord, setViewingRecord] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    // State for inline seller addition
    const [addingSeller, setAddingSeller] = useState(false);
    const [newSellerName, setNewSellerName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Specifications state
    const [specs, setSpecs] = useState([]);
    const [editingSpec, setEditingSpec] = useState(null);
    const [newSpec, setNewSpec] = useState({ key: '', value: '' });

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        quantity: 0,
        unitPrice: 0,
        received: 0,
        departmentId: '',
        sellerId: '',
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filters, setFilters] = useState({ department: null, type: null });

    // Specifications helper functions (unchanged)
    const handleAddSpec = () => {
        if (newSpec.key.trim() && newSpec.value.trim()) {
            if (editingSpec !== null) {
                const updatedSpecs = [...specs];
                updatedSpecs[editingSpec] = newSpec;
                setSpecs(updatedSpecs);
                setEditingSpec(null);
            } else {
                setSpecs([...specs, newSpec]);
            }
            setNewSpec({ key: '', value: '' });
        }
    };

    const handleEditSpec = (index) => {
        setNewSpec(specs[index]);
        setEditingSpec(index);
    };

    const handleRemoveSpec = (index) => {
        setSpecs(specs.filter((_, i) => i !== index));
        if (editingSpec === index) {
            setEditingSpec(null);
            setNewSpec({ key: '', value: '' });
        }
    };

    const handleCancelEdit = () => {
        setEditingSpec(null);
        setNewSpec({ key: '', value: '' });
    };

    const specsToJSON = () => {
        const jsonObj = {};
        specs.forEach(spec => {
            if (spec.key && spec.value) {
                jsonObj[spec.key] = spec.value;
            }
        });
        return jsonObj;
    };

    const jsonToSpecs = (json) => {
        if (!json) return [];
        return Object.entries(json).map(([key, value]) => ({ key, value }));
    };

    // Fetch all data
    useEffect(() => {
        fetchStockIncomes();
        fetchDepartments();
        fetchSellers();
    }, []);

    const fetchStockIncomes = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/stockIncome`);
            setStockIncomes(response.data);
        } catch (error) {
            showNotification('Failed to fetch stock incomes', 'error');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/department`);
            setDepartments(response.data.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchSellers = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/seller`);
            setSellers(response.data.data);
        } catch (error) {
            console.error('Error fetching sellers:', error);
        }
    };

    const showNotification = (message, type = 'success') => {
        alert(message);
    };

    const calculateTotals = (values) => {
        const quantity = Number(values.quantity) || 0;
        const unitPrice = Number(values.unitPrice) || 0;
        const received = Number(values.received) || 0;

        const total = quantity * unitPrice;
        const remaining = total - received;

        return {
            ...values,
            total,
            remaining: remaining > 0 ? remaining : 0
        };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNumberChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Updated submit handler – now can send either sellerId or newSellerName
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        // Basic validation
        if (!formData.name || !formData.departmentId) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Seller validation
        if (!addingSeller && !formData.sellerId) {
            showNotification('Please select a seller', 'error');
            return;
        }
        if (addingSeller && !newSellerName.trim()) {
            showNotification('Please enter a seller name', 'error');
            return;
        }

        const payload = {
            name: formData.name,
            type: formData.type,
            quantity: Number(formData.quantity),
            unitPrice: Number(formData.unitPrice),
            received: Number(formData.received),
            departmentId: Number(formData.departmentId),
            specifications: specsToJSON(),
        };

        if (addingSeller) {
            payload.newSellerName = newSellerName.trim();
        } else {
            payload.sellerId = Number(formData.sellerId);
        }

        setSubmitting(true);
        try {
            if (editingRecord) {
                await axios.put(`${BASE_URL}/stockIncome/${editingRecord.id}`, payload);
                showNotification('Stock income updated successfully');
            } else {
                await axios.post(`${BASE_URL}/stockIncome`, payload);
                showNotification('Stock income created successfully');
            }

            setModalVisible(false);
            resetForm();
            fetchStockIncomes();
            fetchSellers(); // Refresh sellers in case a new one was created
        } catch (error) {
            showNotification('Operation failed', 'error');
            console.error('Error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${BASE_URL}/stockIncome/${deleteId}`);
            showNotification('Stock income deleted successfully');
            setDeleteModalVisible(false);
            setDeleteId(null);
            fetchStockIncomes();
        } catch (error) {
            showNotification('Failed to delete stock income', 'error');
            console.error('Error:', error);
        }
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setFormData({
            name: record.name || '',
            type: record.type || '',
            quantity: record.quantity || 0,
            unitPrice: record.unitPrice || 0,
            received: record.received || 0,
            departmentId: record.departmentId || '',
            sellerId: record.sellerId || '',
        });
        setSpecs(jsonToSpecs(record.specifications));
        setAddingSeller(false);
        setNewSellerName('');
        setModalVisible(true);
    };

    const handleView = (record) => {
        setViewingRecord(record);
        setViewModalVisible(true);
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setDeleteModalVisible(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: '',
            quantity: 0,
            unitPrice: 0,
            received: 0,
            departmentId: '',
            sellerId: '',
        });
        setSpecs([]);
        setNewSpec({ key: '', value: '' });
        setEditingSpec(null);
        setEditingRecord(null);
        setAddingSeller(false);
        setNewSellerName('');
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getFilteredAndSortedData = () => {
        let filteredData = [...stockIncomes];

        if (filters.department) {
            filteredData = filteredData.filter(item => item.departmentId === filters.department);
        }
        if (filters.type) {
            filteredData = filteredData.filter(item => item.type === filters.type);
        }

        if (sortConfig.key) {
            filteredData.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'department') {
                    aValue = a.department?.name || '';
                    bValue = b.department?.name || '';
                } else if (sortConfig.key === 'seller') {
                    aValue = a.seller?.fullname || '';
                    bValue = b.seller?.fullname || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredData;
    };

    const filteredAndSortedData = getFilteredAndSortedData();

    const SortableHeader = ({ label, sortKey }) => (
        <th
            className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary"
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === sortKey && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header (unchanged) */}
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent rounded-2xl -z-10"></div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary rounded-xl">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Stock Income Management</h1>
                            <p className="text-sm text-gray-500 mt-1">Track and manage all stock income transactions</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setModalVisible(true);
                        }}
                        className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 hover:shadow-lg group"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Stock Income
                    </button>
                </div>
            </div>

            {/* Table (unchanged) */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-primary">
                            <tr>
                                <SortableHeader label="Name" sortKey="name" />
                                <SortableHeader label="Type" sortKey="type" />
                                <SortableHeader label="Quantity" sortKey="quantity" />
                                <SortableHeader label="Unit Price" sortKey="unitPrice" />
                                <SortableHeader label="Total" sortKey="total" />
                                <SortableHeader label="Received" sortKey="received" />
                                <SortableHeader label="Remaining" sortKey="remaining" />
                                <SortableHeader label="Department" sortKey="department" />
                                <SortableHeader label="Seller" sortKey="seller" />
                                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-primary"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="h-4 w-4 bg-primary rounded-full animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAndSortedData.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="text-gray-500 text-lg">No stock incomes found</p>
                                            <p className="text-gray-400 text-sm">Try adjusting your filters or add a new one</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedData.map((item) => (
                                    <tr key={item.id} className="hover:bg-primary/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-900 group-hover: transition-colors">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-primary rounded-full text-xs font-medium">
                                                {item.type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            ${Number(item.unitPrice).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${Number(item.total).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            ${Number(item.received).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.remaining > 0
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}>
                                                ${Number(item.remaining).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.department?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.seller?.fullname || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleView(item)}
                                                    className="p-2 hover:bg-primary rounded-lg transition-all"
                                                    title="View"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(item.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalVisible && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
                    <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    {editingRecord ? 'Edit Stock Income' : 'Add New Stock Income'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setModalVisible(false);
                                        resetForm();
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        placeholder="Enter item name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={(e) => handleSelectChange('type', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                    >
                                        <option value="">Select type</option>
                                        <option value="Quantity">Quantity</option>
                                        <option value="weight">Weight</option>
                                        <option value="length">Length</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={(e) => handleNumberChange('quantity', parseInt(e.target.value) || 0)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.unitPrice}
                                            onChange={(e) => handleNumberChange('unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Received Amount
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.received}
                                            onChange={(e) => handleNumberChange('received', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.departmentId}
                                        onChange={(e) => handleSelectChange('departmentId', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        required
                                    >
                                        <option value="">Select department</option>
                                        {Array.isArray(departments) && departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Seller Section with inline addition */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seller <span className="text-red-500">*</span>
                                    </label>
                                    {addingSeller ? (
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={newSellerName}
                                                onChange={(e) => setNewSellerName(e.target.value)}
                                                placeholder="New seller name"
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // No frontend creation – just switch back
                                                    setAddingSeller(false);
                                                    setNewSellerName("");
                                                }}
                                                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={formData.sellerId}
                                                onChange={(e) => handleSelectChange('sellerId', e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                                required={!addingSeller}
                                            >
                                                <option value="">Select seller</option>
                                                {Array.isArray(sellers) && sellers.map(seller => (
                                                    <option key={seller.id} value={seller.id}>{seller.fullname}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setAddingSeller(true)}
                                                className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90"
                                                title="Add new seller"
                                            >
                                                <FiPlus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Specifications Section (unchanged) */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Specifications
                                        <span className="text-xs text-gray-500 ml-2">(Add key-value pairs)</span>
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Key (e.g., color)"
                                            value={newSpec.key}
                                            onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Value (e.g., red)"
                                            value={newSpec.value}
                                            onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddSpec}
                                            className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
                                            disabled={!newSpec.key.trim() || !newSpec.value.trim()}
                                        >
                                            {editingSpec !== null ? <FiSave /> : <FiPlus />}
                                            {editingSpec !== null ? 'Update' : 'Add'}
                                        </button>
                                        {editingSpec !== null && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                            >
                                                <FiX />
                                            </button>
                                        )}
                                    </div>
                                    {specs.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-sm font-medium text-gray-700">Added Specifications:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {specs.map((spec, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-primary transition-colors"
                                                    >
                                                        <div className="flex-1">
                                                            <span className="text-sm font-medium text-gray-700">{spec.key}:</span>
                                                            <span className="text-sm text-gray-600 ml-2">{spec.value}</span>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditSpec(index)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSpec(index)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Remove"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalVisible(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-6 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-colors ${
                                        submitting
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-primary text-white hover:bg-primary/90"
                                    }`}
                                >
                                    {submitting ? "Processing..." : (editingRecord ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal (unchanged) */}
            {viewModalVisible && viewingRecord && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
                    <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Stock Income Details</h3>
                                <button
                                    onClick={() => setViewModalVisible(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Name</p>
                                    <p className="font-semibold text-gray-900">{viewingRecord.name}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Type</p>
                                    <p className="font-semibold text-gray-900">{viewingRecord.type || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                    <p className="font-semibold text-gray-900">{viewingRecord.quantity}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Unit Price</p>
                                    <p className="font-semibold text-primary">${Number(viewingRecord.unitPrice).toFixed(2)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Total</p>
                                    <p className="font-semibold text-gray-900">${Number(viewingRecord.total).toFixed(2)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Received</p>
                                    <p className="font-semibold text-green-600">${Number(viewingRecord.received).toFixed(2)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Remaining</p>
                                    <p className={`font-semibold ${viewingRecord.remaining > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                        ${Number(viewingRecord.remaining).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Department</p>
                                    <p className="font-semibold text-gray-900">{viewingRecord.department?.name || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Seller</p>
                                    <p className="font-semibold text-gray-900">{viewingRecord.seller?.fullname || 'N/A'}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Created</p>
                                    <p className="font-semibold text-gray-900">{new Date(viewingRecord.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                                    <p className="font-semibold text-gray-900">{new Date(viewingRecord.updatedAt).toLocaleString()}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 mb-2">Specifications</p>
                                    {viewingRecord.specifications && Object.keys(viewingRecord.specifications).length > 0 ? (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(viewingRecord.specifications).map(([key, value], index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                                                        <span className="text-xs font-medium text-gray-500">{key}:</span>
                                                        <span className="text-sm font-semibold text-primary">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No specifications added</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setViewModalVisible(false)}
                                    className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (unchanged) */}
            {deleteModalVisible && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
                    <div className="relative top-20 mx-auto p-0 border w-96 shadow-2xl rounded-xl bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
                            <h3 className="text-lg font-bold text-white">Delete Stock Income</h3>
                        </div>
                        <div className="p-6">
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete this item? This action cannot be undone.
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => setDeleteModalVisible(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockIncomeManager;