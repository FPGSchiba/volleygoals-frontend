import { Box, Button, Link, TextField, Typography } from "@mui/material";
import * as React from "react";
import { useForm, Controller } from 'react-hook-form';
import i18next from "i18next";
import { signIn, SignInOutput } from "aws-amplify/auth";
import {useNotificationStore} from "../../store/notification";

type FormValues = {
  email: string;
  password: string;
};

type LoginEmailPasswordProps = {
  onSignInFinished: (output: SignInOutput, username: string) => void;
}

export function LoginEmailPassword(props: LoginEmailPasswordProps) {
  const { onSignInFinished } = props;
  const notify = useNotificationStore(state => state.notify);
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const output = await signIn({
        username: data.email,
        password: data.password,
      });
      onSignInFinished(output, data.email);
    } catch (error: any) {
      console.error(error);

      const code = error?.name || error?.code || '';
      let message = error?.message ?? String(error);
      let title = i18next.t("error.login.emailPassword.failed.title", "Sign in failed.");

      if (code === "UserNotConfirmedException") {
        title = i18next.t("error.login.emailPassword.userNotConfirmed.title", "Account not confirmed");
        message = i18next.t("error.login.emailPassword.userNotConfirmed.message", "Your account is not confirmed. Check your email for a confirmation link.");
      } else if (code === "UserNotFoundException") {
        title = i18next.t("error.login.emailPassword.userNotFound.title", "Account not found");
        message = i18next.t("error.login.emailPassword.userNotFound.message", "No account found for that email.");
      } else if (code === "NotAuthorizedException") {
        title = i18next.t("error.login.emailPassword.invalidCredentials.title", "Invalid credentials");
        message = i18next.t("error.login.emailPassword.invalidCredentials.message", "Incorrect email or password.");
      } else if (code === "PasswordResetRequiredException") {
        title = i18next.t("error.login.emailPassword.passwordResetRequired.title", "Password reset required");
        message = i18next.t("error.login.emailPassword.passwordResetRequired.message", "A password reset is required. Please reset your password.");
      } else if (code === "TooManyRequestsException" || code === "LimitExceededException") {
        title = i18next.t("error.login.emailPassword.tooManyRequests.title", "Too many attempts");
        message = i18next.t("error.login.emailPassword.tooManyRequests.message", "Too many attempts. Try again later.");
      } else if (typeof error === "string") {
        title = i18next.t("error.login.emailPassword.failed.title", "Sign in failed.");
        message = error;
      }

      notify({
        level: 'error',
        message,
        title,
      });
    }
  };

  // Translations
  const headingT = i18next.t("login.emailPassword.heading", "Sign in");
  const subheadingT = i18next.t("login.emailPassword.subheading", "Welcome to Volley Goals");
  const emailLabelT = i18next.t("login.emailPassword.email.label", "Email");
  const emailRequiredT = i18next.t("login.emailPassword.email.required", "Email is required");
  const emailInvalidT = i18next.t("login.emailPassword.email.invalid", "Enter a valid email");
  const passwordLabelT = i18next.t("login.emailPassword.password.label", "Password");
  const passwordRequiredT = i18next.t("login.emailPassword.password.required", "Password is required");
  const passwordMinLengthT = i18next.t("login.emailPassword.password.minLength", "Minimum 8 characters");
  const forgotPasswordT = i18next.t("login.emailPassword.forgotPassword", "Forgot your password?");
  const signInButtonT = i18next.t("login.emailPassword.submit", "Sign in");

  return (
    <>
      <Box className={"login login-header login-header-wrapper"}>
        <Typography className={"login login-header login-header-heading"} variant={"h2"}>
          {headingT}
        </Typography>
        <Typography className={"login login-header login-header-subheading"} variant={"h4"}>
          {subheadingT}
        </Typography>
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        className={"login login-form login-form-wrapper"}
      >
        <Controller
          name="email"
          control={control}
          rules={{
            required: emailRequiredT,
            pattern: { value: /^\S+@\S+\.\S+$/, message: emailInvalidT },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label={emailLabelT}
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              className={"login login-input login-input-email"}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{ required: passwordRequiredT, minLength: { value: 8, message: passwordMinLengthT } }}
          render={({ field }) => (
            <TextField
              {...field}
              label={passwordLabelT}
              type="password"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              className={"login login-input login-input-password"}
            />
          )}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          className={"login login-button login-button-submit"}
        >
          {signInButtonT}
        </Button>
        <Box className={"login login-divider"}>
          <Link href="/reset-password" className={"login login-link login-link-reset-password"}>
            {forgotPasswordT}
          </Link>
        </Box>
      </Box>
    </>
  )
}
