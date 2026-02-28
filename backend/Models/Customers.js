import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Customer = sequelize.define(
  "Customer",
  {
    fullname: {
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

export default Customer;
