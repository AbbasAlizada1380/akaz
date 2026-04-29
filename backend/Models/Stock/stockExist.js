import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockExist = sequelize.define(
    "StockExist",
    {
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