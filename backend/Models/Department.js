import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Department = sequelize.define(
  "Department",
  {
    name: {
      type: DataTypes.STRING,
    },
    holding: {
      type: DataTypes.JSON,
    },
    stockIncome: {
      type: DataTypes.JSON,
    },
    exist: {
      type: DataTypes.JSON,
    },
    benifit: {
      type: DataTypes.JSON,
      comment: "Array of Benefit IDs from unpaid or partially paid sells",
      defaultValue: [],
    },
    realizedBenefit: {
      type: DataTypes.JSON,
      comment: "Array of Benefit IDs from fully paid sells (cash realized)",
      defaultValue: [],
    },
    deposit: {
      type: DataTypes.JSON,
    },
    withdraw: {
      type: DataTypes.JSON,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: true,
  }
);

export default Department;