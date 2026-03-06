import sequelize from '../dbconnection.js';
import Department from './Department.js';
import Seller from './Seller/Seller.js';
import StockIncome from './Stock/StockIncome.js';
import SellerAccount from './Seller/SellerAccount.js';
import Sells from './Stock/Sells.js';
import StockExist from './Stock/StockExist.js';   // ✅ اضافه شود

const models = {
  Department,
  Seller,
  StockIncome,
  SellerAccount,
  Sells,
  StockExist,   // ✅ اضافه شود
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

  // ✅ relation with StockExist
  Department.hasMany(models.StockExist, {
    foreignKey: "departmentId",
    as: "stockExists",
  });
};

Seller.associate = (models) => {
  Seller.hasMany(models.StockIncome, {
    foreignKey: "sellerId",
    as: "stockIncomes",
  });

  Seller.hasMany(models.SellerAccount, {
    foreignKey: "sellerId",
    as: "accounts",
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
};

// ✅ relation from StockExist side
StockExist.associate = (models) => {
  StockExist.belongsTo(models.Department, {
    foreignKey: "departmentId",
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
  StockExist,   // ✅ export
};