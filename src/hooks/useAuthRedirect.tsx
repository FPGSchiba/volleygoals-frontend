import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCognitoUserStore } from '../store/cognitoUser';
import { UserType } from '../store/types';

export function useAuthRedirect() {
  const navigate = useNavigate();

  // Select primitives individually to avoid returning a new object reference
  // (which can trigger infinite update loops when used with useSyncExternalStore).
  const user = useCognitoUserStore((state) => state.cognitoUser);
  const session = useCognitoUserStore((state) => state.session);
  const userType = useCognitoUserStore((state) => state.userType);

  useEffect(() => {
    if (!user || !session || !userType) return;
    if (userType === UserType.Admin) {
      navigate('/teams');
    } else {
      navigate('/dashboard');
    }
  }, [user, session, userType, navigate]);
}
