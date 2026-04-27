import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;
export default function StockExistPage() {
  const [stocks, setStocks] = useState([]);
  const [form, setForm] = useState({
    name: "",
    departmentId: "",
    amount: "",
    sell_price: "",
    unit_price: "",
  });
  const [editingId, setEditingId] = useState(null);

  // ========================
  // Fetch All
  // ========================
  const fetchStocks = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/stockExist`);
      setStocks(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // ========================
  // Handle Change
  // ========================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ========================
  // Create / Update
  // ========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update
        await axios.put(`${BASE_URL}/stockExist/${editingId}`, form);
      } else {
        // Create
        await axios.post(`${BASE_URL}/stockExist`, form);
      }

      setForm({
        name: "",
        departmentId: "",
        amount: "",
        sell_price: "",
        unit_price: "",
      });
      setEditingId(null);
      fetchStocks();
    } catch (error) {
      console.error(error);
    }
  };

  // ========================
  // Edit
  // ========================
  const handleEdit = (stock) => {
    setForm({
      name: stock.name,
      departmentId: stock.departmentId,
      amount: stock.amount,
      sell_price: stock.sell_price,
      unit_price: stock.unit_price,
    });
    setEditingId(stock.id);
  };

  // ========================
  // Delete
  // ========================
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;

    try {
      await axios.delete(`${BASE_URL}/stockExist/${id}`);
      fetchStocks();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Stock Management</h1>

      {/* ================= FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 mb-6"
      >
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Name"
          className="border p-2 rounded"
        />

        <input
          name="departmentId"
          value={form.departmentId}
          onChange={handleChange}
          placeholder="Department ID"
          className="border p-2 rounded"
        />

        <input
          name="amount"
          value={form.amount}
          onChange={handleChange}
          placeholder="Amount"
          type="number"
          className="border p-2 rounded"
        />

        <input
          name="sell_price"
          value={form.sell_price}
          onChange={handleChange}
          placeholder="Sell Price"
          type="number"
          className="border p-2 rounded"
        />

        <input
          name="unit_price"
          value={form.unit_price}
          onChange={handleChange}
          placeholder="Unit Price"
          type="number"
          className="border p-2 rounded"
        />

        <button className="col-span-2 bg-blue-500 text-white p-2 rounded">
          {editingId ? "Update" : "Create"}
        </button>
      </form>

      {/* ================= TABLE ================= */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th>Name</th>
            <th>Department</th>
            <th>Amount</th>
            <th>Sell</th>
            <th>Unit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr key={s.id} className="text-center border-t">
              <td>{s.name}</td>
              <td>{s.department?.name || s.departmentId}</td>
              <td>{s.amount}</td>
              <td>{s.sell_price}</td>
              <td>{s.unit_price}</td>
              <td className="space-x-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="bg-yellow-400 px-2 py-1 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(s.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}