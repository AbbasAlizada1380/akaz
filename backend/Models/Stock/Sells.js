import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Sells = sequelize.define(
  "Sells",
  {
    exist: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "StockExists", key: "id" },
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Bills", key: "id" },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Departments",
        key: "id"
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      comment: "Department this sell belongs to"
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount_percent: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    discounted_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    receipt: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    remaind: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
  },
  { 
    timestamps: true,
    indexes: [
      {
        name: 'sells_department_id_idx',
        fields: ['departmentId']
      },
      {
        name: 'sells_bill_id_idx',
        fields: ['billId']
      },
      {
        name: 'sells_exist_idx',
        fields: ['exist']
      },
      {
        name: 'sells_department_created_idx',
        fields: ['departmentId', 'createdAt']
      }
    ]
  }
);

export default Sells;