import * as React from 'react';
  import {useEffect} from "react";
  import {confirmResetPassword, resetPassword} from "aws-amplify/auth";
  import {Box, Button, CircularProgress, Divider, TextField, Typography } from "@mui/material";
  import {Controller, useForm} from "react-hook-form";
  import i18next from "i18next";
  import {useNotificationStore} from "../../store/notification";

  type SetupNewPasswordProps = {
    username: string;
    onSuccess: () => void;
  }

  export function SetupNewPassword(props: SetupNewPasswordProps) {
    const { username, onSuccess } = props;

    type FormValues = {
      code: string;
      password: string;
      confirmPassword: string;
    };

    const notify = useNotificationStore(state => state.notify);

    const [destinationMail, setDestinationMail] = React.useState<string>("");

    const [isResetting, setIsResetting] = React.useState(false);
    const [resendDisabledUntil, setResendDisabledUntil] = React.useState<number | null>(null);
    const [resendCountdown, setResendCountdown] = React.useState(0);

    const globalKey = "__sentResetRequests";
    const getSentSet = (): Set<string> => (globalThis as any)[globalKey] || ((globalThis as any)[globalKey] = new Set<string>());

    const performReset = async (opts?: { force?: boolean }) => {
      if (!username) return;
      const now = Date.now();

      // If a resend is blocked by the timer, don't proceed
      if (!opts?.force && resendDisabledUntil && now < resendDisabledUntil) return;

      const sent = getSentSet();

      // If it's already been sent for this username (initial send), don't resend unless forced
      if (!opts?.force && sent.has(username)) return;

      setIsResetting(true);
      setResendDisabledUntil(now + 60_000);
      setResendCountdown(60);

      try {
        const res = await resetPassword({ username });
        setDestinationMail((res as any)?.nextStep?.codeDeliveryDetails?.destination ?? "");
        getSentSet().add(username);
        console.log("Password reset result:", res);
      } catch (err) {
        console.error("Password reset error:", err);
        const errName = (err as any)?.name || (err as any)?.code || "";
        let errMsg = (err && ((err as any).message || String(err))) || i18next.t("error.unknown", "An unknown error occurred.");
        let title = i18next.t("login.setupNewPassword.error.defaultTitle", "Password reset failed");
        let level: "error" | "warning" | "info" = "error";

        switch (errName) {
          case "LimitExceededException":
            title = i18next.t("error.login.setupNewPassword.limitExceeded.title", "Too many attempts");
            errMsg = i18next.t("error.login.setupNewPassword.limitExceeded.message", "Too many attempts. Please wait before trying again.");
            level = "warning";
            break;
          case "CodeMismatchException":
            title = i18next.t("error.login.setupNewPassword.codeMismatch.title", "Invalid code");
            errMsg = i18next.t("error.login.setupNewPassword.codeMismatch.message", "The code you entered is invalid. Please check and try again.");
            level = "error";
            break;
          case "ExpiredCodeException":
            title = i18next.t("error.login.setupNewPassword.expiredCode.title", "Code expired");
            errMsg = i18next.t("error.login.setupNewPassword.expiredCode.message", "The code has expired. Request a new code to continue.");
            level = "warning";
            break;
          default:
            break;
        }

        notify({ title, message: errMsg, level });
        getSentSet().delete(username);
        setResendDisabledUntil(null);
        setResendCountdown(0);
      } finally {
        // setIsResetting(false);
      }
    };

    useEffect(() => {
      if (!username) return;

      const sent = getSentSet();
      if (sent.has(username)) return; // already requested for this username
      sent.add(username);

      // initial send on mount / when username changes
      performReset({ force: true });
    }, [username]);

    useEffect(() => {
      if (!resendCountdown || resendCountdown <= 0) return;
      const id = setInterval(() => {
        setResendCountdown((c) => {
          if (c <= 1) {
            setResendDisabledUntil(null);
            clearInterval(id);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }, [resendCountdown]);

    const {
      control,
      handleSubmit,
      watch,
      formState: { errors, isSubmitting },
    } = useForm<FormValues>({
      defaultValues: { code: "", password: "", confirmPassword: "" },
      mode: "onBlur",
    });

    const onSubmit = async (values: FormValues) => {
      try {
        const code = values.code.replace(/\D/g, "").slice(0, 6);
        console.log("Submitting new password", { username, code, password: values.password });
        confirmResetPassword({
          username: username,
          confirmationCode: code,
          newPassword: values.password,
        }).catch((err) => {
          console.error("Confirm reset password error:", err);
          const errName = (err as any)?.name || (err as any)?.code || "";
          let errMsg = (err && ((err as any).message || String(err))) || i18next.t("error.unknown", "An unknown error occurred.");
          let title = i18next.t("login.setupNewPassword.error.defaultTitle", "Set password failed");
          let level: "error" | "warning" | "info" = "error";

          switch (errName) {
            case "ConfirmForgotPasswordException":
              title = i18next.t("error.login.setupNewPassword.confirmForgotPassword.title", "Invalid code or password");
              errMsg = i18next.t(
                "error.login.setupNewPassword.confirmForgotPassword.message",
                "The confirmation code or new password is invalid. Please check and try again."
              );
              level = "error";
              break;
            case "AuthValidationErrorCode":
              title = i18next.t("error.login.setupNewPassword.validation.title", "Validation error");
              errMsg = i18next.t(
                "error.login.setupNewPassword.validation.message",
                "Confirmation code, password, or username is empty or invalid."
              );
              level = "warning";
              break;
            default:
              break;
          }

          notify({ title, message: errMsg, level });
          throw err;
        }).then(() => {
          notify({
            level: 'info',
            message: i18next.t("login.setupNewPassword.success.message", "Your password has been reset successfully. You can now log in with your new password."),
            title: i18next.t("login.setupNewPassword.success.title", "Password reset successful."),
          });
        });
        onSuccess();
      } catch (err) {
        console.error(err);
      }
    };

    const passwordValue = watch("password");

    // Translations (use provided `setupPassword` labels)
    const headingT = i18next.t("login.setupPassword.heading", "Set a new Password");
    const subheadingT = i18next.t("login.setupPassword.subheading", "Please use your email to update your Password.");
    const passwordLabelT = i18next.t("login.setupPassword.password.label", "Password");
    const passwordRequiredT = i18next.t("login.setupPassword.password.required", "Password is required");
    const passwordMinLengthT = i18next.t("login.setupPassword.password.minLength", "Password must be at least 8 characters");
    const confirmPasswordLabelT = i18next.t("login.setupPassword.confirmPassword.label", "Confirm Password");
    const confirmPasswordRequiredT = i18next.t("login.setupPassword.confirmPassword.required", "Please confirm your password");
    const confirmPasswordMatchT = i18next.t("login.setupPassword.confirmPassword.match", "Passwords must match");
    const codeHelperTextT = i18next.t("login.setupPassword.codeHelperText", { email: destinationMail, defaultValue: "Code sent to: {{email}}" });
    const codeLabelT = i18next.t("login.setupPassword.code.label", "Verification Code");
    const codePlaceholderT = i18next.t("login.setupPassword.code.placeholder", "123456");
    const codeRequiredT = i18next.t("login.setupPassword.code.required", "Verification code is required");
    const codeValidationT = i18next.t("login.setupPassword.code.validation", "Please enter a 6 Digit code");
    const resendStateWaitingT = i18next.t("login.setupPassword.resend.stateWaiting", { countdown: resendCountdown, defaultValue: "Resend ({{countdown}} s)" });
    const resendStateActiveT = i18next.t("login.setupPassword.resend.stateActive", { defaultValue: "Resend Code" });
    const submitStateLoadingT = i18next.t("login.setupPassword.submit.stateLoading", "Setting Password...");
    const submitStateActiveT = i18next.t("login.setupPassword.submit.stateActive", "Set new Password");

    return (
      <Box className="login login-spassword login-spassword-root">
        <Box className={"login login-header login-header-wrapper"}>
          <Typography className={"login login-header login-header-heading"} variant={"h2"}>
            {headingT}
          </Typography>
          <Typography className={"login login-header login-header-subheading"} variant={"h4"}>
            {subheadingT}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate className="login login-spassword login-spassword-form">
          <Box sx={{ display: 'block' }}>
            <Box className="login login-spassword login-spassword-row">
              <Controller
                name="password"
                control={control}
                rules={{
                  required: passwordRequiredT,
                  minLength: { value: 8, message: passwordMinLengthT },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={passwordLabelT}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    fullWidth
                    className="login login-spassword login-spassword-field"
                    autoComplete="new-password"
                  />
                )}
              />
            </Box>

            <Box className="login login-spassword login-spassword-row">
              <Controller
                name="confirmPassword"
                control={control}
                rules={{
                  required: confirmPasswordRequiredT,
                  validate: (v) => v === passwordValue || confirmPasswordMatchT,
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={confirmPasswordLabelT}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    fullWidth
                    className="login login-spassword login-spassword-field"
                    autoComplete="new-password"
                  />
                )}
              />
            </Box>

            <Divider sx={{width: '100%', marginTop: '2rem', marginBottom: '1rem'}} />

              <Box className="login login-spassword login-spassword-destination-wrapper">
              <Typography variant="body2" className="login login-spassword login-spassword-destination">
                {codeHelperTextT}
              </Typography>
            </Box>

            <Box className="login login-spassword login-spassword-code-row">
              <Controller
                name="code"
                control={control}
                rules={{
                  required: codeRequiredT,
                  pattern: { value: /^\d{6}$/, message: codeValidationT },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={codeLabelT}
                    placeholder={codePlaceholderT}
                    inputMode="numeric"
                    slotProps={{ input: { inputProps: { inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 } } }}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    fullWidth
                    className="login login-spassword login-spassword-code-field"
                    autoComplete="one-time-code"
                  />
                )}
              />
              <Box className={"login login-spassword login-spassword-resend-wrapper"}>
                {isResetting ? (
                  <CircularProgress className={"login login-spassword login-spassword-loading"} />
                ) : (
                  <span className={"login login-spassword login-spassword-loading"} />
                )}
                <Button
                  variant="contained"
                  size="small"
                  className="login login-spassword login-spassword-resend"
                  onClick={() => void performReset()}
                  aria-label="Resend code"
                  sx={{ textTransform: 'none' }}
                  disabled={isResetting || resendCountdown > 0}
                >
                  {resendCountdown > 0
                    ? resendStateWaitingT
                    : resendStateActiveT}
                </Button>
              </Box>
            </Box>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} className="login login-spassword login-spassword-submit">
              {isSubmitting ? submitStateLoadingT : submitStateActiveT}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }
