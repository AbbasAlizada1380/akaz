// components/StockIncomeTable.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../pagination/Pagination.jsx';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockIncomeTable = ({ incomes, totalRecords, currentPage, totalPages, onPageChange }) => {
    const [factorModes, setFactorModes] = useState({});

    // Fetch factor modes for incomes that have FactorId
    useEffect(() => {
        const fetchFactorModes = async () => {
            const factorIds = [...new Set(incomes.map(inc => inc.FactorId).filter(id => id))];
            if (factorIds.length === 0) return;

            try {
                const promises = factorIds.map(id => 
                    axios.get(`${BASE_URL}/factor/${id}`).then(res => ({
                        id,
                        mode: res.data.factor?.mode || 'stock'
                    })).catch(() => ({ id, mode: 'stock' }))
                );
                const results = await Promise.all(promises);
                const modesMap = {};
                results.forEach(({ id, mode }) => {
                    modesMap[id] = mode;
                });
                setFactorModes(modesMap);
            } catch (err) {
                console.error('Error fetching factor modes:', err);
            }
        };

        if (incomes.length > 0) {
            fetchFactorModes();
        }
    }, [incomes]);

    const getModeForIncome = (income) => {
        // If income has FactorId, get mode from factor
        if (income.FactorId && factorModes[income.FactorId]) {
            return factorModes[income.FactorId];
        }
        // Fallback: check if income has mode field directly (for backward compatibility)
        return income.mode || 'stock';
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Recent Stock Incomes</h2>
                <span className="text-sm text-gray-500">Total: {totalRecords} records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factor #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Unit Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incomes.map((inc) => {
                            const mode = getModeForIncome(inc);
                            return (
                                <tr key={inc.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            mode === 'stock' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {mode === 'stock' ? 'Add to Stock' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-sm font-mono text-gray-600">
                                        {inc.FactorId ? `FAC-${String(inc.FactorId).padStart(6, '0')}` : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-800">{inc.sellerName || inc.seller?.name}</td>
                                    <td className="px-6 py-3 text-sm text-gray-800">{inc.stockIncomeStockExist?.name || `Product ID: ${inc.existId}`}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{inc.type}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{inc.amount}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{inc.net_unite_price}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{inc.sell_price}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{inc.expense}</td>
                                    <td className="px-6 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            mode === 'stock' 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {mode === 'stock' ? 'Active' : 'Pending Approval'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {incomes.length === 0 && (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                                    No income records found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={onPageChange} 
                    />
                </div>
            )}
        </div>
    );
};

export default StockIncomeTable;
