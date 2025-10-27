import {Box, Link, Paper, Typography} from "@mui/material";
import * as React from 'react';
import i18next from "i18next";
import {LoginEmailPassword} from "./LoginEmailPassword";
import {LoginTOTP} from "./LoginTOTP";
import {ConfirmSignInOutput, SignInOutput} from "aws-amplify/auth";
import {SetupTOTP} from "./SetupTOTP";
import {SetupNewPassword} from "./SetupNewPassword";
import {useUserStore} from "../../store/user";
import {useNavigate} from "react-router-dom";
import {SetupInitialPassword} from "./SetupInitialPassword";
import {UserRole} from "../../store/types";
import {useEffect} from "react";

enum LoginSteps {
  EmailPassword,
  InitialPasswordSetup,
  PasswordSetup,
  TwoFactorAuth,
  TwoFactorSetup,
  Success,
}

function Login() {
  const [currentStep, setCurrentStep] = React.useState<LoginSteps>(LoginSteps.EmailPassword);
  const [totpSetupUrl, setTotpSetupUrl] = React.useState<URL | null>(null);
  const [username, setUsername] = React.useState<string>("");

  const setUser = useUserStore(state => state.setUser);
  const navigate = useNavigate();
  const roles = useUserStore(state => state.roles);

  useEffect(() => { // in order to redirect on login if user is already set and if user gets set by login flow
    if (roles.length > 0) {
      if (roles.includes(UserRole.Admin)) {
        navigate("/teams");
      } else {
        navigate("/dashboard");
      }
    }
  }, [roles]);

  const handleStepChange = (output: ConfirmSignInOutput | SignInOutput) => {
    if (output.isSignedIn) {
      setUser(); // ignore this as we already listen to changes in user store and use useEffect to redirect
    } else {
      switch (output.nextStep.signInStep) {
        case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
          setCurrentStep(LoginSteps.TwoFactorAuth);
          break;
        case "CONTINUE_SIGN_IN_WITH_TOTP_SETUP":
          setTotpSetupUrl(output.nextStep.totpSetupDetails.getSetupUri("Volley Goals"));
          setCurrentStep(LoginSteps.TwoFactorSetup);
          break;
        case "RESET_PASSWORD":
          setCurrentStep(LoginSteps.PasswordSetup);
          break;
        case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
          setCurrentStep(LoginSteps.InitialPasswordSetup);
          break;
        default:
          console.log(output.nextStep.signInStep);
          setCurrentStep(LoginSteps.EmailPassword);
          break;
      }
    }
  }

  const handleEmailPasswordFinished = (output: SignInOutput, username: string) => {
    setUsername(username);
    handleStepChange(output);
  }

  const handleResetPasswordFinished = () => {
    setCurrentStep(LoginSteps.EmailPassword);
  }

  return (
    <Paper className={"login login-paper"}>
      {(() => {
        switch (currentStep) {
          case LoginSteps.EmailPassword:
            return (
              <LoginEmailPassword
                onSignInFinished={handleEmailPasswordFinished}
              />
            );
          case LoginSteps.TwoFactorAuth:
            return (
              <LoginTOTP
                onSignInFinished={handleStepChange}
              />
            );
          case LoginSteps.Success:
            return (
              <Box className={"login login-success"}>
                <Typography variant="h6">
                  {i18next.t("login.success", "You are signed in")}
                </Typography>
                <Link href="/">{i18next.t("login.goHome", "Go to dashboard")}</Link>
              </Box>
            );
            case LoginSteps.TwoFactorSetup:
              return (
                <SetupTOTP onSetupFinished={handleStepChange} setupURL={totpSetupUrl} />
              )
          case LoginSteps.PasswordSetup:
            return (
              <SetupNewPassword username={username} onSuccess={handleResetPasswordFinished} />
            )
          case LoginSteps.InitialPasswordSetup:
            return (
              <SetupInitialPassword onSetupFinished={handleStepChange} />
            )
          default:
            return null;
        }
      })()}
    </Paper>
  );
}

export default Login;
