import Customer from "../Models/Customers.js";
import { Op } from "sequelize";

/* ===========================
   Create Customer
=========================== */
export const createCustomer = async (req, res) => {
  const transaction = await Customer.sequelize.transaction();
  try {
    const { fullname, phoneNumber, address, department, isActive } = req.body;

    if (!fullname) {
      return res.status(400).json({ message: "Full name is required" });
    }

    // Create customer within transaction with all fields
    const customer = await Customer.create({
      fullname,
      phoneNumber,
      address,        // Added missing field
      department,     // Added missing field
      isActive: isActive ?? true,
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer  // Return the full customer object
    });
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error(error);
    
    // Handle specific errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false,
        message: "Phone number already exists",
        error: error.errors.map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error creating customer", 
      error: error.message 
    });
  }
};

/* ===========================
   Get Active Customers
=========================== */
export const getActiveCustomers = async (req, res) => {
  try {
    const activeCustomers = await Customer.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      customers: activeCustomers,
      total: activeCustomers.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching active customers",
      error: error.message,
    });
  }
};

/* ===========================
   Get Customers (Paginated)
=========================== */
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Customer.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    res.json({
      customers: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

/* ===========================
   Get Customer by ID
=========================== */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching customer", error });
  }
};

/* ===========================
   Update Customer (PUT - Full Update)
=========================== */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, phoneNumber, address, department, isActive } = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Update all fields
    await customer.update({
      fullname,
      phoneNumber,
      address,        // Added missing field
      department,     // Added missing field
      isActive,
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating customer", error });
  }
};

/* ===========================
   Partial Update (PATCH)
=========================== */
export const updateCustomerProperties = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // This will update only the fields provided in the request body
    // including address and department if they are included
    await customer.update(updateData);

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating customer", error });
  }
};

/* ===========================
   Delete Customer
=========================== */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.destroy();
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting customer", error });
  }
};

/* ===========================
   Search Customers
=========================== */
export const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "Search term is required" });
    }

    const search = q.trim();

    const customers = await Customer.findAll({
      where: {
        [Op.or]: [
          { fullname: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },        // Added search by address
          { department: { [Op.like]: `%${search}%` } },     // Added search by department
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!customers.length) {
      return res.status(404).json({ message: "No results found" });
    }

    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error searching customers", error });
  }
};

/* ===========================
   Get Customers by Department
=========================== */
export const getCustomersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const customers = await Customer.findAll({
      where: { department },
      order: [["fullname", "ASC"]],
    });

    res.json({
      customers,
      total: customers.length,
      department
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Error fetching customers by department", 
      error: error.message 
    });
  }
};

/* ===========================
   Update Customer Address
=========================== */
export const updateCustomerAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update({ address });

    res.json({
      success: true,
      message: "Address updated successfully",
      customer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Error updating address", 
      error: error.message 
    });
  }
};

/* ===========================
   Update Customer Department
=========================== */
export const updateCustomerDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update({ department });

    res.json({
      success: true,
      message: "Department updated successfully",
      customer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "Error updating department", 
      error: error.message 
    });
  }
};