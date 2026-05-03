import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Benefit = sequelize.define(
  "Benefit",
  {
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    sellId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export default Benefit;