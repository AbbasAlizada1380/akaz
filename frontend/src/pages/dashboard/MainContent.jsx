// import Customer from "./pages/ServiceManger";
import Dashboard from "./pages/dashboard";
// import S_Transaction from "./pages/RentManager";
import Report from "./pages/reports";
import Orders from "./pages/Orders";
import OrdersList from "./pages/OrdersList";
import AddUser from "./pages/AddUser";
const MainContent = ({ activeComponent }) => {
  const renderContent = () => {
    switch (activeComponent) {
      case "dashboard":
        return <Dashboard />;
      case "ActiveAthletes":
        return <ActiveAthletes />;
      case "BlockManager":
        return <BlockManager />;
      case "user managements":
        return <UserManagement />;
      case "report":
        return <Report />;
      case "Salaries":
        return <Salaries />;
      case "setting":
        return <Setting />;
      case "ServiceManager":
        return <ServiceManager />;
      case "Fees":
        return <Fees />;
      case "Orders":
        return <Orders />;
      case "OrdersList":
        return <OrdersList />;
      case "AddUser":
        return <AddUser />;

      default:
        return <Dashboard />;
    }
  };

  return <div className="min-h-[90vh]">{renderContent()}</div>;
};

export default MainContent;
