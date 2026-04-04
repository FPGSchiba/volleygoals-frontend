import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import {
  UserType, IGoal, IProgressReport,
} from '../store/types';
import { Permission } from '../utils/permissions';
import { useCognitoUserStore } from '../store/cognitoUser';
import {
  Box, IconButton, Typography, Avatar, Tooltip, useTheme, useMediaQuery,
  BottomNavigation, BottomNavigationAction, Paper, InputBase, Popper, ClickAwayListener,
  Chip,
} from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useThemeToggle } from '../index';
import { useTranslation } from 'react-i18next';
import { useGoalStore } from '../store/goals';
import { useProgressReportStore } from '../store/progressReports';

type NavItem = {
  key: string;
  labelKey: string;
  labelDefault?: string;
  path: string;
  icon?: React.ReactNode;
  userType: UserType;
  readPermission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  // Admin View
  { key: 'teams',        labelKey: 'nav.teams',        path: '/teams',         icon: <GroupIcon />,              userType: UserType.Admin },
  { key: 'users',        labelKey: 'nav.users',        path: '/users',         icon: <PersonIcon />,             userType: UserType.Admin },
  { key: 'tenants',      labelKey: 'nav.tenants',      path: '/tenants',       icon: <BusinessIcon />,           userType: UserType.Admin },
  // Users Only
  { key: 'dashboard',    labelKey: 'nav.dashboard',    path: '/dashboard',     icon: <DashboardIcon />,          userType: UserType.User },
  { key: 'seasons',      labelKey: 'nav.seasons',      path: '/seasons',       icon: <DateRangeIcon />,          userType: UserType.User, readPermission: 'seasons:read' },
  { key: 'goals',        labelKey: 'nav.goals',        path: '/goals',         icon: <TrackChangesIcon />,       userType: UserType.User, readPermission: 'goals:read' },
  { key: 'progress',     labelKey: 'nav.progress',     path: '/progress',      icon: <PublishedWithChangesIcon />, userType: UserType.User, readPermission: 'progress_reports:read' },
  { key: 'members',      labelKey: 'nav.members',      path: '/members',       icon: <GroupIcon />,              userType: UserType.User, readPermission: 'members:read' },
  { key: 'teamSettings', labelKey: 'nav.teamSettings', path: '/team-settings', icon: <SettingsIcon />,           userType: UserType.User, readPermission: 'team_settings:read' },
  { key: 'invites',      labelKey: 'nav.invites',      path: '/invites',       icon: <EmailIcon />,              userType: UserType.User, readPermission: 'invites:read' },
];

// Mobile bottom nav items (subset of main nav for users)
const BOTTOM_NAV_KEYS = ['dashboard', 'goals', 'progress', 'teamSettings', 'invites'];

type NavigationProps = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  drawerWidth: number;
  hidden: boolean;
}

// Global search result type
type SearchResult = {
  type: 'goal' | 'report';
  id: string;
  label: string;
  sub: string;
  path: string;
};

