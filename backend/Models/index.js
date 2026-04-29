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
import DepartmentTransaction from './Finance/DepartmentTransaction.js';   // ✅ added

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
  DepartmentTransaction,   // ✅ added
};

/* ===============================
   Associate Methods
================================ */

StockIncome.associate = (models) => {
  StockIncome.belongsTo(models.Department, {
    foreignKey: "departmentId",
    as: "department",
  });

  StockIncome.belongsTo(models.Seller, {
    foreignKey: "sellerId",
    as: "seller",
  });

  StockIncome.belongsTo(models.StockExist, {
    foreignKey: "existId",
    as: "stock",
  });

  StockIncome.hasMany(models.Sells, {
    foreignKey: "stockIncome",
    as: "sells",
  });
};

Department.associate = (models) => {
  Department.hasMany(models.StockIncome, {
    foreignKey: "departmentId",
    as: "stockIncomes",
  });

  Department.hasMany(models.StockExist, {
    foreignKey: "departmentId",
    as: "stockExists",
  });

  // ✅ NEW: Department ↔ DepartmentTransaction
  Department.hasMany(models.DepartmentTransaction, {
    foreignKey: "depId",
    as: "transactions",
  });
};

Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome, {
    foreignKey: "sellerId",
    as: "stockIncomes",
  });

  Seller.hasOne(models.SellerAccount, {
    foreignKey: "sellerId",
    as: "account",
  });

  Seller.hasMany(models.Pay, {
    foreignKey: "seller",
    as: "payments",
  });
};

Receive.associate = (models) => {
  Receive.belongsTo(models.Customer, {
    foreignKey: "customer",
    as: "customerInfo",
  });
};

Customer.associate = (models) => {
  Customer.hasMany(models.Receive, {
    foreignKey: "customer",
    as: "receives",
  });

  Customer.hasMany(models.CustomerAccount, {
    foreignKey: "customerId",
    as: "accounts",
  });

  Customer.hasMany(models.Sells, {
    foreignKey: "customer",
    as: "sells",
  });
};

CustomerAccount.associate = (models) => {
  CustomerAccount.belongsTo(models.Customer, {
    foreignKey: "customerId",
    as: "customer",
  });
};

SellerAccount.associate = (models) => {
  SellerAccount.belongsTo(models.Seller, {
    foreignKey: "sellerId",
    as: "seller",
  });
};

Sells.associate = (models) => {
  Sells.belongsTo(models.StockIncome, {
    foreignKey: "stockIncome",
    as: "stock",
  });

  Sells.belongsTo(models.Customer, {
    foreignKey: "customer",
    as: "customerInfo",
  });
};

StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, {
    foreignKey: "departmentId",
    as: "department",
  });

  StockExist.hasMany(models.StockIncome, {
    foreignKey: "existId",
    as: "incomes",
  });
};

Pay.associate = (models) => {
  Pay.belongsTo(models.Seller, {
    foreignKey: "seller",
    as: "sellerInfo",
  });
};

// ✅ NEW: DepartmentTransaction association
DepartmentTransaction.associate = (models) => {
  DepartmentTransaction.belongsTo(models.Department, {
    foreignKey: "depId",
    as: "department",
  });
};

/* ===============================
   Setup associations
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
  DepartmentTransaction,   // ✅ exported
};