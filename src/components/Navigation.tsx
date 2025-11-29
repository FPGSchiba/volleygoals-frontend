import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import {RoleType, UserType} from "../store/types";
import {useCognitoUserStore} from "../store/cognitoUser";
import { Box, IconButton, Typography, Avatar, Tooltip } from "@mui/material";
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {useTeamStore} from "../store/teams";
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeToggle } from "../index";

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  userType: UserType;
  roles?: RoleType[]; // future use for role-based access
};

const NAV_ITEMS: NavItem[] = [
  // Admin View
  { key: 'teams', label: 'Teams', path: '/teams', icon: <GroupIcon />, userType: UserType.Admin },
  { key: 'users', label: 'Users', path: '/users', icon: <PersonIcon />, userType: UserType.Admin },
  // Trainer Only
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, userType: UserType.User },
  { key: 'seasons', label: 'Seasons', path: '/seasons', icon: <DateRangeIcon />, userType: UserType.User },
];

type NavigationProps = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  drawerWidth: number;
  hidden: boolean;
}

export function Navigation(props: NavigationProps) {
  const { collapsed, setCollapsed, drawerWidth, hidden } = props;
  const navigate = useNavigate();
  const userType = useCognitoUserStore(state => state.userType);
  const user = useCognitoUserStore(state => state.cognitoUser);
  const teamAssignments = useCognitoUserStore(state => state.availableTeams);
  const selectedTeam = useCognitoUserStore(state => state.selectedTeam);
  const selectTeam = useCognitoUserStore(state => state.setSelectedTeam);
  const fetchSelf = useCognitoUserStore(state => state.fetchSelf);

  const [visibleItems, setVisibleItems] = React.useState<NavItem[]>([]);
  const [teamMenuAnchor, setTeamMenuAnchor] = React.useState<HTMLElement | null>(null);
  const openTeamMenu = Boolean(teamMenuAnchor);
  // Profile menu anchor for avatar dropdown
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState<HTMLElement | null>(null);
  const openProfileMenu = Boolean(profileMenuAnchor);

  // logout action from store
  const logout = useCognitoUserStore(state => state.logout);

  const { toggleTheme, mode: themeMode } = useThemeToggle();

  // Derive a display name and initials for the avatar placeholder
  const getDisplayName = () => {
    // Common AWS Cognito / Amplify cognitoUser shape: cognitoUser.attributes.name, given_name, family_name
    const attrs: any = (user && (((user as any).attributes) || user));
    if (attrs) {
      if (attrs.name) return attrs.name;
      if (attrs.given_name || attrs.family_name) return `${attrs.given_name || ''} ${attrs.family_name || ''}`.trim();
      if (attrs.email) return attrs.email;
    }
    if (user && ((user as any).username)) return (user as any).username;
    return undefined;
  };

  const displayName = getDisplayName();
  const getInitials = (name?: string) => {
    if (!name) return undefined;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(displayName);

  useEffect(() => {
    const items = NAV_ITEMS.filter(item => item.userType === userType);
    setVisibleItems(items);
  }, [userType]);

  // Fetch teams for regular users and ensure a current team is selected
  React.useEffect(() => {
    if (userType === UserType.User) {
      if (teamAssignments.length === 0) {
        // best-effort fetch, ignore promise errors here
        fetchSelf().catch(() => {});
      }
      if (!selectedTeam && teamAssignments.length > 0) {
        navigate('/select-team');
      }
    }
  }, [userType, teamAssignments, selectedTeam, fetchSelf, selectTeam]);

  return (
    <>
      { !hidden ? (
        // Profile area moved above the Drawer/paper so it appears outside of the navigation paper
        // Leave an empty fragment here; avatars will be rendered inside the Drawer so they appear above the paper
        <React.Fragment />
      ) : null }

      { !hidden ? (
        <Drawer
          variant="permanent"
          slotProps={{
            paper: {
              className: 'nav nav-sidebar nav-sidebar-root',
              sx: {
                width: drawerWidth,
              }
            }
          }}
          className="nav nav-sidebar nav-sidebar-container"
        >
          <Box className="nav nav-top" >
            {/* Left cluster: render only when we have a team avatar OR the theme toggle is visible (not collapsed) */}
            {(userType === UserType.User || !collapsed) && (
              <Box className="nav-top-left">
                {/* Team Avatar: only show for regular users */}
                {(userType === UserType.User && !collapsed) && (
                  <>
                    <IconButton aria-label="Select team" onClick={(e) => setTeamMenuAnchor(e.currentTarget)} size="small" className="nav-team-button">
                      <Avatar alt={selectedTeam?.team.name ?? 'Team'} className="nav-team-avatar">{(selectedTeam?.team.name && selectedTeam?.team.name[0]) || 'T'}</Avatar>
                    </IconButton>
                    <Menu anchorEl={teamMenuAnchor} open={openTeamMenu} onClose={() => setTeamMenuAnchor(null)}>
                      {teamAssignments.length === 0 ? (
                        <MenuItem disabled>No teams</MenuItem>
                      ) : (
                        teamAssignments.map((t) => (
                          <MenuItem key={t.team.id} onClick={() => { selectTeam(t.team.id); setTeamMenuAnchor(null); }}>{t.team.name}</MenuItem>
                        ))
                      )}
                    </Menu>
                  </>
                )}

                {/* Theme toggle lives here so it aligns with the top cluster; hidden when collapsed */}
                {!collapsed && (
                  <Tooltip title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
                    <IconButton
                      className="nav-theme-toggle"
                      aria-label="Toggle theme"
                      onClick={toggleTheme}
                      size="small"
                    >
                      {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            {/* User Avatar: navigates to /profile (always visible) */}
            <>
              <IconButton
                aria-label={displayName ? `Open profile for ${displayName}` : 'Open profile'}
                onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                size="small"
                className="nav-profile-button"
              >
                <Avatar alt={displayName ?? 'Profile'} className="nav-profile-avatar">{initials ?? <PersonIcon />}</Avatar>
              </IconButton>

              <Menu
                anchorEl={profileMenuAnchor}
                open={openProfileMenu}
                onClose={() => setProfileMenuAnchor(null)}
              >
                <MenuItem onClick={() => { setProfileMenuAnchor(null); navigate('/profile'); }}>Profile</MenuItem>
                <MenuItem onClick={() => { setProfileMenuAnchor(null); logout(); navigate('/login'); }}>Logout</MenuItem>
              </Menu>
            </>
          </Box>

          <Box className={"nav nav-heading nav-heading-wrapper"}>
            <Box className="nav-heading-left">
              <Typography variant={"h5"} className={"nav nav-heading nav-heading-title"}>{!collapsed && 'Navigation'}</Typography>
            </Box>
            <IconButton aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)} className={"nav nav-heading nav-heading-button"}>
              {collapsed ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
            </IconButton>
          </Box>

          <List className="nav nav-sidebar nav-sidebar-list" style={{ paddingTop: 0 }}>
            {visibleItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const itemClass = `nav nav-sidebar nav-sidebar-item${isActive ? ' nav nav-sidebar nav-sidebar-item-active' : ''}`;
              return (
                <ListItemButton
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  selected={isActive}
                  className={itemClass}
                  style={{ paddingLeft: collapsed ? 12 : 16 }}
                >
                  {item.icon && (
                    <ListItemIcon className="nav nav-sidebar nav-sidebar-item-icon" style={{ minWidth: 0, justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                  )}
                  {!collapsed && (
                    <ListItemText className="nav nav-sidebar nav-sidebar-item-text" primary={item.label} />
                  )}
                </ListItemButton>
              );
            })}
          </List>

        </Drawer>
      ) : null }
    </>
  );
}
