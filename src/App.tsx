import React from 'react';
import {BrowserRouter, Route, Routes} from "react-router-dom";
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
import {CompleteInvite} from "./pages/auth/CompleteInvite";
import {InviteError} from "./pages/help/InviteError";
import {useCognitoUserStore} from './store/cognitoUser';
import {SelectTeam} from "./pages/help/SelectTeam";

const PathsWithoutHeader = [
  "login",
  "accept-invite",
  "complete-invite",
  "invite-error",
  "reset-password",
  "select-team"
];

// Whitelist of top-level segments where the main navigation should be visible
const HeaderVisibleSegments = [
  '', // root/dashboard
  'dashboard',
  'teams',
  'users',
  'profile',
  'no-access'
];

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  // derive path from window.location (avoid useLocation outside Router) and watch history changes
  React.useEffect(() => {
    const getPathSegment = () => (window.location.pathname.split("/")[1] || '');

    const shouldHide = () => {
      const segment = getPathSegment();
      const { user, session } = useCognitoUserStore.getState();
      const noAuth = !user && !session;

      // If cognitoUser is not authenticated, hide navigation
      if (noAuth) return true;

      // If the segment is explicitly in the without-header list, hide it
      if (PathsWithoutHeader.includes(segment)) return true;

      // Only show navigation when the segment is one of the known app segments
      const showForSegment = HeaderVisibleSegments.includes(segment);
      return !showForSegment;
    }

    const updateHidden = () => setHidden(shouldHide());

    updateHidden();

    const onPop = () => updateHidden();
    window.addEventListener('popstate', onPop);

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    (history as any).pushState = function (...args: any[]) { (origPush as any).apply(this, args); window.dispatchEvent(new Event('locationchange')); };
    (history as any).replaceState = function (...args: any[]) { (origReplace as any).apply(this, args); window.dispatchEvent(new Event('locationchange')); };

    const onLocationChange = () => updateHidden();
    window.addEventListener('locationchange', onLocationChange);

    // subscribe to auth store so that when cognitoUser/session changes we re-evaluate visibility
    const unsub = useCognitoUserStore.subscribe(() => updateHidden());

    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('locationchange', onLocationChange);
      (history as any).pushState = origPush;
      (history as any).replaceState = origReplace;
      unsub();
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
            <Route path={"/complete-invite"} element={<CompleteInvite />} />
            <Route path={"/reset-password"} element={<ResetPassword />} />
            <Route path={"/"} element={<PrivateRoute userTypes={[UserType.User]} />} >
              <Route path="" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path={"/select-team"} element={<SelectTeam />} />
            </ Route>
            <Route path={"/teams"} element={<PrivateRoute userTypes={[UserType.Admin]} />} >
              <Route path={""} element={<Teams />} />
              <Route path={":teamId"} element={<TeamDetails />} />
            </Route>
            <Route path={"/users"} element={<PrivateRoute userTypes={[UserType.Admin]} />} >
              <Route path={""} element={<Users />} />
              <Route path={":userId"} element={<UserDetails />} />
            </Route>
            <Route path={"/profile"} element={<PrivateRoute userTypes={[UserType.User, UserType.Admin]} />} >
              <Route path={""} element={<Profile />} />
            </Route>
            <Route path={"/invite-error"} element={<InviteError />} />
            <Route path={"/no-access"} element={<NoAccess />} />
            <Route path={"/*"} element={<NotFound />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
