import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockExist = sequelize.define(
    "StockExist",
    {
        code_number: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },

        sell_price: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },

        unit_price: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
    },
    {
        timestamps: true,
    }
);

export default StockExist;