import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Return_Pay = sequelize.define(
  "Return_Pay",
  {
    To: {
      type: DataTypes.STRING,
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
export default Return_Pay;