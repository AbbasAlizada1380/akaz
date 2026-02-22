import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OnlyAdminPrivateRoute from "./components/common/OnlyAdmin";
import ScrollTop from "./components/common/ScrollTop";
import Signin from "./features/authentication/components/Signin";
// import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/common/PrivateRoute";
import EmailEntry from "./pages/dashboard/reset_password/EmailEntery";
import ResetPassword from "./pages/dashboard/reset_password/ResetPassword";
// import HomePage from "./pages/home/HomePage";
export default function App() {
  return (
    <div>
      <BrowserRouter>
        <ScrollTop />
        <Routes>
          {/* public routes all users */}
          {/* <Route path="/" element={<HomePage />} /> */}
          <Route path="/forgot_password" element={<EmailEntry />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/" element={<Signin />} />
          <Route path="*" element={<Signin />} />
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<OnlyAdminPrivateRoute />}></Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
