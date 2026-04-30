import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Bill = sequelize.define(
  "Bill",
  {
    billNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Customers",
        key: "id",
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    remainingAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("paid", "partial", "unpaid"),
      defaultValue: "unpaid",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sells: {
      type: DataTypes.JSON,      // stores array of sell IDs e.g. [1, 2, 3]
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
  }
);

export default Bill;