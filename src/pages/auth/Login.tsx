import {Box, Link, Paper, Typography} from "@mui/material";
import * as React from 'react';
import {useEffect} from 'react';
import i18next from "i18next";
import {LoginEmailPassword} from "./LoginEmailPassword";
import {LoginTOTP} from "./LoginTOTP";
import {ConfirmSignInOutput, SignInOutput} from "aws-amplify/auth";
import {SetupTOTP} from "./SetupTOTP";
import {SetupNewPassword} from "./SetupNewPassword";
import {useCognitoUserStore} from "../../store/cognitoUser";
import {useNavigate} from "react-router-dom";
import {SetupInitialPassword} from "./SetupInitialPassword";
import {UserType} from "../../store/types";

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

  const setUser = useCognitoUserStore(state => state.setUser);
  const navigate = useNavigate();
  const userType = useCognitoUserStore(state => state.userType);
  const fetchSelf = useCognitoUserStore(state => state.fetchSelf);

  useEffect(() => { // in order to redirect on login if cognitoUser is already set and if cognitoUser gets set by login flow
    if (userType) {
      if (userType === UserType.Admin) {
        navigate("/teams");
      } else {
        navigate("/dashboard");
      }
    }
  }, [userType]);

  const handleStepChange = (output: ConfirmSignInOutput | SignInOutput) => {
    if (output.isSignedIn) {
      setUser(); // ignore this as we already listen to changes in cognitoUser store and use useEffect to redirect
      fetchSelf();
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
