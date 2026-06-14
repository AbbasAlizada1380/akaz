import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Debt = sequelize.define(
  "Debt",
  {
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Staffs", key: "id" },
      onDelete: "SET NULL",
      comment: "Reference to staff if the debtor is an employee",
    },
    nonStaffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "NonStaffs", key: "id" },
      onDelete: "SET NULL",
      comment: "Reference to non‑staff debtor (customer, supplier, etc.)",
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "What the Debt is for",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    remainingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: "Outstanding balance after payments",
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Departments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      comment: "Department this debt belongs to",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "True = unpaid (remainingAmount > 0), false = fully paid",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "Debts",
    indexes: [
      { fields: ["departmentId"] },
      { fields: ["departmentId", "createdAt"] },
      { fields: ["isActive"] },
      { fields: ["staffId"] },
      { fields: ["nonStaffId"] },
      { fields: ["remainingAmount"] }, // optional: for faster filtering by outstanding debt
    ],
  }
);

export default Debt;