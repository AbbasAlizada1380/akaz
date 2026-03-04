import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Sell = sequelize.define(
  "Sell",
  {
    stockIncome: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    customer: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    received: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    remained: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default Sell;