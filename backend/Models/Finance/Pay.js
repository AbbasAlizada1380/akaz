import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";
import Seller from "../Seller/Seller.js";
import Department from "../Department.js"; // Add this import

const Pay = sequelize.define(
  "Pay",
  {
    seller: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Sellers",
        key: "id",
        index: true,
      },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Departments",
        key: "id",
        index: true,
      },
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);


export default Pay;