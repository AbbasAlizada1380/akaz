// models/staff/salary/paidSalary.js
import { DataTypes } from "sequelize";
import sequelize from "../../../dbconnection.js";

const PaidSalary = sequelize.define(
  "PaidSalary",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ✅ The attendance record this payment belongs to.
    // Each attendance row = one staff × one salary list.
    // Multiple payments can be linked to the same attendance (partial payments).
    attendanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "attendance", // must match Attendance.tableName
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      comment: "FK → attendance.id (one staff member on one salary list)",
    },

    // ✅ The amount paid in this specific transaction.
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: "Amount paid in this transaction (supports partial payments)",
    },

    note: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Optional note (e.g. 'partial payment', 'bonus')",
    },
  },
  {
    tableName: "PaidSalary",
    timestamps: true, // adds createdAt, updatedAt
    indexes: [
      // Fast lookup: all payments for a given attendance
      {
        name: "idx_paidsalary_attendance",
        fields: ["attendanceId"],
      },
      // ✅ Fast time-range queries: "all salary payments between X and Y"
      {
        name: "idx_paidsalary_createdat",
        fields: ["createdAt"],
      },
      // Composite: filter by staff + sort by date (very common report pattern)
      {
        name: "idx_paidsalary_attendance_createdat",
        fields: ["attendanceId", "createdAt"],
      },
    ],
  }
);

export default PaidSalary;