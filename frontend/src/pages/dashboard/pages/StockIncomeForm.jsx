// components/StockIncomeForm.jsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const StockIncomeForm = ({ 
  departments, 
  sellers, 
  stockExists, 
  onSubmit, 
  onCancel,
  initialRowsCount = 5 
}) => {
  // Seller state
  const [addingSeller, setAddingSeller] = useState(false);
  const [newSellerName, setNewSellerName] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Rows state: each row has a unique temporary id
  const [rows, setRows] = useState([]);

  // Helper to create an empty row object
  const createEmptyRow = (id) => ({
    id,
    existId: '',
    addingExist: false,
    newExistName: '',
    newExistDepartmentId: '',
    amount: '',
    net_unite_price: '',
    expense: '0',
    sell_price: '',
    departmentId: '',
  });

  // Initialize rows with 5 empty rows
  useEffect(() => {
    const initialRows = Array.from({ length: initialRowsCount }, (_, idx) => createEmptyRow(Date.now() + idx));
    setRows(initialRows);
  }, []);

  // Update a specific field in a row
  const updateRow = (rowId, field, value) => {
    setRows(prevRows => prevRows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  // Toggle "adding exist" mode for a row
  const toggleAddingExist = (rowId, isAdding) => {
    updateRow(rowId, 'addingExist', isAdding);
    if (!isAdding) {
      updateRow(rowId, 'newExistName', '');
      updateRow(rowId, 'newExistDepartmentId', '');
    }
  };

  // Add a new empty row at the end
  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(Date.now())]);
  };

  // Remove a row (keep at least one)
  const removeRow = (rowId) => {
    if (rows.length === 1) {
      alert("At least one income row is required.");
      return;
    }
    setRows(prev => prev.filter(row => row.id !== rowId));
  };

  // Build the payload for each row (without seller)
  const buildRowPayload = (row) => ({
    existId: row.existId,
    amount: parseFloat(row.amount),
    net_unite_price: parseFloat(row.net_unite_price),
    expense: parseFloat(row.expense) || 0,
    sell_price: parseFloat(row.sell_price) || 0,
    departmentId: row.departmentId ? parseInt(row.departmentId) : null,
  });

  // Submit: validate, then call parent onSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate seller
    if (!selectedSellerId && !addingSeller) {
      alert("Please select or add a seller.");
      return;
    }
    if (addingSeller && !newSellerName.trim()) {
      alert("Please enter a seller name.");
      return;
    }

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.amount || parseFloat(row.amount) <= 0) {
        alert(`Row ${i+1}: Amount is required and must be positive.`);
        return;
      }
      if (!row.net_unite_price || parseFloat(row.net_unite_price) <= 0) {
        alert(`Row ${i+1}: Net unit price is required and must be positive.`);
        return;
      }
      if (!row.sell_price || parseFloat(row.sell_price) <= 0) {
        alert(`Row ${i+1}: Sell price is required and must be positive.`);
        return;
      }
      if (!row.addingExist && !row.existId) {
        alert(`Row ${i+1}: Please select an existing stock item or create a new one.`);
        return;
      }
      if (row.addingExist && (!row.newExistName || !row.newExistDepartmentId)) {
        alert(`Row ${i+1}: Please provide name and department for the new stock item.`);
        return;
      }
    }

    // Prepare rows data with new stock creation info
    const rowsToSend = rows.map(row => ({
      ...buildRowPayload(row),
      _newExist: row.addingExist ? {
        name: row.newExistName,
        departmentId: parseInt(row.newExistDepartmentId),
      } : null,
    }));

    setSubmitting(true);
    try {
      await onSubmit({
        seller: addingSeller ? { newName: newSellerName } : { id: selectedSellerId },
        incomes: rowsToSend,
      });
      // Reset form on success
      setRows(Array.from({ length: initialRowsCount }, (_, idx) => createEmptyRow(Date.now() + idx)));
      setSelectedSellerId("");
      setAddingSeller(false);
      setNewSellerName("");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to submit incomes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto p-0 border w-full max-w-6xl shadow-2xl rounded-xl bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Add Multiple Stock Incomes (Same Seller)</h3>
            <button onClick={onCancel} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-auto max-h-[80vh]">
          {/* Seller selection (same for all rows) */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seller (same for all incomes)</label>
            {addingSeller ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="Full name of new seller"
                  className="flex-1 border rounded-lg px-4 py-2"
                  required
                />
                <button type="button" onClick={() => { setAddingSeller(false); setNewSellerName(""); }} className="border px-4 py-2 rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="flex-1 border rounded-lg px-4 py-2 bg-white"
                  required
                >
                  <option value="">Select an existing seller</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.fullname}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setAddingSeller(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-primary/90">
                  <FiPlus /> New Seller
                </button>
              </div>
            )}
          </div>

          {/* Income rows table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Stock Item</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Net Unit Price</th>
                  <th className="p-2 text-left">Expense</th>
                  <th className="p-2 text-left">Sell Price</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-200">
                    <td className="p-2 align-top">{idx+1}</td>

                    {/* Stock Item column */}
                    <td className="p-2 align-top min-w-[220px]">
                      {row.addingExist ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="New item name"
                            value={row.newExistName}
                            onChange={(e) => updateRow(row.id, 'newExistName', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                          <select
                            value={row.newExistDepartmentId}
                            onChange={(e) => updateRow(row.id, 'newExistDepartmentId', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Department for this stock</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => toggleAddingExist(row.id, false)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Cancel & use existing
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <select
                            value={row.existId}
                            onChange={(e) => updateRow(row.id, 'existId', e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="">Select a stock item</option>
                            {stockExists.map(ex => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name} ({ex.department?.name || ex.departmentId})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => toggleAddingExist(row.id, true)}
                            className="text-primary p-1 hover:bg-primary/10 rounded"
                            title="Add new stock item"
                          >
                            <FiPlus />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm"
                        placeholder="Qty"
                      />
                    </td>

                    {/* Net Unit Price */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.net_unite_price}
                        onChange={(e) => updateRow(row.id, 'net_unite_price', e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm"
                        placeholder="Net Price"
                      />
                    </td>

                    {/* Expense */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.expense}
                        onChange={(e) => updateRow(row.id, 'expense', e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm"
                        placeholder="Expense"
                      />
                    </td>

                    {/* Sell Price */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.sell_price}
                        onChange={(e) => updateRow(row.id, 'sell_price', e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm"
                        placeholder="Sell Price"
                      />
                    </td>

                    {/* Remove row */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove row"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row button */}
          <div className="mt-4 text-center">
            <button type="button" onClick={addRow} className="text-primary border border-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition">
              + Add another income row
            </button>
          </div>

          {/* Form buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onCancel} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className={`px-6 py-2 rounded-lg shadow-lg ${submitting ? 'bg-gray-400' : 'bg-primary text-white hover:bg-primary/90'}`}>
              {submitting ? 'Submitting...' : 'Submit All Incomes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockIncomeForm;