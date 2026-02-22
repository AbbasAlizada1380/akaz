import React from "react";
import { FaPlus, FaTrash, FaCalculator, FaPrint } from "react-icons/fa";

const OffsetSection = ({ record, setRecord }) => {
  const addOffset = () => {
    setRecord({
      ...record,
      offset: [
        ...record.offset,
        { name: "", quantity: 0, price_per_unit: 0, money: 0 },
      ],
    });
  };

  const updateOffset = (index, field, value) => {
    const updated = [...record.offset];

    // Convert numeric fields to number
    if (["quantity", "price_per_unit", "money"].includes(field)) {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === "name") {
      updated[index][field] = value;
    }

    // Only calculate money automatically if money field wasn't the one being updated
    if (field !== "money") {
      const quantity = updated[index].quantity;
      const price_per_unit = updated[index].price_per_unit;
      updated[index].money = quantity * price_per_unit;
    }

    setRecord({ ...record, offset: updated });
  };

  const deleteOffset = (index) => {
    const updated = record.offset.filter((_, i) => i !== index);
    setRecord({ ...record, offset: updated });
  };

  const getFieldLabel = (field) => {
    const labels = {
      name: "نام محصول",
      quantity: "تعداد",
      price_per_unit: "قیمت واحد",
      money: "مبلغ کل",
    };
    return labels[field] || field;
  };

  const getFieldPlaceholder = (field) => {
    const placeholders = {
      name: "نام محصول را وارد کنید",
      quantity: "تعداد",
      price_per_unit: "قیمت هر واحد",
      money: "مبلغ کل را وارد کنید",
    };
    return placeholders[field] || field;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FaPrint className="text-blue-500 text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">چاپ افست</h2>
            <p className="text-gray-600 text-sm">مدیریت محصولات چاپ افست</p>
          </div>
        </div>
      </div> */}

      {/* Items List */}
      <div className="space-y-4">
        {record.offset.map((o, i) => (
          <div key={i} className="flex items-center">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              {["name", "quantity", "price_per_unit", "money"].map((key) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {getFieldLabel(key)}
                  </label>
                  <div className="relative">
                    <input
                      type={key === "name" ? "text" : "number"}
                      placeholder={getFieldPlaceholder(key)}
                      value={o[key] ?? ""}
                      onChange={(e) => updateOffset(i, key, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-all duration-200 bg-gray-200 text-gray-800 hover:border-gray-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Delete Button */}
            <div className="flex items-center px-5 relative border-gray-100">
              <button
                onClick={() => deleteOffset(i)}
                className="absolute cursor-pointer -bottom-5"
              >
                <FaTrash className="text-red-500 cursor-pointer" size={20} />
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <button
            onClick={addOffset}
            className="flex items-center gap-2 text-sm bg-cyan-800 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
          >
            <FaPlus className="text-base" />
            افزودن سفارش
          </button>
          <div className="flex items-center gap-x-2 border-cyan-800 py-1 px-5 ">
            <span className="text-lg font-semibold text-gray-800">
              تعداد سفارش دیجیتال:
            </span>
            <span className="text-xl font-bold"> {record.offset.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OffsetSection;
