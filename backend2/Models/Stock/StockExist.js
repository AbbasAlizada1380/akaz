import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockExist = sequelize.define(
    "StockExist",
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        department: {
            type: DataTypes.INTEGER,      // foreign key reference to Department model
            allowNull: false,
        },
        Amount: {
            type: DataTypes.INTEGER,      // or DataTypes.DECIMAL(10,2) if quantity can be fractional
            allowNull: false,
            defaultValue: 0,
        },
        sell_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        unite_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
    },
    {
        timestamps: true,   // adds createdAt & updatedAt
    }
);

export default StockExist;