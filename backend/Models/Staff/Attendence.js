import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // Time period – e.g., December 2027
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
      comment: "Month number (1-12) for this payroll period",
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Year for this payroll period",
    },

    // JSON array of staff salary details (per staff)
    salaries: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: `
        Array of objects:
        [
          {
            staffId: 1,
            salary: 5000,
            overtime: 0,        // default 0
            total: 5000,        // salary + overtime
            paid: 4500
          },
          ...
        ]
      `,
    },

    // JSON array of department-level summaries
    departmentSummaries: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: `
        Array of objects, each representing a department's totals:
        [
          {
            department: {
              id: 1,            // department ID
              total: 10000,     // sum of all staff (salary+overtime) in that dept
              received: 8000,   // total paid to staff in that dept
              remained: 2000    // unpaid balance for that dept
            }
          },
          ...
        ]
      `,
    },
  },
  {
    tableName: "attendance",   // kept for compatibility; consider renaming later
    timestamps: true,
    indexes: [
      {
        name: "payroll_month_year_idx",
        fields: ["month", "year"],
      },
    ],
  }
);

export default Attendance;