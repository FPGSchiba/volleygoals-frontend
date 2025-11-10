import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Navigate, Outlet } from 'react-router-dom';
import {UserType} from "../store/types";

type PrivateRouteProps = {
  allowedRoles?: UserType[];
};

export function PrivateRoute({ allowedRoles = [] }: PrivateRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        const session = await fetchAuthSession();
        // groups are typically on the id token under 'cognito:groups'
        // @ts-ignore
        const idToken = session?.tokens.idToken;
        const payload = idToken?.payload as Record<string, any> | undefined;
        const groups = payload?.['cognito:groups'] ?? [];
        const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);

        const allowed = allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role.toString()));
        if (mounted) {
          setIsAuthenticated(true);
          setIsAllowed(allowed);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
          setIsAllowed(false);
          setLoading(false);
        }
      }
    }

    checkUser();
    return () => {
      mounted = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAllowed) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/no-access" replace state={{ requiredRoles: allowedRoles }} />;
  }

  return <Outlet />;
}

export default PrivateRoute;
