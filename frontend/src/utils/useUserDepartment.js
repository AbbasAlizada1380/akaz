import { useSelector } from "react-redux";

export const useUserDepartments = () => {
  const { currentUser } = useSelector((state) => state.user);

  return currentUser?.departments || [];
};