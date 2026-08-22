import React from 'react'
import { useAuth } from '../context/AuthContext';
import { Navigate } from "react-router-dom";

const Protected = ({children}) => {
  const {Loading, user} = useAuth();
  if(Loading){
    return (
        <h1>Loading...</h1>
    )
  }
  if(!user){
    return <Navigate to={"/login"} />
  }
  return children;
}

export default Protected