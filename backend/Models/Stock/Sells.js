import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";
const Sells = sequelize.define(

  "Sells",
  {
    exist: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "StockExists", key: "id" },
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    billId: {                       // changed from 'bill' to 'billId' for clarity
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Bills", key: "id" },
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    receipt: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    remaind: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
  },
  { timestamps: true }
);
export default Sells