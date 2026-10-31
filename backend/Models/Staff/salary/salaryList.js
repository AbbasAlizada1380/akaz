// models/salaryList.js
import { DataTypes } from "sequelize";
import sequelize from "../../../dbconnection.js";

const SalaryList = sequelize.define(
  "SalaryList",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    range: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ✅ Array of staff IDs. No FK — MySQL can't enforce it on arrays.
    staffIds: {
      type: DataTypes.JSON,           // works on MySQL 5.7+ and MariaDB 10.2+
      allowNull: false,
      defaultValue: [],
      comment: "Array of Staff.id values included in this salary list",
    },

    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "salary + overtime",
    },
    paid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: "SalaryList",
  }
);

export default SalaryList;