export type AuthConfigError = {
  variable: string;
  message: string;
};

function isSet(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getTradingConfigErrors(): AuthConfigError[] {
  if (isSet(process.env.MATRIXTRADE_PASSWORD)) return [];
  return [
    {
      variable: "MATRIXTRADE_PASSWORD",
      message: "MATRIXTRADE_PASSWORD is not set. Copy .env.local.example to .env.local and define it.",
    },
  ];
}

export function getHealthConfigErrors(): AuthConfigError[] {
  if (isSet(process.env.HEALTH_VAULT_TOTP_SECRET)) return [];
  return [
    {
      variable: "HEALTH_VAULT_TOTP_SECRET",
      message:
        "HEALTH_VAULT_TOTP_SECRET is not set. Add your Authenticator base32 secret to .env.local.",
    },
  ];
}

export function isTradingEnvConfigured(): boolean {
  return getTradingConfigErrors().length === 0;
}

export function isHealthEnvConfigured(): boolean {
  return getHealthConfigErrors().length === 0;
}

export function formatConfigErrors(errors: AuthConfigError[]): string {
  return errors.map((e) => e.message).join(" ");
}

export function getHealthRecoveryEmails(): { primary: string; secondary: string } {
  return {
    primary:
      process.env.HEALTH_VAULT_RECOVERY_EMAIL_PRIMARY?.trim() || "argometal@hotmail.com",
    secondary:
      process.env.HEALTH_VAULT_RECOVERY_EMAIL_SECONDARY?.trim() || "argometal@gmail.com",
  };
}
