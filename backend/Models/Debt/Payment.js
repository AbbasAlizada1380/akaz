import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Payment = sequelize.define(
  "Payment",
  {
    debtId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Debts",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      comment: "The debt this payment is for",
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Departments", // make sure this matches your Department table name
        key: "id",
      },
      onUpdate: "CASCADE",
      // onDelete: "RESTRICT" – optionally prevent deletion of department with payments
      comment: "The department responsible for this payment (denormalized from debt)",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      comment: "Amount paid",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Additional notes",
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "The date this payment was made",
    },
  },
  {
    timestamps: true,
    tableName: "Payments",
    indexes: [
      {
        name: "payments_debt_id_idx",
        fields: ["debtId"],
      },
      {
        name: "payments_debt_created_idx",
        fields: ["debtId", "createdAt"],
      },
      {
        name: "payments_payment_date_idx",
        fields: ["paymentDate"],
      },
      {
        name: "payments_department_id_idx",   // new index
        fields: ["departmentId"],
      },
    ],
  }
);

export default Payment;