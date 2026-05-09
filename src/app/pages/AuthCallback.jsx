import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/", { replace: true }); }, []);
  return null;
};

export default AuthCallback;
