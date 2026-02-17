export interface GuardrailRules {
  stake_base: number;
  stake_max: number;
  stop_diario: number;
  ativar_bloqueio_apos_loss_streak: boolean;
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
};
