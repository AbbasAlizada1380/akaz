import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const StockExist = sequelize.define(
    "StockExist",
    {
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        allStockIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },

        soldStockIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },

        remainingStockIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
    },
    {
        timestamps: true,
    }
);

export default StockExist;