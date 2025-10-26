import * as React from 'react';
import { Box, Button, TextField, Typography } from "@mui/material";
import { useForm, Controller } from 'react-hook-form';
import i18next from "i18next";
import { useNotificationStore } from "../../store/notification";
import {confirmSignIn, ConfirmSignInOutput} from "aws-amplify/auth";

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};

type SetupInitialPasswordProps = {
  onSetupFinished: (output: ConfirmSignInOutput) => void;
};

export function SetupInitialPassword({ onSetupFinished }: SetupInitialPasswordProps) {
  const notify = useNotificationStore(state => state.notify);
  const {
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const submit = async (data: FormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      return;
    }
    try {
      const output =  await confirmSignIn({
        challengeResponse: data.newPassword,
      });
      onSetupFinished(output);
    } catch (error) {
      console.error(error);
      const err = error as any;
      const name = err?.name || err?.code || 'Default';

      const titleKey = `error.login.setupInitialPassword.${name}.title`;
      const messageKey = `error.login.setupInitialPassword.${name}.message`;

      const titleDefaultMap: Record<string, string> = {
        NotAuthorizedException: i18next.t("error.login.setupInitialPassword.notAuthorized.title", "Password setup failed."),
        InvalidPasswordException: i18next.t("error.login.setupInitialPassword.invalidPassword.title", "Invalid password."),
        CodeMismatchException: i18next.t("error.login.setupInitialPassword.codeMismatch.title", "Invalid confirmation code."),
        ExpiredCodeException: i18next.t("error.login.setupInitialPassword.expiredCode.title", "Confirmation code expired."),
        UserNotFoundException: i18next.t("error.login.setupInitialPassword.userNotFound.title", "User not found."),
        Default: i18next.t("error.login.setupInitialPassword.title", "Password setup failed."),
      };

      const messageDefaultMap: Record<string, string> = {
        NotAuthorizedException: i18next.t("error.login.setupInitialPassword.notAuthorized.message", "Could not update the password. Please try again."),
        InvalidPasswordException: i18next.t("error.login.setupInitialPassword.invalidPassword.message", "Password does not meet the required complexity."),
        CodeMismatchException: i18next.t("error.login.setupInitialPassword.codeMismatch.message", "The confirmation code is incorrect."),
        ExpiredCodeException: i18next.t("error.login.setupInitialPassword.expiredCode.message", "The confirmation code has expired."),
        UserNotFoundException: i18next.t("error.login.setupInitialPassword.userNotFound.message", "User account not found."),
        Default: i18next.t("error.login.setupInitialPassword.message", "Could not update the password. Please try again."),
      };

      const title = i18next.exists(titleKey) ? i18next.t(titleKey) : (titleDefaultMap[name] ?? titleDefaultMap.Default);
      const message = i18next.exists(messageKey) ? i18next.t(messageKey) : (messageDefaultMap[name] ?? messageDefaultMap.Default);

      notify({
        level: 'error',
        title,
        message,
      });
    }
  };

  const headingT = i18next.t("login.setupInitialPassword.heading", "Set your password");
  const subheadingT = i18next.t("login.setupInitialPassword.subheading", "Choose a secure password");
  const newPasswordLabelT = i18next.t("login.setupInitialPassword.newPassword.label", "New password");
  const newPasswordRequiredT = i18next.t("login.setupInitialPassword.newPassword.required", "New password is required");
  const newPasswordMinLengthT = i18next.t("login.setupInitialPassword.newPassword.minLength", "Minimum 8 characters");
  const confirmPasswordLabelT = i18next.t("login.setupInitialPassword.confirmPassword.label", "Confirm new password");
  const confirmPasswordRequiredT = i18next.t("login.setupInitialPassword.confirmPassword.required", "Please confirm your new password");
  const confirmPasswordMismatchT = i18next.t("login.setupInitialPassword.confirmPassword.match", "Passwords do not match");
  const submitButtonT = i18next.t("login.setupInitialPassword.submit", "Set password");

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

      <Box component="form" onSubmit={handleSubmit(submit)} className={"login login-ipassword login-ipassword-form-wrapper"}>
        <Controller
          name="newPassword"
          control={control}
          rules={{ required: newPasswordRequiredT, minLength: { value: 8, message: newPasswordMinLengthT } }}
          render={({ field }) => (
            <TextField
              {...field}
              label={newPasswordLabelT}
              type="password"
              autoComplete="new-password"
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              className={"login login-ipassword login-ipassword-input-new-password"}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          rules={{
            required: confirmPasswordRequiredT,
            validate: (value) => value === getValues('newPassword') || confirmPasswordMismatchT,
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label={confirmPasswordLabelT}
              type="password"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              className={"login login-ipassword login-ipassword-input-confirm-password"}
            />
          )}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          className={"login login-ipassword login-ipassword-button-submit"}
        >
          {submitButtonT}
        </Button>
      </Box>
    </>
  );
}
