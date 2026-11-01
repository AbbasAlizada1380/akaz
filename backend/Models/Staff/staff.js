import { DataTypes } from "sequelize";
import sequelize from "../../dbconnection.js";

const Staff = sequelize.define(
  "Staff",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Staff member's full name",
    },
    fatherName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Father's name of the staff member",
    },
    NIC: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "National ID / NIC number",
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: "Monthly salary",
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Departments",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      comment: "Department this staff member belongs to",
    },

    // ✅ Denormalized snapshot of the department name.
    // Useful for reports / historical records even if the department is renamed.
    departmentName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Snapshot of the department name at creation/update time",
    },

    // ✅ Virtual convenience field — not stored in DB.
    // Requires the Staff -> Department association
    // (see index.js: Staff.belongsTo(Department, { as: 'staffDepartment' }))
    department: {
      type: DataTypes.VIRTUAL,
      get() {
        const dep = this.getDataValue("staffDepartment");
        return dep ? { id: dep.id, name: dep.name } : null;
      },
      set() {
        throw new Error("Do not set `department` directly — use `departmentId`.");
      },
    },

    overTimePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
      comment: "Overtime pay per hour",
    },
    workingDaysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Number of working days per month",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Indicates if the staff is currently working or is fired",
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ["departmentId"],
      },
      {
        fields: ["NIC"],
      },
    ],
  }
);

export default Staff;