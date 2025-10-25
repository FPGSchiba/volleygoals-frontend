import { Box, Paper, Typography, TextField, Button, Link } from "@mui/material";
import * as React from 'react';
import i18next from "i18next";
import {LoginEmailPassword} from "./LoginEmailPassword";
import {LoginTOTP} from "./LoginTOTP";
import {SignInOutput} from "aws-amplify/auth";

enum LoginSteps {
  EmailPassword,
  TwoFactorAuth,
  Success,
}

function Login() {
  const [currentStep, setCurrentStep] = React.useState<LoginSteps>(LoginSteps.EmailPassword);

  const handleEmailPasswordFinished = (output: SignInOutput) => {
    console.log(output);
  }

  const handleTOTPFinished = (output: SignInOutput) => {
    console.log(output);
  }

  // Translations
  const headingT = i18next.t("login.heading", "Sign in");
  const subheadingT = i18next.t("login.subheading", "Welcome to Volley Goals");

  return (
    <Paper className={"login login-paper"}>
      <Box className={"login login-header login-header-wrapper"}>
        <Typography className={"login login-header login-header-heading"} variant={"h2"}>
          {headingT}
        </Typography>
        <Typography className={"login login-header login-header-subheading"} variant={"h4"}>
          {subheadingT}
        </Typography>
      </Box>

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
                onSignInFinished={handleEmailPasswordFinished}
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
          default:
            return null;
        }
      })()}
    </Paper>
  );
}

export default Login;
