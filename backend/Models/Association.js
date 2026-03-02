
import Department from '../Models/Department.js';
import Seller from '../Models/Seller.js';
import StockIncome from '../Models/Stock/StockIncome.js';

export const setupAssociations = () => {
  // StockIncome associations
  StockIncome.belongsTo(Department, {
    foreignKey: "departmentId",
    as: "department",
  });

  StockIncome.belongsTo(Seller, {
    foreignKey: "sellerId",
    as: "seller",
  });

  // Department associations (if any)
  // Department.hasMany(StockIncome, { ... });

  // Seller associations (if any)
  // Seller.hasMany(StockIncome, { ... });

  console.log('✅ Associations set up successfully');
};