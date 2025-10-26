import { Box, Button, TextField, Typography, Paper, Link } from "@mui/material";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import QRCode from "react-qr-code";
import i18next from "i18next";
import {ConfirmSignInOutput, confirmSignIn} from "aws-amplify/auth";
import {useNotificationStore} from "../../store/notification";

interface SetupTOTPProps {
  setupURL: URL | null;
  onSetupFinished: (output: ConfirmSignInOutput) => void;
}

export function SetupTOTP({ setupURL, onSetupFinished }: SetupTOTPProps) {
  const { control, handleSubmit, watch } = useForm<{ code: string }>({
    defaultValues: { code: "" },
  });

  const [qrVisible, setQRVisible] = React.useState(false);
  const code = watch("code", "");
  const notify = useNotificationStore(state => state.notify);

  const onSubmit = async (data: { code: string }) => {
    try {
      const output =  await confirmSignIn({
        challengeResponse: data.code,
      });
      onSetupFinished(output);
    } catch (error) {
      console.error(error);
      const err = error as any;
      const code = err?.code || err?.name || "";

      let title = i18next.t(
        "error.login.setupTOTP.verificationFailed.title",
        "Verification failed."
      );
      let message = i18next.t(
        "error.login.setupTOTP.verificationFailed.message",
        "TOTP verification failed, this means the code you entered is incorrect. Please try again."
      );

      switch (code) {
        case "CodeMismatchException":
          title = i18next.t(
            "error.login.setupTOTP.codeMismatch.title",
            "Invalid code."
          );
          message = i18next.t(
            "error.login.setupTOTP.codeMismatch.message",
            "The code you entered is incorrect. Please try again."
          );
          break;

        case "ExpiredCodeException":
          title = i18next.t(
            "error.login.setupTOTP.expired.title",
            "Code expired."
          );
          message = i18next.t(
            "error.login.setupTOTP.expired.message",
            "The code has expired. Request a new code and try again."
          );
          break;

        case "NotAuthorizedException":
          title = i18next.t(
            "error.login.setupTOTP.notAuthorized.title",
            "Not authorized."
          );
          message = i18next.t(
            "error.login.setupTOTP.notAuthorized.message",
            "You are not authorized to perform this action."
          );
          break;

        case "LimitExceededException":
        case "TooManyRequestsException":
          title = i18next.t(
            "error.login.setupTOTP.limitExceeded.title",
            "Too many attempts."
          );
          message = i18next.t(
            "error.login.setupTOTP.limitExceeded.message",
            "Too many attempts. Please wait and try again later."
          );
          break;

        default:
          break;
      }

      notify({ level: "error", title, message });
    }
  };

  // Translations
  const headingT = i18next.t("login.setupTOTP.heading", "Set up TFA with TOTP");
  const subheadingT = i18next.t("login.setupTOTP.subheading", "Timed One-Time Password (TOTP) is mandatory here!");
  const qrInstructionsT = i18next.t("login.setupTOTP.showQRInstructions", "To show the QR Code please click this area and scan it with an Authenticator App.");
  const codeLabelT = i18next.t("login.setupTOTP.code.label", "TOTP code");
  const codeRequiredT = i18next.t("login.setupTOTP.code.required", "Enter the 6-digit code");
  const codePatternT = i18next.t("login.setupTOTP.code.validation", "Please enter a 6-digit code");
  const codePlaceholderT = i18next.t("login.setupTOTP.code.placeholder", "123456");
  const codeHelperTextT = i18next.t("login.setupTOTP.code.helperText", "Enter the 6-digit code from your authenticator app");
  const verifyBtnT = i18next.t("login.setupTOTP.submit", "Verify");

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
        className={"login login-setup login-setup-totp form"}
      >
        <Paper
          className="login login-setup login-setup-totp qrcode-wrap"
          onClick={() => setQRVisible(!qrVisible)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setQRVisible(true);
            }
          }}
          sx={{ cursor: "pointer" }}
        >
          {!qrVisible ? (
            <Typography
              variant="caption"
              className="login login-setup login-setup-totp qrcode-instructions"
              aria-hidden={false}
            >
              {qrInstructionsT}
            </Typography>
          ) : (
            <QRCode
              value={setupURL?.toString() || ""}
              className={"login login-setup login-setup-totp qrcode"}
            />
          )}
        </Paper>

        <Box className={"login login-setup login-setup-totp input-group"}>
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
                className="login login-setup login-setup-totp code-input"
              />
            )}
          />

          <Button type="submit" variant="contained" fullWidth disabled={code.length !== 6} className="login login-setup login-setup-totp verify-btn">
            {verifyBtnT}
          </Button>
        </Box>
      </Box>
    </>
  );
}
