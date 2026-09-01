import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Staff = sequelize.define(
  "Staff",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Staff member's full name",
    },
    fatherName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Father's name of the staff member",
    },
    NIC: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "National ID / NIC number",
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: "weekly salary",
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
      comment: "Department this expense belongs to"
    },
    overTimePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
      comment: "Overtime pay per hour",
    },
    workingDaysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Number of working days per month",
    },
    isActive:{
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "indicating if the staff is currently working or is fired",
    }
  },
  {
    timestamps: true,
    indexes: [
       {
        fields: ['departmentId']
      },
      {
        fields: ['NIC']
      }
    ],
  }
);

export default Staff;
