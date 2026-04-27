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
  // ✅ Only ONE alias "stockIncomes" – remove any duplicate elsewhere
  Department.hasMany(models.StockIncome, {
    foreignKey: "departmentId",
    as: "stockIncomes",        // keep this one
  });

  // ✅ Second association uses a DIFFERENT alias
  Department.hasMany(models.StockExist, {
    foreignKey: "departmentId",
    as: "stockExists",         // was "stockIncomes"? No, this is fine
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
};