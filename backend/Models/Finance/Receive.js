import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Receive = sequelize.define(
  "Receive",
  {
    customer: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    // 🔽 NEW FIELDS
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true, // can be null if not linked to a bill
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sellId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default Receive;