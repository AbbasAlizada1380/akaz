import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";


const StockIncome = sequelize.define(
  "StockIncome",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    type: {
      type: DataTypes.STRING,
    },

    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
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

    remaining: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    specifications: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   Associations - Fixed
========================= */

// Instead of defining associate as a method, create a setup function
export const setupStockIncomeAssociations = (models) => {
  if (models.Department) {
    StockIncome.belongsTo(models.Department, {
      foreignKey: "departmentId",
      as: "department",
    });
  }

  if (models.Seller) {
    StockIncome.belongsTo(models.Seller, {
      foreignKey: "sellerId",
      as: "seller",
    });
  }
  
  return StockIncome;
};

export default StockIncome;