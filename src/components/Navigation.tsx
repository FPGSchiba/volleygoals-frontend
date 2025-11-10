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
import {UserType} from "../store/types";
import {useUserStore} from "../store/user";
import { Box, IconButton, Typography } from "@mui/material";
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  roles: UserType[];
};

const NAV_ITEMS: NavItem[] = [
  // Admin View
  { key: 'teams', label: 'Teams', path: '/teams', icon: <GroupIcon />, roles: [UserType.Admin] },
  // Trainer Only
  { key: 'seasons', label: 'Seasons', path: '/seasons', icon: <DateRangeIcon />, roles: [UserType.User] },
  // Members and Trainers
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: [UserType.User] },
  // All Users
  { key: 'profile', label: 'Profile', path: '/profile', icon: <PersonIcon />, roles: [UserType.User, UserType.Admin] },
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
  const userType = useUserStore(state => state.userType);
  const [visibleItems, setVisibleItems] = React.useState<NavItem[]>([]);

  useEffect(() => {
    const items = NAV_ITEMS.filter(item => item.roles.includes(userType!));
    setVisibleItems(items);
  }, [userType]);

  return (
    <>
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
          <Box className={"nav nav-heading nav-heading-wrapper"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}>
            <Typography variant={"h5"} className={"nav nav-heading nav-heading-title"}>{!collapsed && 'Navigation'}</Typography>
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
