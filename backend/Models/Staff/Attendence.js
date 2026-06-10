import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";
import Staff from "./staff.js";
import Department from "../Department.js";

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Staff,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    attendance: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: `
      {
        Saturday:  { attendance: true, overtime: 0 },
        Sunday:    { attendance: true, overtime: 0 },
        Monday:    { attendance: true, overtime: 0 },
        Tuesday:   { attendance: true, overtime: 0 },
        Wednesday: { attendance: true, overtime: 0 },
        Thursday:  { attendance: true, overtime: 0 }
      }
      `,
    },

    salary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Calculated based on attendance days",
    },
    
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: "Department this attendance record belongs to"
    },

    overtime: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "Calculated based on total overtime hours * overtimePerHour",
    },

    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "salary + overtime",
    },
    
    receipt: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    
    calculated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    // Optional: Add week start date to track which week the attendance is for
    weekStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Start date of the week for this attendance record",
    },
    
    // Optional: Add month and year for easier querying
    month: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Month number (1-12) for the attendance record",
    },
    
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Year for the attendance record",
    }
  },
  {
    tableName: "attendance",
    timestamps: true,
    indexes: [
      {
        name: 'attendance_staff_id_idx',
        fields: ['staffId']
      },
      {
        name: 'attendance_department_id_idx',
        fields: ['departmentId']
      },
      {
        name: 'attendance_staff_department_idx',
        fields: ['staffId', 'departmentId']
      },
      {
        name: 'attendance_week_start_idx',
        fields: ['weekStartDate']
      },
      {
        name: 'attendance_month_year_idx',
        fields: ['month', 'year']
      }
    ]
  }
);

// Relations
Staff.hasMany(Attendance, { foreignKey: "staffId", as: "attendances" });
Attendance.belongsTo(Staff, { foreignKey: "staffId", as: "staff" });

Department.hasMany(Attendance, { foreignKey: "departmentId", as: "attendances" });
Attendance.belongsTo(Department, { foreignKey: "departmentId", as: "department" });

export default Attendance;