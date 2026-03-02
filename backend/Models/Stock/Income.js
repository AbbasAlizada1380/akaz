import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Income = sequelize.define(
  "Income",
  {
    Customer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    department: {
      type: DataTypes.STRING,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: true,
  }
);

export default Income;
