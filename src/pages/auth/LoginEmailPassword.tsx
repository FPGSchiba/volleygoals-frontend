import { Box, Button, Link, TextField } from "@mui/material";
import * as React from "react";
import { useForm, Controller } from 'react-hook-form';
import i18next from "i18next";
import { signIn, SignInOutput } from "aws-amplify/auth";

type FormValues = {
  email: string;
  password: string;
};

type LoginEmailPasswordProps = {
  onSignInFinished: (output: SignInOutput) => void;
}

export function LoginEmailPassword(props: LoginEmailPasswordProps) {
  const { onSignInFinished } = props;
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormValues) => {
    const output = await signIn({
      username: data.email,
      password: data.password,
    });
    onSignInFinished(output);
  };

  // Translations
  const emailLabelT = i18next.t("login.input.email.label", "Email");
  const emailRequiredT = i18next.t("login.input.email.required", "Email is required");
  const emailInvalidT = i18next.t("login.input.email.invalid", "Enter a valid email");
  const passwordLabelT = i18next.t("login.input.password.label", "Password");
  const passwordRequiredT = i18next.t("login.input.password.required", "Password is required");
  const passwordMinLengthT = i18next.t("login.input.password.minLength", "Minimum 8 characters");
  const forgotPasswordT = i18next.t("login.forgotPassword", "Forgot your password?");
  const signInButtonT = i18next.t("login.button.submit", "Sign in");

  return (
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
  )
}
