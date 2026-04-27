import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockIncome = sequelize.define(
  "StockIncome",
  {
    exist: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID of the exist record (foreign key to Exist table)",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Quantity of items",
    },
    unitePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Unit price of the item",
    },
    expense: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Extra charges for this income record",
    },
    totalUnitePrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Total unit price (amount * unitePrice + expense)",
    },
    sellPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Selling price (per unit or total, as per business logic)",
    },
    seller: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID of the seller (foreign key to Seller table)",
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Total amount (e.g., total selling value)",
    },
    remaind: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Remaining balance due",
    },
    paid: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: "Amount paid",
    },
  },
  {
    timestamps: true,
  }
);

export default StockIncome;