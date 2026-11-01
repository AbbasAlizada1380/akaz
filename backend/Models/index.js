import sequelize from '../dbconnection.js';

// Core
import Department from './Department.js';
import Seller from './Seller/Seller.js';
import SellerAccount from './Seller/SellerAccount.js';

// Stock
import StockIncome from './Stock/StockIncome.js';
import Sells from './Stock/Sells.js';
import StockExist from './Stock/StockExist.js';

// Finance
import Pay from './Finance/Pay.js';
import Receive from './Finance/Receive.js';
import DepartmentTransaction from './Finance/DepartmentTransaction.js';
import Bill from './Finance/Bill.js';
import Factor from './Finance/Factor.js';
import Benefit from './Benefit.js';
import Expense from './Expense.js';

// Customer
import Customer from './Customer/Customers.js';
import CustomerAccount from './Customer/CustomerAccount.js';

// Users / Staff
import User from './user.js';
import Staff from './Staff/staff.js';
import Attendance from './Staff/salary/Attendence.js';
import SalaryList from './Staff/salary/SalaryList.js';      // ← was missing
import PaidSalary from './Staff/salary/PaidSalary.js';      // ← was missing

// Debt
import Debt from './Debt/Debt.js';
import Payment from './Debt/Payment.js';
import NonStaff from './Debt/NonStaff.js';

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
  Attendance,
  SalaryList,
  PaidSalary,
  Debt,
  Payment,
  NonStaff,
};

/* ===============================
   Associate Methods
   (Every relation is inside .associate,
    executed once via the loop at the bottom.
    This avoids ordering bugs and keeps
    a single source of truth.)
================================ */

// ---------- StockIncome ----------
StockIncome.associate = (models) => {
  StockIncome.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'stockIncomeDepartment',
    constraints: false,
  });
  StockIncome.belongsTo(models.Seller, {
    foreignKey: 'sellerId',
    as: 'stockIncomeSeller',
    constraints: false,
  });
  StockIncome.belongsTo(models.StockExist, {
    foreignKey: 'existId',
    as: 'stockIncomeStockExist',
    constraints: false,
  });
};

// ---------- StockExist ----------
StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'stockExistDepartment',
  });
  StockExist.hasMany(models.StockIncome, {
    foreignKey: 'existId',
    as: 'stockExistIncomes',
  });
  StockExist.hasMany(models.Sells, {
    foreignKey: 'exist',
    as: 'stockExistSells',
  });
};

// ---------- Sells ----------
Sells.associate = (models) => {
  Sells.belongsTo(models.StockExist, {
    foreignKey: 'exist',
    as: 'sellStockExist',
  });
  Sells.belongsTo(models.Bill, {
    foreignKey: 'billId',
    as: 'sellBill',
  });
  Sells.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'sellDepartment',
  });
  Sells.hasMany(models.Benefit, {
    foreignKey: 'sellId',
    as: 'sellBenefits',
  });
};

// ---------- Benefit ----------
Benefit.associate = (models) => {
  Benefit.belongsTo(models.Sells, {
    foreignKey: 'sellId',
    as: 'benefitSell',
  });
  Benefit.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'department',
  });
};

// ---------- Expense ----------
Expense.associate = (models) => {
  Expense.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'expenseDepartment',
  });
};

// ---------- Department ----------
Department.associate = (models) => {
  Department.hasMany(models.StockIncome,   { foreignKey: 'departmentId', as: 'departmentStockIncomes' });
  Department.hasMany(models.StockExist,    { foreignKey: 'departmentId', as: 'departmentStockExists' });
  Department.hasMany(models.DepartmentTransaction, { foreignKey: 'depId', as: 'departmentTransactions' });
  Department.hasMany(models.Benefit,       { foreignKey: 'departmentId', as: 'departmentBenefits' });
  Department.hasMany(models.Expense,       { foreignKey: 'departmentId', as: 'departmentExpenses' });
  Department.hasMany(models.Sells,         { foreignKey: 'departmentId', as: 'departmentSells' });
  Department.hasMany(models.Staff,         { foreignKey: 'departmentId', as: 'departmentStaffs' });
  Department.hasMany(models.Attendance,    { foreignKey: 'departmentId', as: 'departmentAttendances' });
  Department.hasMany(models.Debt,          { foreignKey: 'departmentId', as: 'departmentDebts' });
  Department.hasMany(models.Payment,       { foreignKey: 'departmentId', as: 'departmentPayments' });
  Department.hasMany(models.Pay,           { foreignKey: 'departmentId', as: 'departmentPays' });
  Department.hasMany(models.Factor,        { foreignKey: 'dep_Number',   as: 'departmentFactors' });
};

// ---------- Seller ----------
Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome,  { foreignKey: 'sellerId', as: 'sellerStockIncomes' });
  Seller.hasOne(models.SellerAccount, { foreignKey: 'sellerId', as: 'sellerAccount' });
  Seller.hasMany(models.Pay,          { foreignKey: 'seller',   as: 'sellerPayments' });
  Seller.hasMany(models.Factor,       { foreignKey: 'sellerId', as: 'sellerFactors' });
};

// ---------- SellerAccount ----------
SellerAccount.associate = (models) => {
  SellerAccount.belongsTo(models.Seller, {
    foreignKey: 'sellerId',
    as: 'sellerAccountSeller',
  });
};

