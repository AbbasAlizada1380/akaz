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
import Bill from './Finance/Bill.js';
import Factor from './Finance/Factor.js';
import Benefit from './Benefit.js';
import User from './User.js';
import Expense from './Expense.js';  // 👈 Import Expense model

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
  Factor,
  Benefit,
  User,
  Expense,  // 👈 Add Expense to models
};

/* ===============================
   Associate Methods
================================ */

// ---------- StockIncome ----------
StockIncome.associate = (models) => {
  StockIncome.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
  StockIncome.belongsTo(models.Seller, { foreignKey: "sellerId", as: "seller" });
  StockIncome.belongsTo(models.StockExist, { foreignKey: "existId", as: "stock" });
};

// ---------- Expense ----------
Expense.associate = (models) => {
  Expense.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
};

// ---------- Department ----------
Department.associate = (models) => {
  Department.hasMany(models.StockIncome, { foreignKey: "departmentId", as: "stockIncomes" });
  Department.hasMany(models.StockExist, { foreignKey: "departmentId", as: "stockExists" });
  Department.hasMany(models.DepartmentTransaction, { foreignKey: "depId", as: "transactions" });
  Department.hasMany(models.Benefit, { foreignKey: "departmentId", as: "benefits" });
  Department.hasMany(models.Expense, { foreignKey: "departmentId", as: "expenses" }); // 👈 Add Expense association
};

// ---------- Seller ----------
Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome, { foreignKey: "sellerId", as: "stockIncomes" });
  Seller.hasOne(models.SellerAccount, { foreignKey: "sellerId", as: "account" });
  Seller.hasMany(models.Pay, { foreignKey: "seller", as: "payments" });
  Seller.hasMany(models.Factor, { foreignKey: "sellerId", as: "factors" });
};

// ---------- Receive ----------
Receive.associate = (models) => {
  Receive.belongsTo(models.Customer, { foreignKey: "customer", as: "customerInfo" });
};

// ---------- Customer ----------
Customer.associate = (models) => {
  Customer.hasMany(models.Receive, { foreignKey: "customer", as: "receives" });
  Customer.hasMany(models.CustomerAccount, { foreignKey: "customerId", as: "accounts" });
  Customer.hasMany(models.Bill, { foreignKey: "customerId", as: "bills" });
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
  Sells.hasMany(models.Benefit, { foreignKey: "sellId", as: "benefits" });
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
  DepartmentTransaction.belongsTo(models.User, { foreignKey: "userId", as: "user" });
};

// ---------- Factor ----------
Factor.associate = (models) => {
  Factor.belongsTo(models.Seller, { foreignKey: "sellerId", as: "seller" });
};

// ---------- Benefit ----------
Benefit.associate = (models) => {
  Benefit.belongsTo(models.Sells, { foreignKey: "sellId", as: "sell" });
  Benefit.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
};

// ---------- User ----------
User.associate = (models) => {
  User.hasMany(models.DepartmentTransaction, { foreignKey: "userId", as: "departmentTransactions" });
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
  Factor,
  Benefit,
  User,
  Expense,  // 👈 Export Expense
};