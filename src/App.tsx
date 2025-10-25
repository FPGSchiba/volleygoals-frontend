import React from 'react';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Login from "./pages/auth/Login";
import {AcceptInvite} from "./pages/auth/AcceptInvite";
import {PrivateRoute} from "./components/PrivateRoute";
import { Dashboard } from "./pages/Dashboard";
import {Teams} from "./pages/admin/Teams";
import {TeamSettings} from "./pages/admin/TeamSettings";
import {NoAccess} from "./pages/help/NoAccess";
import {NotFound} from "./pages/help/NotFound";
import {Header} from "./components/Header";
import {Notification} from "./components/Notification";
import {ResetPassword} from "./pages/auth/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Notification />
      <Routes>
        <Route path={"/login"} element={<Login />} />
        <Route path={"/accept-invite/:token"} element={<AcceptInvite />} />
        <Route path={"/reset-password"} element={<ResetPassword />} />
        <Route path={"/"} element={<PrivateRoute allowedRoles={["MEMBERS", "TRAINERS"]} />} > { /* ["ADMINS", "TRAINERS", "MEMBERS"] */ }
          <Route path="" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </ Route>
        <Route path={"/teams"} element={<PrivateRoute allowedRoles={["ADMINS"]} />} >
          <Route path={""} element={<Teams />} />
          <Route path={":teamId"} element={<TeamSettings />} />
        </Route>
        <Route path={"/no-access"} element={<NoAccess />} />
        <Route path={"/*"} element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
