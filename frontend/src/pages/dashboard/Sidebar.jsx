// Sidebar.js (Corrected Role Handling)

import React, { useState } from "react";
import { FaBuilding, FaSignOutAlt } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { signOutSuccess } from "../../state/userSlice/userSlice";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { MdOutlineDashboardCustomize } from "react-icons/md";
import { LucideUserRoundPlus } from "lucide-react";
import { FaList } from "react-icons/fa";
import { MdAddShoppingCart } from "react-icons/md";

const Sidebar = ({ setActiveComponent }) => {
  const [selectedC, setSelectedC] = useState("home");
  const [activeC, setActiveC] = useState("home");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const MySwal = withReactContent(Swal);

  const handleSignOut = () => {
    MySwal.fire({
      title: "آیا مطمئن هستید؟",
      text: "شما از سیستم خارج خواهید شد!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "بله، خارج شو!",
      cancelButtonText: "لغو",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(signOutSuccess());
        navigate("/sign-in");
      }
    });
  };
  const AllComponents = [
    { name: "Home Page", value: "home", icon: <MdOutlineDashboardCustomize /> },
    { name: "Departmentt", value: "department", icon: <MdAddShoppingCart /> },
    { name: "Members", value: "memberManager", icon: <FaList /> },
    {
      name: "User Management",
      value: "AddUser",
      icon: <LucideUserRoundPlus />,
    },
    { name: "sign out", value: "signout", icon: <FaSignOutAlt /> },
  ];

  let accessibleComponents = [];

  if (currentUser && currentUser.role) {
    const userRole = currentUser.role;

    if (userRole === "admin") {
      accessibleComponents = AllComponents;
    } else if (userRole === "reception") {
      const receptionAllowedValues = [
        "home",
        "Orders",
        "OrdersList",
        "signout",
      ];
      accessibleComponents = AllComponents.filter((component) =>
        receptionAllowedValues.includes(component.value)
      );
    } else {
      // Default fallback for other roles or no role
      accessibleComponents = AllComponents.filter(
        (component) => component.value === "signout"
      );
    }
  } else {
    // If no user is logged in, show only basic components
    accessibleComponents = AllComponents.filter(
      (component) =>
        component.value === "Orders" || component.value === "signout"
    );
  }

  return (
    <div
      className={`h-full transition-all duration-300 ease-in-out w-64 bg-orange-200 overflow-y-hidden `}
    >
      <header className="flex items-center gap-5 p-5 text-white font-bold text-xl">
        <div className="flex items-center justify-center p-1 bg-white rounded-full">
          <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-full " />
        </div>

        <span className="text-lg font-bold rounded-full text-gray-900 whitespace-nowrap">
      ZANJERA OMID
        </span>
      </header>

      <ul className=" mr-1 px-3">
        {accessibleComponents.map((component, index) => (
          <li key={index} className="relative group cursor-pointer">
            {component.value === "signout" ? (
              <a
                onClick={handleSignOut}
                className={`relative flex items-center w-full px-6 py-3 transition-all duration-300   
                ${
                  activeC === component.value
                    ? "bg-white text-gray-800"
                    : "hover:bg-red-500 hover:text-white text-gray-900"
                }`}
              >
                <span className="text-xl">{component.icon}</span>

                <span className="mr-4 text-lg font-semibold whitespace-nowrap">
                  {component.name}
                </span>
              </a>
            ) : (
              <a
                onClick={() => {
                  setActiveComponent(component.value);
                  setSelectedC(component.value);
                  setActiveC(component.value);
                }}
                onMouseEnter={() => setActiveC(component.value)}
                onMouseLeave={() => setActiveC(selectedC)}
                className={`relative flex items-center w-full px-6 py-3 transition-all duration-300  
                ${
                  activeC === component.value
                    ? "bg-white text-gray-800"
                    : "hover:bg-white hover:bg-opacity-20 text-gray-900"
                }`}
              >
                <span className="text-xl">{component.icon}</span>

                <span className="mr-4 text-lg font-semibold whitespace-nowrap">
                  {component.name}
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
