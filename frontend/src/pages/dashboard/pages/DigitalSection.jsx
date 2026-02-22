import React from "react";
import { FaPlus, FaTrash, FaPrint } from "react-icons/fa";

const DigitalSection = ({ record, setRecord }) => {
  const addDigital = () => {
    setRecord({
      ...record,
      digital: [
        ...record.digital,
        {
          name: "",
          quantity: null,
          height: null,
          weight: null,
          area: null,
          price_per_unit: null,
          money: null,
        },
      ],
    });
  };

  const updateDigital = (index, field, value) => {
    const updated = [...record.digital];

    // Parse numeric inputs safely
    if (
      ["quantity", "height", "weight", "price_per_unit", "money"].includes(
        field
      )
    ) {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === "name") {
      updated[index][field] = value;
    }

    const quantity = parseFloat(updated[index].quantity) || 0;
    const height = parseFloat(updated[index].height) || 0;
    const weight = parseFloat(updated[index].weight) || 0;
    const price_per_unit = parseFloat(updated[index].price_per_unit) || 0;

    // ✅ Calculate area and round to 2 decimals
    const area = height * weight * quantity;
    updated[index].area = parseFloat(area.toFixed(2));

    // ✅ Calculate total money (integer only)
    if (field !== "money") {
      updated[index].money = Math.round(price_per_unit * area);
    }

    setRecord({ ...record, digital: updated });
  };

  const deleteDigital = (index) => {
    const updated = record.digital.filter((_, i) => i !== index);
    setRecord({ ...record, digital: updated });
  };

  const getFieldLabel = (field) => {
    const labels = {
      name: "نام محصول",
      quantity: "تعداد",
      height: "ارتفاع (cm)",
      weight: "عرض (cm)",
      area: "مساحت (cm²)",
      price_per_unit: "قیمت واحد",
      money: "مبلغ کل",
    };
    return labels[field] || field;
  };

  const getFieldPlaceholder = (field) => {
    const placeholders = {
      name: "نام محصول را وارد کنید",
      quantity: "تعداد",
      height: "ارتفاع",
      weight: "عرض",
      area: " ",
      price_per_unit: "قیمت ",
      money: "مبلغ کل",
    };
    return placeholders[field] || field;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <div className="bg-blue-100 rounded-lg">
              <FaPrint className="text-blue-500 text-xl" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">چاپ دیجیتال</h2>
            <p className="text-gray-600 text-sm">مدیریت محصولات چاپ دیجیتال</p>
          </div>
        </div>
      </div> */}

      {/* Items List */}
      <div className="space-y-4">
        <div className="space-y-4">
          {record && record.digital && record.digital.length > 0 ? (
            record.digital.map((d, i) => {
              const fieldOrder = [
                "name",
                "quantity",
                "height",
                "weight",
                "area",
                "price_per_unit",
                "money",
              ];

              return (
                <div key={i} className="flex items-center gap-x-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-x-4">
                    {fieldOrder.map((key) => (
                      <div
                        key={key}
                        className={`space-y-2 ${
                          key === "name" ? "lg:col-span-2" : ""
                        }`}
                      >
                        <label className="block text-sm font-medium text-gray-700">
                          {getFieldLabel(key)}
                        </label>
                        <div className="relative">
                          <input
                            type={["name"].includes(key) ? "text" : "number"}
                            value={d[key] ?? ""}
                            onChange={(e) =>
                              updateDigital(i, key, e.target.value)
                            }
                            placeholder={getFieldPlaceholder(key)}
                            className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-all duration-200 ${
                              key === "area"
                                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                : "bg-gray-200 text-gray-800 hover:border-gray-400"
                            }`}
                            disabled={key === "area"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex h-12 w-12 relative">
                    <button
                      onClick={() => deleteDigital(i)}
                      className="text-red-500 absolute cursor-pointer bottom-0"
                    >
                      <FaTrash size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center py-4">
              هیچ مورد چاپ دیجیتال اضافه نشده است.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={addDigital}
            className="flex items-center gap-2 text-sm bg-cyan-800 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
          >
            <FaPlus className="text-base" />
            افزودن سفارش
          </button>
          <div className="flex items-center gap-x-2 border-cyan-800 py-1 px-5">
            <span className="text-lg font-semibold text-gray-800">
              تعداد سفارش دیجیتال:
            </span>
            <span className="text-xl font-bold">{record.digital.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalSection;
