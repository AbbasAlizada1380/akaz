import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockIncome = sequelize.define(
  "StockIncome",
  {
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    net_unite_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    expense: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    unit_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    sell_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    FactorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    paid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    remaind: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default StockIncome;