function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goals = useGoalStore((s) => s.goalList.goals) || [];
  const reports = useProgressReportStore((s) => s.reportList.reports) || [];

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const runSearch = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const lower = q.toLowerCase();

    const goalResults: SearchResult[] = goals
      .filter(g => g.title.toLowerCase().includes(lower))
      .slice(0, 4)
      .map(g => ({
        type: 'goal',
        id: g.id,
        label: g.title,
        sub: g.status,
        path: `/goals/${g.id}`,
      }));

    const reportResults: SearchResult[] = reports
      .filter(r => r.summary?.toLowerCase().includes(lower))
      .slice(0, 4)
      .map(r => ({
        type: 'report',
        id: r.id,
        label: r.summary || '',
        sub: new Date(r.createdAt).toLocaleDateString(),
        path: `/progress/${r.id}`,
      }));

    const combined = [...goalResults, ...reportResults];
    setResults(combined);
    setOpen(combined.length > 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(result.path);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', flex: 1, maxWidth: 260 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1,
            height: 34,
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5, flexShrink: 0 }} />
          <InputBase
            value={query}
            onChange={handleChange}
            placeholder={t('nav.search', 'Search...')}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            sx={{ fontSize: 13, flex: 1 }}
            inputProps={{ 'aria-label': t('nav.search', 'Search') }}
          />
          {query && (
            <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth || 260 }}
        >
          <Paper elevation={4} sx={{ borderRadius: 2, mt: 0.5, overflow: 'hidden' }}>
            {results.map(r => (
              <Box
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Chip
                  label={r.type === 'goal' ? t('nav.searchGoal', 'Goal') : t('nav.searchReport', 'Report')}
                  size="small"
                  color={r.type === 'goal' ? 'info' : 'default'}
                  sx={{ borderRadius: 1, fontSize: 10, height: 18, flexShrink: 0 }}
                />
                <Box minWidth={0}>
                  <Typography variant="body2" noWrap>
                    {r.label.length > 32 ? r.label.slice(0, 30) + '…' : r.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {r.sub}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

export function Navigation(props: NavigationProps) {
  const { collapsed, setCollapsed, drawerWidth, hidden } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const userType = useCognitoUserStore(state => state.userType);
  const cognitoUser = useCognitoUserStore(state => state.cognitoUser);
  const user = useCognitoUserStore(state => state.user);
  const teamAssignments = useCognitoUserStore(state => state.availableTeams);
  const selectedTeam = useCognitoUserStore(state => state.selectedTeam);
  const selectTeam = useCognitoUserStore(state => state.setSelectedTeam);
  const fetchSelf = useCognitoUserStore(state => state.fetchSelf);
  const logout = useCognitoUserStore(state => state.logout);
  const { toggleTheme, mode: themeMode } = useThemeToggle();

  const [visibleItems, setVisibleItems] = React.useState<NavItem[]>([]);
  const [teamMenuAnchor, setTeamMenuAnchor] = React.useState<HTMLElement | null>(null);
  const openTeamMenu = Boolean(teamMenuAnchor);
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState<HTMLElement | null>(null);
  const openProfileMenu = Boolean(profileMenuAnchor);

  const getDisplayName = () => {
    if (user) {
      if (user.name) return user.name;
      if (user.preferredUsername) return user.preferredUsername;
      if (user.email) return user.email;
    }
    const attrs: any = (cognitoUser && (((cognitoUser as any).attributes) || cognitoUser));
    if (attrs) {
      if (attrs.name) return attrs.name;
      if (attrs.given_name || attrs.family_name) return `${attrs.given_name || ''} ${attrs.family_name || ''}`.trim();
      if (attrs.email) return attrs.email;
    }
    if (cognitoUser && ((cognitoUser as any).username)) return (cognitoUser as any).username;
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
    const currentPermissions = useCognitoUserStore.getState().currentPermissions;
    const items = NAV_ITEMS.filter(item => {
      if (item.userType !== userType) return false;
      if (!item.readPermission) return true;
      return currentPermissions.includes(item.readPermission);
    });
    setVisibleItems(items);
  }, [userType, selectedTeam]);

  React.useEffect(() => {
    if (userType === UserType.User) {
      if (teamAssignments.length === 0) {
        fetchSelf().catch(() => {});
      }
      if (!selectedTeam && teamAssignments.length > 0) {
        navigate('/select-team');
      }
    }
  }, [userType, teamAssignments, selectedTeam, fetchSelf, selectTeam]);

  const bottomNavItems = visibleItems.filter(i => BOTTOM_NAV_KEYS.includes(i.key));
  const currentBottomValue = bottomNavItems.findIndex(
    i => location.pathname === i.path || location.pathname.startsWith(i.path + '/')
  );

  if (hidden) return null;

  // ── Mobile Layout: top bar + bottom nav ──
  if (isMobile) {
    return (
      <>
        {/* Top App Bar */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            height: 52,
            gap: 1,
          }}
        >
          {/* Team Avatar */}
          {userType === UserType.User && (
            <>
              <IconButton size="small" onClick={(e) => setTeamMenuAnchor(e.currentTarget)}>
                <Avatar
                  alt={selectedTeam?.team.name ?? 'Team'}
                  src={selectedTeam?.team?.picture}
                  sx={{ width: 30, height: 30, fontSize: 13 }}
                >
                  {!selectedTeam?.team?.picture && ((selectedTeam?.team?.name && selectedTeam.team.name[0]) || 'T')}
                </Avatar>
              </IconButton>
              <Menu anchorEl={teamMenuAnchor} open={openTeamMenu} onClose={() => setTeamMenuAnchor(null)}>
                {teamAssignments.length === 0 ? (
                  <MenuItem disabled>{t('nav.noTeams', 'No teams')}</MenuItem>
                ) : (
                  teamAssignments.map((ta) => (
                    <MenuItem key={ta.team.id} onClick={() => { selectTeam(ta.team.id); setTeamMenuAnchor(null); }}>{ta.team.name}</MenuItem>
                  ))
                )}
              </Menu>
            </>
          )}

          {/* Global Search */}
          <GlobalSearch />

          {/* Theme toggle */}
          <IconButton size="small" onClick={toggleTheme}>
            {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          {/* Profile Avatar */}
          <IconButton size="small" onClick={(e) => setProfileMenuAnchor(e.currentTarget)}>
            <Avatar alt={displayName ?? t('nav.profileAlt', 'Profile')} src={user?.picture} sx={{ width: 30, height: 30, fontSize: 13 }}>
              {!user?.picture && (initials ?? <PersonIcon fontSize="small" />)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={profileMenuAnchor} open={openProfileMenu} onClose={() => setProfileMenuAnchor(null)}>
            <MenuItem onClick={() => { setProfileMenuAnchor(null); navigate('/profile'); }}>{t('nav.profile', 'Profile')}</MenuItem>
            <MenuItem onClick={() => { setProfileMenuAnchor(null); logout(); navigate('/login'); }}>{t('nav.logout', 'Logout')}</MenuItem>
          </Menu>
        </Box>

        {/* Bottom Navigation Bar */}
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
          elevation={3}
        >
          <BottomNavigation
            value={currentBottomValue}
            onChange={(_, newVal) => {
              if (bottomNavItems[newVal]) navigate(bottomNavItems[newVal].path);
            }}
            showLabels={false}
            sx={{ bgcolor: 'background.paper', '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5 } }}
          >
            {bottomNavItems.map((item, idx) => (
              <BottomNavigationAction
                key={item.key}
                icon={item.icon}
                sx={{
                  minWidth: 0,
                  color: currentBottomValue === idx ? 'primary.main' : 'text.secondary',
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      </>
    );
  }

  // ── Desktop Layout: sidebar drawer ──
  return (
    <Drawer
      variant="permanent"
      slotProps={{
        paper: {
          className: 'nav nav-sidebar nav-sidebar-root',
          sx: { width: drawerWidth },
        },
      }}
      className="nav nav-sidebar nav-sidebar-container"
    >
      <Box className="nav nav-top">
        {(userType === UserType.User || !collapsed) && (
          <Box className="nav-top-left">
            {userType === UserType.User && !collapsed && (
              <>
                <IconButton aria-label="Select team" onClick={(e) => setTeamMenuAnchor(e.currentTarget)} size="small" className="nav-team-button">
                  <Avatar
                    alt={selectedTeam?.team.name ?? 'Team'}
                    src={selectedTeam?.team?.picture}
                    className="nav-team-avatar"
                  >
                    {!selectedTeam?.team?.picture && ((selectedTeam?.team?.name && selectedTeam.team.name[0]) || 'T')}
                  </Avatar>
                </IconButton>
                <Menu anchorEl={teamMenuAnchor} open={openTeamMenu} onClose={() => setTeamMenuAnchor(null)}>
                  {teamAssignments.length === 0 ? (
                    <MenuItem disabled>{t('nav.noTeams', 'No teams')}</MenuItem>
                  ) : (
                    teamAssignments.map((ta) => (
                      <MenuItem key={ta.team.id} onClick={() => { selectTeam(ta.team.id); setTeamMenuAnchor(null); }}>{ta.team.name}</MenuItem>
                    ))
                  )}
                </Menu>
              </>
            )}

            {!collapsed && (
              <Tooltip title={themeMode === 'dark' ? t('nav.switchToLight', 'Switch to light theme') : t('nav.switchToDark', 'Switch to dark theme')}>
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

        <>
          <IconButton
            aria-label={displayName ? t('nav.openProfile', { defaultValue: `Open profile for ${displayName}`, name: displayName }) : t('nav.openProfileFallback', 'Open profile')}
            onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
            size="small"
            className="nav-profile-button"
          >
            <Avatar alt={displayName ?? t('nav.profileAlt', 'Profile')} src={user?.picture} className="nav-profile-avatar">
              {!user?.picture && (initials ?? <PersonIcon />)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={profileMenuAnchor} open={openProfileMenu} onClose={() => setProfileMenuAnchor(null)}>
            <MenuItem onClick={() => { setProfileMenuAnchor(null); navigate('/profile'); }}>{t('nav.profile', 'Profile')}</MenuItem>
            <MenuItem onClick={() => { setProfileMenuAnchor(null); logout(); navigate('/login'); }}>{t('nav.logout', 'Logout')}</MenuItem>
          </Menu>
        </>
      </Box>

      {/* Global Search in sidebar (only when expanded) */}
      {!collapsed && userType === UserType.User && (
        <Box px={1.5} pb={1}>
          <GlobalSearch />
        </Box>
      )}

      <Box className="nav nav-heading nav-heading-wrapper">
        <Box className="nav-heading-left">
          <Typography variant="h5" className="nav nav-heading nav-heading-title">
            {!collapsed && t('nav.title', 'Navigation')}
          </Typography>
        </Box>
        <IconButton
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed(!collapsed)}
          className="nav nav-heading nav-heading-button"
        >
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
                <ListItemText className="nav nav-sidebar nav-sidebar-item-text" primary={t(item.labelKey, item.labelKey)} />
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}
