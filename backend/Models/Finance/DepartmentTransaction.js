import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const DepartmentTransaction = sequelize.define(
  "DepartmentTransaction",
  {
    depId: {
      type: DataTypes.INTEGER, // 👈 Foreign Key به Department
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER, // 👈 Foreign Key به User
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    is_deposit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // true = deposit, false = withdraw
    },
  },
  {
    timestamps: true,
  }
);

export default DepartmentTransaction;