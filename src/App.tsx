import React, {useEffect} from 'react';
import {BrowserRouter, Route, Routes, useLocation, useNavigate} from "react-router-dom";
import Login from "./pages/auth/Login";
import {AcceptInvite} from "./pages/auth/AcceptInvite";
import {PrivateRoute} from "./components/PrivateRoute";
import { Dashboard } from "./pages/Dashboard";
import {Teams} from "./pages/admin/Teams";
import {TeamDetails} from "./pages/admin/TeamDetails";
import {NoAccess} from "./pages/help/NoAccess";
import {NotFound} from "./pages/help/NotFound";
import {Navigation} from "./components/Navigation";
import {Notification} from "./components/Notification";
import {ResetPassword} from "./pages/auth/ResetPassword";
import {UserType} from "./store/types";
import { Box } from "@mui/material";
import {Profile} from "./pages/user/Profile";
import {UserDetails} from "./pages/admin/UserDetails";
import {Users} from "./pages/admin/Users";

const PathsWithoutHeader = [
  "login",
  "accept-invite",
  "reset-password",
];

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  // derive path from window.location (avoid useLocation outside Router) and watch history changes
  React.useEffect(() => {
    const getPathSegment = () => (window.location.pathname.split("/")[1] || '');
    const updateHidden = () => setHidden(PathsWithoutHeader.includes(getPathSegment()));

    updateHidden();

    const onPop = () => updateHidden();
    window.addEventListener('popstate', onPop);

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    (history as any).pushState = function (...args: any[]) { (origPush as any).apply(this, args); window.dispatchEvent(new Event('locationchange')); };
    (history as any).replaceState = function (...args: any[]) { (origReplace as any).apply(this, args); window.dispatchEvent(new Event('locationchange')); };

    const onLocationChange = () => updateHidden();
    window.addEventListener('locationchange', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('locationchange', onLocationChange);
      (history as any).pushState = origPush;
      (history as any).replaceState = origReplace;
    };
  }, []);

  return (
    <BrowserRouter>
      <Notification />
      {React.useMemo(() => null, [])}
      <Box sx={{ display: 'flex', minHeight: '100vh' }} className={"app app-container"}>
        <Navigation
          /* Navigation can accept these props to control width from App */
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          drawerWidth={collapsed ? 72 : 256}
          hidden={hidden}
        />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              transition: 'margin-left 200ms',
              marginLeft: `${hidden ? 0 : (collapsed ? 72 : 256) + 20}px` // For margin of the nav container
            }}
          >
            <Routes>
            <Route path={"/login"} element={<Login />} />
            <Route path={"/accept-invite"} element={<AcceptInvite />} />
            <Route path={"/reset-password"} element={<ResetPassword />} />
            <Route path={"/"} element={<PrivateRoute allowedRoles={[UserType.User]} />} >
              <Route path="" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </ Route>
            <Route path={"/teams"} element={<PrivateRoute allowedRoles={[UserType.Admin]} />} >
              <Route path={""} element={<Teams />} />
              <Route path={":teamId"} element={<TeamDetails />} />
            </Route>
            <Route path={"/users"} element={<PrivateRoute allowedRoles={[UserType.Admin]} />} >
              <Route path={""} element={<Users />} />
              <Route path={":userId"} element={<UserDetails />} />
            </Route>
            <Route path={"/profile"} element={<PrivateRoute allowedRoles={[UserType.User, UserType.Admin]} />} >
              <Route path={""} element={<Profile />} />
            </Route>
            <Route path={"/no-access"} element={<NoAccess />} />
            <Route path={"/*"} element={<NotFound />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
