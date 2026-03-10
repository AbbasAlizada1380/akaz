import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";
import Customer from "./Customers.js";

const CustomerAccount = sequelize.define(
  "CustomerAccount",
  {
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Customer,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    paid: {
      type: DataTypes.JSON,   // ✅ use JSON instead of ARRAY
      allowNull: false,
      defaultValue: [],
    },

    unpaid: {
      type: DataTypes.JSON,   // ✅ use JSON instead of ARRAY
      allowNull: false,
      defaultValue: [],
    },

    total: {
      type: DataTypes.JSON,   // ✅ use JSON instead of ARRAY
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
  }
);

export default CustomerAccount;