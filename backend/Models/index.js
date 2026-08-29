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
import User from './user.js';
import Expense from './Expense.js';
import Staff from './Staff/staff.js';
import Attendance from './Staff/Attendence.js';

// ----- New models -----
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
  Debt,
  Payment,
  NonStaff
};

/* ===============================
   Associate Methods
================================ */

// ---------- StockIncome ----------
StockIncome.belongsTo(models.Department, {
  foreignKey: "departmentId",
  as: "stockIncomeDepartment",
  constraints: false           // ← add this
});
StockIncome.belongsTo(models.Seller, {
  foreignKey: "sellerId",
  as: "stockIncomeSeller",
  constraints: false
});
StockIncome.belongsTo(models.StockExist, {
  foreignKey: "existId",
  as: "stockIncomeStockExist",
  constraints: false
});

// ---------- Expense ----------
Expense.associate = (models) => {
  Expense.belongsTo(models.Department, { foreignKey: "departmentId", as: "expenseDepartment" });
};

// ---------- Department ----------
Department.associate = (models) => {
  Department.hasMany(models.StockIncome, { foreignKey: "departmentId", as: "departmentStockIncomes" });
  Department.hasMany(models.StockExist, { foreignKey: "departmentId", as: "departmentStockExists" });
  Department.hasMany(models.DepartmentTransaction, { foreignKey: "depId", as: "departmentTransactions" });
  Department.hasMany(models.Benefit, { foreignKey: "departmentId", as: "departmentBenefits" });
  Department.hasMany(models.Expense, { foreignKey: "departmentId", as: "departmentExpenses" });
  Department.hasMany(models.Sells, { foreignKey: "departmentId", as: "departmentSells" });
  Department.hasMany(models.Staff, { foreignKey: "departmentId", as: "departmentStaffs" });
  Department.hasMany(models.Attendance, { foreignKey: "departmentId", as: "departmentAttendances" });
  // New: Department can have many Debts
  Department.hasMany(models.Debt, { foreignKey: "departmentId", as: "departmentDebts" });
  // New: Department can have many Payments (denormalized)
  Department.hasMany(models.Payment, { foreignKey: "departmentId", as: "departmentPayments" });
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
  Receive.belongsTo(models.Customer, { foreignKey: "customer", as: "receiveCustomer" });
};

// ---------- Customer ----------
Customer.associate = (models) => {
  Customer.hasMany(models.Receive, { foreignKey: "customer", as: "customerReceives" });
  Customer.hasMany(models.CustomerAccount, { foreignKey: "customerId", as: "customerAccounts" });
  Customer.hasMany(models.Bill, { foreignKey: "customerId", as: "customerBills" });
};

// ---------- CustomerAccount ----------
CustomerAccount.associate = (models) => {
  CustomerAccount.belongsTo(models.Customer, { foreignKey: "customerId", as: "customerAccountCustomer" });
};

// ---------- SellerAccount ----------
SellerAccount.associate = (models) => {
  SellerAccount.belongsTo(models.Seller, { foreignKey: "sellerId", as: "sellerAccountSeller" });
};

// ---------- Bill ----------
Bill.associate = (models) => {
  Bill.belongsTo(models.Customer, { foreignKey: "customerId", as: "billCustomer" });
  Bill.hasMany(models.Sells, { foreignKey: "billId", as: "billSells" });
};

// ---------- Sells ----------
Sells.associate = (models) => {
  Sells.belongsTo(models.StockExist, { foreignKey: "exist", as: "sellStockExist" });
  Sells.belongsTo(models.Bill, { foreignKey: "billId", as: "sellBill" });
  Sells.belongsTo(models.Department, { foreignKey: "departmentId", as: "sellDepartment" });
  Sells.hasMany(models.Benefit, { foreignKey: "sellId", as: "sellBenefits" });
};

// ---------- StockExist ----------
StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, { foreignKey: "departmentId", as: "stockExistDepartment" });
  StockExist.hasMany(models.StockIncome, { foreignKey: "existId", as: "stockExistIncomes" });
  StockExist.hasMany(models.Sells, { foreignKey: "exist", as: "stockExistSells" });
};

// ---------- Pay ----------
Pay.associate = (models) => {
  Pay.belongsTo(models.Seller, { foreignKey: "seller", as: "paySeller" });
};

// ---------- Staff ----------
Staff.associate = (models) => {
  Staff.belongsTo(models.Department, { foreignKey: "departmentId", as: "staffDepartment" });
  Staff.hasMany(models.Attendance, { foreignKey: "staffId", as: "staffAttendances" });
  // New: Staff can have many Debts (if staffId is used)
  Staff.hasMany(models.Debt, { foreignKey: "staffId", as: "staffDebts" });
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
  Benefit.belongsTo(models.Sells, { foreignKey: "sellId", as: "benefitSell" });Benefit.belongsTo(models.Department, {
  foreignKey: "departmentId",
  as: "department"   // change from 'benefitDepartment' to 'department'
});
};

// ---------- Attendance ----------
Attendance.associate = (models) => {
  Attendance.belongsTo(models.Staff, { foreignKey: "staffId", as: "attendanceStaff" });
  Attendance.belongsTo(models.Department, { foreignKey: "departmentId", as: "attendanceDepartment" });
};

// ---------- User ----------
User.associate = (models) => {
  User.hasMany(models.DepartmentTransaction, { foreignKey: "userId", as: "userTransactions" });
};

// ========== NEW MODEL ASSOCIATIONS ==========

// ---------- Debt ----------
Debt.associate = (models) => {
  Debt.belongsTo(models.Department, { foreignKey: "departmentId", as: "debtDepartment" });
  Debt.belongsTo(models.Staff, { foreignKey: "staffId", as: "debtStaff" });
  Debt.belongsTo(models.NonStaff, { foreignKey: "nonStaffId", as: "debtNonStaff" });
  Debt.hasMany(models.Payment, { foreignKey: "debtId", as: "debtPayments" });
};

// ---------- Payment ----------
Payment.associate = (models) => {
  Payment.belongsTo(models.Debt, { foreignKey: "debtId", as: "paymentDebt" });
  Payment.belongsTo(models.Department, { foreignKey: "departmentId", as: "paymentDepartment" });
};

// ---------- NonStaff ----------
NonStaff.associate = (models) => {
  NonStaff.hasMany(models.Debt, { foreignKey: "nonStaffId", as: "nonStaffDebts" });
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
  Attendance,
  Debt,
  Payment,
  NonStaff
};