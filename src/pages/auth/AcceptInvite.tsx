import * as React from 'react';
import {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {useCognitoUserStore} from "../../store/cognitoUser";
import {UserType} from "../../store/types";

export function AcceptInvite() {
  const navigate = useNavigate();
  const user = useCognitoUserStore(state => state.user);
  const session = useCognitoUserStore(state => state.session);
  const useType = useCognitoUserStore(state => state.userType);

  useEffect(() => {
    if (user && session && useType) {
      if (useType === UserType.Admin) {
        navigate("/teams");
        return;
      }
      navigate("/dashboard");
    }

  }, [user, session])

  return <div>Accept Invite</div>;
}
