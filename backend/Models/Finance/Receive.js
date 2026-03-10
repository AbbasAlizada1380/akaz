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
  },
  {
    timestamps: true,
  }
);
export default Receive;