// ---------- Pay ----------
Pay.associate = (models) => {
  Pay.belongsTo(models.Seller, {
    foreignKey: 'seller',
    as: 'paySeller',
  });
  Pay.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'payDepartment',
  });
};

// ---------- Receive ----------
Receive.associate = (models) => {
  Receive.belongsTo(models.Customer,   { foreignKey: 'customer',     as: 'receiveCustomer' });
  Receive.belongsTo(models.Bill,       { foreignKey: 'billId',       as: 'receiveBill' });
  Receive.belongsTo(models.Sells,      { foreignKey: 'sellId',       as: 'receiveSell' });
  Receive.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'receiveDepartment' });
};

// ---------- Customer ----------
Customer.associate = (models) => {
  Customer.hasMany(models.Receive,         { foreignKey: 'customer',   as: 'customerReceives' });
  Customer.hasMany(models.CustomerAccount, { foreignKey: 'customerId', as: 'customerAccounts' });
  Customer.hasMany(models.Bill,            { foreignKey: 'customerId', as: 'customerBills' });
};

// ---------- CustomerAccount ----------
CustomerAccount.associate = (models) => {
  CustomerAccount.belongsTo(models.Customer, {
    foreignKey: 'customerId',
    as: 'customerAccountCustomer',
  });
};

// ---------- Bill ----------
Bill.associate = (models) => {
  Bill.belongsTo(models.Customer, {
    foreignKey: 'customerId',
    as: 'billCustomer',
  });
  Bill.hasMany(models.Sells, {
    foreignKey: 'billId',
    as: 'billSells',
  });
  Bill.hasMany(models.Receive, {
    foreignKey: 'billId',
    as: 'billReceives',
  });
};

// ---------- DepartmentTransaction ----------
DepartmentTransaction.associate = (models) => {
  DepartmentTransaction.belongsTo(models.Department, {
    foreignKey: 'depId',
    as: 'deptTransactionDepartment',
  });
  DepartmentTransaction.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'deptTransactionUser',
  });
};

// ---------- Factor ----------
Factor.associate = (models) => {
  Factor.belongsTo(models.Seller, {
    foreignKey: 'sellerId',
    as: 'factorSeller',
  });
  Factor.belongsTo(models.Department, {
    foreignKey: 'dep_Number',
    as: 'factorDepartment',
  });
};

// ---------- User ----------
User.associate = (models) => {
  User.hasMany(models.DepartmentTransaction, {
    foreignKey: 'userId',
    as: 'userTransactions',
  });
};

// ---------- Staff ----------
Staff.associate = (models) => {
  Staff.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'staffDepartment',
  });
  Staff.hasMany(models.Attendance, {
    foreignKey: 'staffId',
    as: 'staffAttendances',
  });
  Staff.hasMany(models.Debt, {
    foreignKey: 'staffId',
    as: 'staffDebts',
  });
};

// ---------- Attendance ----------  ★ fixed ★
Attendance.associate = (models) => {
  Attendance.belongsTo(models.Staff, {
    foreignKey: 'staffId',
    as: 'attendanceStaff',
  });
  Attendance.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'attendanceDepartment',
  });
  // ★ Attendance.list → SalaryList.id  (was never linked before)
  Attendance.belongsTo(models.SalaryList, {
    foreignKey: 'list',
    as: 'salaryList',
  });
  // ★ Multiple partial payments per attendance row
  Attendance.hasMany(models.PaidSalary, {
    foreignKey: 'attendanceId',
    as: 'paidSalaries',
  });
};

// ---------- SalaryList ----------  ★ new ★
SalaryList.associate = (models) => {
  SalaryList.hasMany(models.Attendance, {
    foreignKey: 'list',
    as: 'attendances',
  });
};

// ---------- PaidSalary ----------  ★ new ★
PaidSalary.associate = (models) => {
  PaidSalary.belongsTo(models.Attendance, {
    foreignKey: 'attendanceId',
    as: 'attendance',
  });
};

// ---------- Debt ----------
Debt.associate = (models) => {
  Debt.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'debtDepartment',
  });
  Debt.belongsTo(models.Staff, {
    foreignKey: 'staffId',
    as: 'debtStaff',
  });
  Debt.belongsTo(models.NonStaff, {
    foreignKey: 'nonStaffId',
    as: 'debtNonStaff',
  });
  Debt.hasMany(models.Payment, {
    foreignKey: 'debtId',
    as: 'debtPayments',
  });
};

// ---------- Payment ----------
Payment.associate = (models) => {
  Payment.belongsTo(models.Debt, {
    foreignKey: 'debtId',
    as: 'paymentDebt',
  });
  Payment.belongsTo(models.Department, {
    foreignKey: 'departmentId',
    as: 'paymentDepartment',
  });
};

// ---------- NonStaff ----------
NonStaff.associate = (models) => {
  NonStaff.hasMany(models.Debt, {
    foreignKey: 'nonStaffId',
    as: 'nonStaffDebts',
  });
};

/* ===============================
   Apply all associations
================================ */
Object.keys(models).forEach((modelName) => {
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
  Attendance,
  SalaryList,
  PaidSalary,
  Debt,
  Payment,
  NonStaff,
};