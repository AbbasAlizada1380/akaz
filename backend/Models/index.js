import sequelize from '../dbconnection.js';
import Department from './Department.js';
import Seller from './Seller/Seller.js';
import StockIncome from './Stock/StockIncome.js';
import SellerAccount from './Seller/SellerAccount.js';
import Sells from './Stock/Sells.js';
import StockExist from './Stock/StockExist.js';
import Pay from './Finance/Pay.js';
import Receive from './Finance/Receive.js';
import Customer from './Customer/Customers.js';
import CustomerAccount from './Customer/CustomerAccount.js';
import DepartmentTransaction from './Finance/DepartmentTransaction.js';
import Bill from "./Bill.js";

const models = {
  Department,
  Seller,
  StockIncome,
  SellerAccount,
  Sells,
  StockExist,
  Pay,
  Receive,
  Customer,
  CustomerAccount,
  DepartmentTransaction,
  Bill,
};

/* ===============================
   Associate Methods (each defined only once)
================================ */

// ---------- StockIncome ----------
StockIncome.associate = (models) => {
  StockIncome.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
  StockIncome.belongsTo(models.Seller, { foreignKey: "sellerId", as: "seller" });
  StockIncome.belongsTo(models.StockExist, { foreignKey: "existId", as: "stock" });
  // Sells no longer has stockIncome, so this association is removed.
};

// ---------- Department ----------
Department.associate = (models) => {
  Department.hasMany(models.StockIncome, { foreignKey: "departmentId", as: "stockIncomes" });
  Department.hasMany(models.StockExist, { foreignKey: "departmentId", as: "stockExists" });
  Department.hasMany(models.DepartmentTransaction, { foreignKey: "depId", as: "transactions" });
};

// ---------- Seller ----------
Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome, { foreignKey: "sellerId", as: "stockIncomes" });
  Seller.hasOne(models.SellerAccount, { foreignKey: "sellerId", as: "account" });
  Seller.hasMany(models.Pay, { foreignKey: "seller", as: "payments" });
};

// ---------- Receive ----------
Receive.associate = (models) => {
  Receive.belongsTo(models.Customer, { foreignKey: "customer", as: "customerInfo" });
};

// ---------- Customer ----------
Customer.associate = (models) => {
  Customer.hasMany(models.Receive, { foreignKey: "customer", as: "receives" });
  Customer.hasMany(models.CustomerAccount, { foreignKey: "customerId", as: "accounts" });
  Customer.hasMany(models.Bill, { foreignKey: "customerId", as: "bills" });   // ✅ moved here
};

// ---------- CustomerAccount ----------
CustomerAccount.associate = (models) => {
  CustomerAccount.belongsTo(models.Customer, { foreignKey: "customerId", as: "customer" });
};

// ---------- SellerAccount ----------
SellerAccount.associate = (models) => {
  SellerAccount.belongsTo(models.Seller, { foreignKey: "sellerId", as: "seller" });
};

// ---------- Bill ----------
Bill.associate = (models) => {
  Bill.belongsTo(models.Customer, { foreignKey: "customerId", as: "customer" });
  Bill.hasMany(models.Sells, { foreignKey: "billId", as: "items" });
};

// ---------- Sells ----------
Sells.associate = (models) => {
  Sells.belongsTo(models.StockExist, { foreignKey: "exist", as: "product" });
  Sells.belongsTo(models.Bill, { foreignKey: "billId", as: "bill" });
};

// ---------- StockExist ----------
StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
  StockExist.hasMany(models.StockIncome, { foreignKey: "existId", as: "incomes" });
  StockExist.hasMany(models.Sells, { foreignKey: "exist", as: "sells" });
};

// ---------- Pay ----------
Pay.associate = (models) => {
  Pay.belongsTo(models.Seller, { foreignKey: "seller", as: "sellerInfo" });
};

// ---------- DepartmentTransaction ----------
DepartmentTransaction.associate = (models) => {
  DepartmentTransaction.belongsTo(models.Department, { foreignKey: "depId", as: "department" });
};

/* ===============================
   Apply all associations
================================ */
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

export {
  sequelize,
  Department,
  Seller,
  StockIncome,
  SellerAccount,
  Sells,
  StockExist,
  Pay,
  Receive,
  Customer,
  CustomerAccount,
  DepartmentTransaction,
  Bill,
};