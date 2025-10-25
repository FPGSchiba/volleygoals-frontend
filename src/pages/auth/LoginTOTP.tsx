import * as React from "react";
import {SignInOutput} from "aws-amplify/auth";

type LoginTOTPProps = {
  onSignInFinished: (output: SignInOutput) => void;
};

export function LoginTOTP(props: LoginTOTPProps) {
  return <div>Login TOTP</div>;
}
