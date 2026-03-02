// import Customer from "./pages/ServiceManger";
import Dashboard from "./pages/dashboard";
// import S_Transaction from "./pages/RentManager";
import Report from "./pages/reports";
import Orders from "./pages/DepartmentManager";
import OrdersList from "./pages/MemberManager";
import AddUser from "./pages/AddUser";
import DepartmentManager from "./pages/DepartmentManager";
import MemberManager from "./pages/MemberManager";
import MemberManagement from "./pages/MemberManager";
import ExpenseManager from "./pages/expense/ExpenseManages";
import Stock  from "./pages/Stock";
import BusinessManagement from "./pages/BusinessManagement.jsx";
const MainContent = ({ activeComponent }) => {
  const renderContent = () => {
    switch (activeComponent) {
      case "dashboard":
        return <Dashboard />;
      case "stakeHolders":
        return <BusinessManagement />;
      case "BlockManager":
        return <BlockManager />;
      case "user managements":
        return <UserManagement />;
      case "expense":
        return <ExpenseManager />;
      case "stock":
        return <Stock />;
      case "setting":
        return <Setting />;
      case "ServiceManager":
        return <ServiceManager />;
      case "Fees":
        return <Fees />;
      case "department":
        return <DepartmentManager />;
      case "memberManager":
        return <MemberManagement />;
      case "AddUser":
        return <AddUser />;

      default:
        return <Dashboard />;
    }
  };

  return <div className="min-h-[90vh]">{renderContent()}</div>;
};

export default MainContent;
