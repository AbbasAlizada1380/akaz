import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const NonStaff = sequelize.define(
  "NonStaff",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Full name or company name of the non‑staff debtor",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Full name or company name of the non‑staff debtor",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Any additional remarks",
    },
  },
  {
    timestamps: true,
    tableName: "NonStaffs",
    indexes: [
      {
        name: "nonstaffs_name_idx",
        fields: ["name"],
      },
    ],
  }
);

export default NonStaff;