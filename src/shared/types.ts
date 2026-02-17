export interface MarketPolicy {
  enabled: boolean;
  allowTierOneCSOnly: boolean;
  blockedSports: string[];
  blockedCompetitions: string[];
}

export type LicenseStatus = "none" | "trial" | "paid" | "expired";

export interface GuardrailRules {
  stake_base: number;
  stake_max: number;
  stop_diario: number;
  ativar_bloqueio_apos_loss_streak: boolean;
  market_policy?: MarketPolicy;
}

export interface GuardrailState {
  loss_streak: number;
  perda_acumulada_dia: number;
  cooldown_until: number;
  session_active: boolean;
  rules_locked_until: number;
  bloqueios_hoje: number;
  last_reset_date: string;
  configured: boolean;
  last_stake: number;
  stakes_window: number[];
  license_code: string | null;
  license_valid_until: number;
  license_status: LicenseStatus;
  last_activity_at: number;
}

export type BlockReason =
  | "stake_exceeded"
  | "cooldown_active"
  | "stop_diario"
  | "stake_escalation";

export interface ValidationResult {
  allowed: boolean;
  reason?: BlockReason;
  message?: string;
  activateCooldown?: boolean;
}

export const DEFAULT_RULES: GuardrailRules = {
  stake_base: 0,
  stake_max: 0,
  stop_diario: 0,
  ativar_bloqueio_apos_loss_streak: true,
  market_policy: {
    enabled: false,
    allowTierOneCSOnly: false,
    blockedSports: [],
    blockedCompetitions: [],
  },
};

export const DEFAULT_STATE: GuardrailState = {
  loss_streak: 0,
  perda_acumulada_dia: 0,
  cooldown_until: 0,
  session_active: false,
  rules_locked_until: 0,
  bloqueios_hoje: 0,
  last_reset_date: "",
  configured: false,
  last_stake: 0,
  stakes_window: [],
  license_code: null,
  license_valid_until: 0,
  license_status: "none",
  last_activity_at: 0,
};
