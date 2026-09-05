import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const Protected = ({ children }) => {
  const { loading, user } = useAuth();

  console.log("PROTECTED:", {
    loading,
    user,
  });

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (!user) {
    console.log("PROTECTED → Redirecting to login");
    return <Navigate to="/login" />;
  }

  return children;
};

export default Protected;