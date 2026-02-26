import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Member = sequelize.define(
  "Member",
  {
    name: {
      type: DataTypes.STRING,
    },
    description: {
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

export default Member;
