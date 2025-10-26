import * as React from "react";
import {confirmSignIn, ConfirmSignInOutput} from "aws-amplify/auth";
import {Box, Button, TextField, Typography} from "@mui/material";
import {Controller, useForm} from "react-hook-form";
import i18next from "i18next";
import {useNotificationStore} from "../../store/notification";

type LoginTOTPProps = {
  onSignInFinished: (output: ConfirmSignInOutput) => void;
};

export function LoginTOTP(props: LoginTOTPProps) {
  const { onSignInFinished } = props;
  const { control, handleSubmit, watch } = useForm<{ code: string }>({
    defaultValues: { code: "" },
  });

  const code = watch("code", "");
  const notify = useNotificationStore(state => state.notify);

  const onSubmit = async (data: { code: string }) => {
    try {
      const output =  await confirmSignIn({
        challengeResponse: data.code,
      });
      onSignInFinished(output);
    } catch (error: any) {
      const code = error?.code ?? error?.name;
      let messageKey = "error.login.totp.verificationFailed.message";
      let messageDefault = "TOTP verification failed, this means the code you entered is incorrect. Please try again.";
      let titleKey = "error.login.totp.verificationFailed.title";
      let titleDefault = "Verification failed.";

      if (code === "CodeMismatchException" || code === "NotAuthorizedException") {
        messageKey = "error.login.totp.codeMismatch.message";
        messageDefault = "The code you entered is incorrect. Please check it and try again.";
      } else if (code === "ExpiredCodeException") {
        messageKey = "error.login.totp.expired.message";
        messageDefault = "The code has expired. Request a new code and try again.";
      } else if (code === "LimitExceededException") {
        messageKey = "error.login.totp.limitExceeded.message";
        messageDefault = "Too many attempts. Please wait before trying again.";
      } else if (code) {
        messageKey = `error.login.totp.${code}.message`;
        messageDefault = error?.message ?? messageDefault;
      }

      notify({
        level: "error",
        message: i18next.t(messageKey, messageDefault),
        title: i18next.t(titleKey, titleDefault),
      });
    }
  };

  // Translations
  const headingT = i18next.t("login.totp.heading", "Two-Factor Authentication");
  const subheadingT = i18next.t("login.totp.subheading", "Please enter the code from your authenticator app.");
  const codeLabelT = i18next.t("login.totp.code.label", "TOTP code");
  const codeRequiredT = i18next.t("login.totp.code.required", "Enter the 6-digit code");
  const codePatternT = i18next.t("login.totp.code.validation", "Please enter a 6-digit code");
  const codePlaceholderT = i18next.t("login.totp.code.placeholder", "123456");
  const codeHelperTextT = i18next.t("login.totp.code.helperText", "Enter the 6-digit code from your authenticator app");
  const verifyBtnT = i18next.t("login.totp.submit", "Verify");

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
        <Box className={"login login-totp login-totp-wrapper"}>
          <Controller
            name="code"
            control={control}
            rules={{
              required: codeRequiredT,
              pattern: { value: /^\d{6}$/, message: codePatternT },
            }}
            render={({ field, fieldState }) => (
              <TextField
                label={codeLabelT}
                placeholder={codePlaceholderT}
                value={field.value}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  field.onChange(v);
                }}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? codeHelperTextT}
                slotProps={{ input: { inputProps: { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 } } }}
                fullWidth
                className="login login-totp login-totp-code"
              />
            )}
          />

          <Button type="submit" variant="contained" fullWidth disabled={code.length !== 6} className="login login-totp login-totp-submit">
            {verifyBtnT}
          </Button>
        </Box>
      </Box>
    </>
  )
}
