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
import Expense from './Expense.js';
import Staff from './Staff/staff.js';
import Attendance from './Staff/Attendence.js';

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
  Expense,
  Staff,
  Attendance
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
  Department.hasMany(models.DepartmentTransaction, { foreignKey: "depId", as: "departmentTransactions" });
  Department.hasMany(models.Benefit, { foreignKey: "departmentId", as: "benefits" });
  Department.hasMany(models.Expense, { foreignKey: "departmentId", as: "expenses" });
  Department.hasMany(models.Sells, { foreignKey: "departmentId", as: "sells" });
  Department.hasMany(models.Staff, { foreignKey: "departmentId", as: "departmentStaffs" });
  Department.hasMany(models.Attendance, { foreignKey: "departmentId", as: "departmentAttendances" });
};

// ---------- Seller ----------
Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome, { foreignKey: "sellerId", as: "sellerStockIncomes" });
  Seller.hasOne(models.SellerAccount, { foreignKey: "sellerId", as: "sellerAccount" });
  Seller.hasMany(models.Pay, { foreignKey: "seller", as: "sellerPayments" });
  Seller.hasMany(models.Factor, { foreignKey: "sellerId", as: "sellerFactors" });
};

// ---------- Receive ----------
Receive.associate = (models) => {
  Receive.belongsTo(models.Customer, { foreignKey: "customer", as: "customerInfo" });
};

// ---------- Customer ----------
Customer.associate = (models) => {
  Customer.hasMany(models.Receive, { foreignKey: "customer", as: "customerReceives" });
  Customer.hasMany(models.CustomerAccount, { foreignKey: "customerId", as: "customerAccounts" });
  Customer.hasMany(models.Bill, { foreignKey: "customerId", as: "customerBills" });
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
  Bill.hasMany(models.Sells, { foreignKey: "billId", as: "billItems" });
};

// ---------- Sells ----------
Sells.associate = (models) => {
  Sells.belongsTo(models.StockExist, { foreignKey: "exist", as: "sellProduct" });
  Sells.belongsTo(models.Bill, { foreignKey: "billId", as: "sellBill" });
  Sells.belongsTo(models.Department, { foreignKey: "departmentId", as: "sellDepartment" });
  Sells.hasMany(models.Benefit, { foreignKey: "sellId", as: "sellBenefits" });
};

// ---------- StockExist ----------
StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, { foreignKey: "departmentId", as: "stockDepartment" });
  StockExist.hasMany(models.StockIncome, { foreignKey: "existId", as: "stockIncomes" });
  StockExist.hasMany(models.Sells, { foreignKey: "exist", as: "stockSells" });
};

// ---------- Pay ----------
Pay.associate = (models) => {
  Pay.belongsTo(models.Seller, { foreignKey: "seller", as: "paySeller" });
};

// ---------- Staff ----------
Staff.associate = (models) => {
  Staff.belongsTo(models.Department, { foreignKey: "departmentId", as: "staffDepartment" });
  Staff.hasMany(models.Attendance, { foreignKey: "staffId", as: "staffAttendanceRecords" }); // Changed from "attendances"
};

// ---------- DepartmentTransaction ----------
DepartmentTransaction.associate = (models) => {
  DepartmentTransaction.belongsTo(models.Department, { foreignKey: "depId", as: "deptTransactionDepartment" });
  DepartmentTransaction.belongsTo(models.User, { foreignKey: "userId", as: "deptTransactionUser" });
};

// ---------- Factor ----------
Factor.associate = (models) => {
  Factor.belongsTo(models.Seller, { foreignKey: "sellerId", as: "factorSeller" });
};

// ---------- Benefit ----------
Benefit.associate = (models) => {
  Benefit.belongsTo(models.Sells, { foreignKey: "sellId", as: "benefitSell" });
  Benefit.belongsTo(models.Department, { foreignKey: "departmentId", as: "benefitDepartment" });
};

// ---------- Attendance ----------
Attendance.associate = (models) => {
  Attendance.belongsTo(models.Staff, { foreignKey: "staffId", as: "attendanceStaff" });
  Attendance.belongsTo(models.Department, { foreignKey: "departmentId", as: "attendanceDepartment" });
};

// ---------- User ----------
User.associate = (models) => {
  User.hasMany(models.DepartmentTransaction, { foreignKey: "userId", as: "userDepartmentTransactions" });
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
  Expense,
  Staff,
  Attendance
};