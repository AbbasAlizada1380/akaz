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
    isActive: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: true,
  }
);

export default Department;
