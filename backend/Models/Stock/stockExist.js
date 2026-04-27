import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockExist = sequelize.define(
    "StockExist",
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        sell_price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },

        unit_price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
    },
    {
        timestamps: true,
    }
);

export default StockExist;