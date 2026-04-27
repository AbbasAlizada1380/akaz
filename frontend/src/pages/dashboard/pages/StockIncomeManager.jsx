// StockIncomeManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import StockIncomeDateDownload from './report/StockIncomeDateDownload';
import Pagination from '../pagination/Pagination';
import StockIncomeForm from './StockIncomeForm';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockIncomeManager = () => {
    // Data states
    const [stockIncomes, setStockIncomes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [stockExists, setStockExists] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [viewingRecord, setViewingRecord] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    
    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPrevPage: false,
    });

    // Sorting (simplified – sorts client‑side on current page)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // ---------- FETCH FUNCTIONS ----------
    const fetchStockIncomes = async (page = 1, limit = 20) => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/stockIncome`, { params: { page, limit } });
            setStockIncomes(response.data.stockIncomes || []);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error(error);
            alert('Failed to fetch stock incomes');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/department`);
            setDepartments(response.data.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchSellers = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/seller`);
            setSellers(response.data.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchStockExists = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/stockExist`);
            setStockExists(response.data.data || []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        fetchStockIncomes();
        fetchDepartments();
        fetchSellers();
        fetchStockExists();
    }, []);

    // ---------- HANDLE BATCH SUBMISSION (from child) ----------
const handleBatchSubmit = async ({ seller, incomes }) => {
  let sellerId;

  // 1. Create seller if new
  if (seller.newName) {
    const sellerRes = await axios.post(`${BASE_URL}/seller`, { fullname: seller.newName });
    sellerId = sellerRes.data.data.id;
  } else {
    sellerId = seller.id;
  }

  // 2. Create any new stock items (one by one) and collect final existId for each income
  const incomesWithExistId = [];
  for (const inc of incomes) {
    let existId = inc.existId;
    if (inc._newExist) {
      const existRes = await axios.post(`${BASE_URL}/stockExist`, {
        name: inc._newExist.name,
        departmentId: inc._newExist.departmentId,
        amount: 0,
        sell_price: 0,
        unit_price: 0,
      });
      existId = existRes.data.id;
    }
    incomesWithExistId.push({
      existId: parseInt(existId),
      amount: inc.amount,
      net_unite_price: inc.net_unite_price,
      expense: inc.expense,
      sell_price: inc.sell_price,
      sellerId: sellerId,
      departmentId: inc.departmentId,
    });
  }

  // 3. Send all incomes in a **single** batch request
  await axios.post(`${BASE_URL}/stockIncome/batch`, { incomes: incomesWithExistId });
};

    // ---------- CRUD HANDLERS ----------
    const handleDelete = async () => {
        try {
            await axios.delete(`${BASE_URL}/stockIncome/${deleteId}`);
            alert('Deleted successfully');
            setDeleteModalVisible(false);
            fetchStockIncomes(pagination.currentPage, pagination.itemsPerPage);
        } catch (error) {
            console.error(error);
            alert('Delete failed');
        }
    };

    const handleView = (record) => {
        setViewingRecord(record);
        setViewModalVisible(true);
    };

    const handleEdit = (record) => {
        // For simplicity, you might reuse the old single‑edit modal.
        // But to keep this clean, we can still use the old edit logic.
        // For brevity, we'll just alert that edit is not yet implemented in batch mode.
        alert("Edit functionality will be added later. For now, use the batch add form.");
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setDeleteModalVisible(true);
    };

    const handlePageChange = (newPage) => {
        fetchStockIncomes(newPage, pagination.itemsPerPage);
    };

    // ---------- SORTING ----------
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortedData = () => {
        let sorted = [...stockIncomes];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'department') aVal = a.department?.name || '';
                if (sortConfig.key === 'seller') aVal = a.seller?.fullname || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    };

    const sortedStockIncomes = getSortedData();

    const SortableHeader = ({ label, sortKey }) => (
        <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </div>
        </th>
    );

    // ---------- RENDER ----------
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
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
                        onClick={() => setFormVisible(true)}
                        className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 hover:shadow-lg group"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Stock Income (Batch)
                    </button>
                </div>
            </div>

            {/* Batch Form Modal */}
            {formVisible && (
                <StockIncomeForm
                    departments={departments}
                    sellers={sellers}
                    stockExists={stockExists}
                    onSubmit={handleBatchSubmit}
                    onCancel={() => setFormVisible(false)}
                    initialRowsCount={5}
                />
            )}

            {/* Table & Pagination */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <StockIncomeDateDownload />
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
                                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedStockIncomes.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="text-gray-500 text-lg">No stock incomes found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedStockIncomes.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-primary/20 rounded-full text-xs font-medium">{item.type || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Number(item.unitPrice).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${Number(item.total).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Number(item.received).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.remaining > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                ${Number(item.remaining).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.department?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.seller?.fullname || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleView(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button onClick={() => handleEdit(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Edit">
                                                    <FiEdit2 className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                                    <FiTrash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-gray-200 px-4 py-3">
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            {/* View Modal */}
            {viewModalVisible && viewingRecord && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
                    <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Stock Income Details</h3>
                            <button onClick={() => setViewModalVisible(false)} className="text-white/80 hover:text-white">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Name</p><p className="font-semibold">{viewingRecord.name}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Type</p><p className="font-semibold">{viewingRecord.type || 'N/A'}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Quantity</p><p className="font-semibold">{viewingRecord.quantity}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Unit Price</p><p className="font-semibold text-primary">${Number(viewingRecord.unitPrice).toFixed(2)}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Total</p><p className="font-semibold">${Number(viewingRecord.total).toFixed(2)}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Received</p><p className="font-semibold text-green-600">${Number(viewingRecord.received).toFixed(2)}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Remaining</p><p className={`font-semibold ${viewingRecord.remaining > 0 ? 'text-yellow-600' : 'text-green-600'}`}>${Number(viewingRecord.remaining).toFixed(2)}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Department</p><p className="font-semibold">{viewingRecord.department?.name || 'N/A'}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Seller</p><p className="font-semibold">{viewingRecord.seller?.fullname || 'N/A'}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Created</p><p className="font-semibold">{new Date(viewingRecord.createdAt).toLocaleString()}</p></div>
                                <div className="bg-gray-50 p-3 rounded"><p className="text-xs text-gray-500">Last Updated</p><p className="font-semibold">{new Date(viewingRecord.updatedAt).toLocaleString()}</p></div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 mb-2">Specifications</p>
                                    {viewingRecord.specifications && Object.keys(viewingRecord.specifications).length > 0 ? (
                                        <div className="bg-gray-50 p-4 rounded border">
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(viewingRecord.specifications).map(([k, v], i) => (
                                                    <div key={i} className="flex gap-2 p-2 bg-white rounded"><span className="font-medium">{k}:</span><span>{v}</span></div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : <p className="text-gray-400 italic">No specifications</p>}
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button onClick={() => setViewModalVisible(false)} className="px-6 py-2 bg-primary text-white rounded-lg">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalVisible && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
                    <div className="relative top-20 mx-auto p-0 border w-96 shadow-2xl rounded-xl bg-white">
                        <div className="bg-red-600 px-6 py-4 rounded-t-xl"><h3 className="text-lg font-bold text-white">Delete Stock Income</h3></div>
                        <div className="p-6 text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <FiTrash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-gray-600 mb-6">Are you sure? This action cannot be undone.</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteModalVisible(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockIncomeManager;