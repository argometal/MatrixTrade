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
  if (isSet(process.env.HEALTH_VAULT_PASSWORD)) return [];
  return [
    {
      variable: "HEALTH_VAULT_PASSWORD",
      message: "HEALTH_VAULT_PASSWORD is not set. Copy .env.local.example to .env.local and define it.",
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
