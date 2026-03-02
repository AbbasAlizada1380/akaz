import { useState, useEffect } from "react";
import axios from "axios";
import sizes from "../services/Size.js";
import Pagination from "../pagination/Pagination"; // Import the Pagination component

const BASE_URL = import.meta.env.VITE_BASE_URL;
const INCOME_API_URL = `${BASE_URL}/stock/income`;

// Function to create empty items
const createEmptyItems = (count = 5) => {
  return Array.from({ length: count }, () => ({
    size: "",
    quantity: "",
    price: "",
    money: "",
    spent: "0"
  }));
};

const Incoming = () => {
  const [items, setItems] = useState(createEmptyItems(5)); // Start with 5 empty items
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [perPage, setPerPage] = useState(10);

  // Fetch all incomes
  const fetchIncomes = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`${INCOME_API_URL}?page=${page}&limit=${perPage}`);
      setIncomes(response.data.incomes);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.totalItems);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      alert("خطا در دریافت اطلاعات درآمدها");
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchIncomes(page);
  };

  // Fetch single income for edit
  const fetchIncomeById = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`${INCOME_API_URL}/${id}`);
      const income = response.data;

      // Set form for editing - replace all items with the editing item
      setItems([{
        size: income.size || "",
        quantity: income.quantity || "",
        price: income.price || "",
        money: income.money || "",
        spent: income.spent || "0"
      }]);
      setEditingId(id);
      setHasUnsavedChanges(false);

      // Scroll to form
      document.getElementById('income-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error("Error fetching income:", error);
      alert("خطا در دریافت اطلاعات درآمد");
    } finally {
      setLoading(false);
    }
  };

  // Create new income
  const createIncome = async (incomeData) => {
    try {
      const response = await axios.post(INCOME_API_URL, incomeData);
      return response.data;
    } catch (error) {
      console.error("Error creating income:", error.response?.data || error.message);
      alert(error.response?.data?.message || "خطا در ثبت درآمد");
      throw error;
    }
  };

  // Update income
  const updateIncome = async (id, incomeData) => {
    try {
      const response = await axios.put(`${INCOME_API_URL}/${id}`, incomeData);
      return response.data;
    } catch (error) {
      console.error("Error updating income:", error.response?.data || error.message);
      alert(error.response?.data?.message || "خطا در بروزرسانی درآمد");
      throw error;
    }
  };

  // Delete income
  const deleteIncome = async (id) => {
    if (!window.confirm("آیا از حذف این درآمد اطمینان دارید؟")) {
      return;
    }

    try {
      await axios.delete(`${INCOME_API_URL}/${id}`);
      alert("درآمد با موفقیت حذف شد");
      fetchIncomes(currentPage);
    } catch (error) {
      console.error("Error deleting income:", error);
      alert("خطا در حذف درآمد");
    }
  };

  // Calculate money for a single item
  const calculateMoney = (quantity, price) => {
    const qnty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    return (qnty * prc).toFixed(2);
  };

  // Update a single item
  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...items];

    // Update the field
    updatedItems[index][name] = value;

    // Auto-calculate money if quantity or price changes
    if (name === "quantity" || name === "price") {
      const money = calculateMoney(
        updatedItems[index].quantity,
        updatedItems[index].price
      );
      updatedItems[index].money = money;
    }

    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  // Add new empty row
  const addItem = () => {
    setItems([...items, { size: "", quantity: "", price: "", money: "", spent: "0" }]);
    setHasUnsavedChanges(true);
  };

  // Remove row from form - don't allow removal if we have only 5 items (initial state)
  const removeItem = (index) => {
    if (items.length <= 5) {
      alert("حداقل باید ۵ مورد موجود باشد");
      return;
    }

    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  // Reset form to initial 5 empty items
  const resetForm = () => {
    if (hasUnsavedChanges && !window.confirm("آیا از لغو تغییرات اطمینان دارید؟ تغییرات ذخیره نشده از بین خواهند رفت.")) {
      return;
    }

    setItems(createEmptyItems(5));
    setEditingId(null);
    setHasUnsavedChanges(false);
  };

  // Handle form submission with smart filtering
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter out completely empty items
    const nonEmptyItems = items.filter(item =>
      item.size.trim() !== "" ||
      item.quantity !== "" ||
      item.price !== ""
    );

    // If no valid items, show error
    if (nonEmptyItems.length === 0) {
      alert("لطفا حداقل یک مورد را پر کنید");
      return;
    }

    // Validate filled items
    const validationErrors = [];
    nonEmptyItems.forEach((item, index) => {
      if (!item.size) validationErrors.push(`سطر ${index + 1}: اندازه را انتخاب کنید`);
      if (!item.quantity || parseFloat(item.quantity) <= 0) validationErrors.push(`سطر ${index + 1}: تعداد معتبر وارد کنید`);
      if (!item.price || parseFloat(item.price) <= 0) validationErrors.push(`سطر ${index + 1}: قیمت معتبر وارد کنید`);
    });

    if (validationErrors.length > 0) {
      alert(validationErrors.join("\n"));
      return;
    }

    setLoading(true);

    try {
      // If editing, update existing income
      if (editingId) {
        await updateIncome(editingId, nonEmptyItems[0]);
        alert("درآمد با موفقیت بروزرسانی شد");
      }
      // If creating, create each non-empty item as separate income
      else {
        let successCount = 0;
        for (const item of nonEmptyItems) {
          await createIncome({
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            spent: item.spent || "0"
          });
          successCount++;
        }
        alert(`${successCount} مورد با موفقیت ثبت شد`);
      }

      // Reset form but keep 5 empty items
      setItems(createEmptyItems(5));
      setEditingId(null);
      setHasUnsavedChanges(false);
      fetchIncomes(currentPage);
    } catch (error) {
      console.error("Error:", error);
      // Error is already shown by createIncome/updateIncome functions
    } finally {
      setLoading(false);
    }
  };

  // Initialize - fetch incomes on component mount
  useEffect(() => {
    fetchIncomes();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(dateString));
  };

  // Count filled items
  const filledItemsCount = items.filter(item =>
    item.size.trim() !== "" ||
    item.quantity !== "" ||
    item.price !== ""
  ).length;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan-800 mb-6">مدیریت واردات</h2>

      {/* Form Section */}
      <div id="income-form" className="mb-8 bg-white p-6 rounded-xl shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {items.map((item, index) => {
            // Check if item is empty
            const isEmpty = !item.size && !item.quantity && !item.price;

            return (
              <div
                key={index}
                className={`grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-b border-gray-200 pb-4 mb-4 ${isEmpty ? 'bg-gray-50 p-4 rounded-md border-dashed' : ''}`}
              >
                {/* Size */}
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium">اندازه</label>
                  <select
                    name="size"
                    value={item.size}
                    onChange={(e) => handleChange(index, e)}
                    className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-cyan-300 ${isEmpty ? 'border-dashed' : ''}`}
                  >
                    <option value="">انتخاب اندازه</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block mb-1 text-sm font-medium">تعداد</label>
                  <input
                    type="number"
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handleChange(index, e)}
                    className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-cyan-300 ${isEmpty ? 'border-dashed' : ''}`}
                    placeholder="0"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block mb-1 text-sm font-medium">قیمت</label>
                  <input
                    type="number"
                    name="price"
                    value={item.price}
                    onChange={(e) => handleChange(index, e)}
                    className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-cyan-300 ${isEmpty ? 'border-dashed' : ''}`}
                    placeholder="0"
                    min="0"
                    step="0.001"
                  />
                </div>

                {/* Money (Auto-calculated) */}
                <div>
                  <label className="block mb-1 text-sm font-medium">مبلغ کل</label>
                  <input
                    type="text"
                    name="money"
                    value={item.money}
                    readOnly
                    className="w-full border border-gray-300 bg-gray-50 rounded-md p-2"
                    placeholder="محاسبه خودکار"
                  />
                </div>

                {/* Remove Button (only show if multiple items and not editing) */}
                {items.length > 5 && !editingId && (
                  <div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition"
                      title="حذف این مورد"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
            {!editingId && (
              <>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 transition"
                >
                  + مورد جدید (مجموع: {items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setItems(createEmptyItems(5))}
                  className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition"
                  disabled={items.length === 5 && !hasUnsavedChanges}
                >
                  بازنشانی به ۵ مورد خالی
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={loading || filledItemsCount === 0}
              className="flex-1 bg-cyan-800 text-white py-3 rounded-md hover:bg-cyan-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "در حال پردازش..." :
                editingId ? "بروزرسانی درآمد" :
                  `ثبت ${filledItemsCount} مورد درآمد`}
            </button>

            {(editingId || hasUnsavedChanges) && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-400 text-white px-4 py-3 rounded-md hover:bg-gray-500 transition"
              >
                {editingId ? "انصراف ویرایش" : "لغو تغییرات"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Incomes List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-cyan-800">لیست درآمدها ({totalItems} مورد)</h3>
          <span className="text-sm text-gray-600">
            صفحه {currentPage} از {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">در حال بارگذاری...</p>
          </div>
        ) : incomes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">هیچ درآمدی ثبت نشده است</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-cyan-50 text-cyan-800">
                  <tr>
                    <th className="p-3 border-b font-semibold">#</th>
                    <th className="p-3 border-b font-semibold">اندازه</th>
                    <th className="p-3 border-b font-semibold">تعداد (پلیت)</th>
                    <th className="p-3 border-b font-semibold">قیمت پلیت (افغانی)</th>
                    <th className="p-3 border-b font-semibold">مبلغ کل (افغانی)</th>
                    <th className="p-3 border-b font-semibold">مصرف شده</th>
                    <th className="p-3 border-b font-semibold">موجودی</th>
                    <th className="p-3 border-b font-semibold">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income, index) => {
                    const remaining = parseFloat(income.quantity || 0) - parseFloat(income.spent || 0);
                    return (
                      <tr
                        key={income.id}
                        className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                      >
                        <td className="p-3 text-gray-600">
                          {income.id}
                        </td>
                        <td className="p-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                            {income.size}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                            {income.quantity}
                          </span>
                        </td>
                        <td className="p-3 text-green-700 font-semibold">
                          {parseFloat(income.price || 0).toLocaleString('en-US')}
                        </td>
                        <td className="p-3 text-purple-700 font-bold">
                          {parseFloat(income.money || 0).toLocaleString('en-US')}
                        </td>
                        <td className="p-3">
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm">
                            {income.spent || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${remaining > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                            }`}>
                            {remaining > 0 ? remaining : 0}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-sm">
                          {income.createdAt ?
                            new Date(income.createdAt)
                              .toLocaleDateString('eng-en')
                              .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                            : '—'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Incoming;