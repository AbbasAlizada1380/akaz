import { DataTypes } from "sequelize";
import sequelize from "../dbconnection.js";

const Expense = sequelize.define(
  "Expense",
  {
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "What the Expense is for"
    },
    by: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Who initiated the Expense"
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
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
    calculated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: {
      type: DataTypes.TEXT
    },
  },
  {
    timestamps: true,
    indexes: [
      // Essential index for department filtering
      {
        name: 'expenses_department_id_idx',
        fields: ['departmentId']
      },
      // CRITICAL: Composite index for date range queries per department
      {
        name: 'expenses_dept_created_idx',
        fields: ['departmentId', 'createdAt']
      }
    ]
  }
);

export default Expense;