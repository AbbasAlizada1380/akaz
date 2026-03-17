import express from "express";
import cors from "cors";
import userrouter from "./Routes/userRout.js";
import sequelize from "./dbconnection.js";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import DepartmentRoute from "./Routes/DepartmentRoute.js";
import CustomerRoute from "./Routes/Customer/CustomersRoute.js";
import ExpenseRoute from "./Routes/ExpenseRoute.js";
import SellerRoute from "./Routes/Seller/SellerRoute.js";
import StockIncomeRoute from "./Routes/Stock/StockIcomeRoute.js";
import SellsRoute from "./Routes/Stock/SellsRoute.js";
import StockExistRoute from "./Routes/Stock/StockExistRoute.js";
import PayRoute from "./Routes/Finance/PayRoute.js";
import ReceiveRoute from "./Routes/Finance/ReceiveRoute.js";
import CustomerAccountRoute from "./Routes/Customer/CustomerAccountRoute.js";
import SellerAccountRoute from "./Routes/Seller/SellerAccountRoute.js";
const FRONT_URL = process.env.FRONT_URL
const port = 8038;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Configure CORS properly
const allowedOrigins = [
  `${FRONT_URL}`, // React local dev
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Access denied from this origin."));
      }
    },
    credentials: true, // allow cookies and auth headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global error handler for CORS
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ message: err.message });
  }
  next(err);
});

app.use(express.json());

// Middleware to serve static files (images)
const uploadsDirectory = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDirectory));

// Routes
app.use("/users", userrouter);
app.use("/department", DepartmentRoute);
app.use("/seller", SellerRoute);
app.use("/customer", CustomerRoute);
app.use("/expense", ExpenseRoute);
app.use("/stockIncome", StockIncomeRoute);
app.use("/sells", SellsRoute);
app.use("/stockExist", StockExistRoute);
app.use("/pay", PayRoute);
app.use("/receive", ReceiveRoute);
app.use("/customerAccount", CustomerAccountRoute);
app.use("/sellerAccount", SellerAccountRoute);
// Sync database and start server
sequelize
  .sync({ alter: true })
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("❌ Unable to connect to the database:", error);
  });
