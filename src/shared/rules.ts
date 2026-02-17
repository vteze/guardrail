import { GuardrailRules, GuardrailState, ValidationResult } from "./types";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function validateBet(
  stakeValue: number,
  rules: GuardrailRules,
  state: GuardrailState
): ValidationResult {
  const now = Date.now();

  if (state.cooldown_until > now) {
    return {
      allowed: false,
      reason: "cooldown_active",
      message: `Cooldown ativo até ${formatTime(state.cooldown_until)}.`,
    };
  }

  if (rules.stop_diario > 0 && state.perda_acumulada_dia >= rules.stop_diario) {
    return {
      allowed: false,
      reason: "stop_diario",
      message: "Stop diário atingido. Sessão encerrada.",
    };
  }

  if (rules.stake_max > 0 && stakeValue > rules.stake_max) {
    return {
      allowed: false,
      reason: "stake_exceeded",
      message: `Stake acima do limite definido (máx: R$${rules.stake_max.toFixed(2)}).`,
    };
  }

  if (
    rules.ativar_bloqueio_apos_loss_streak &&
    state.last_stake > 0 &&
    stakeValue > state.last_stake * 1.5
  ) {
    return {
      allowed: false,
      reason: "stake_escalation",
      message: "Escalação de stake detectada. Cooldown ativado.",
      activateCooldown: true,
    };
  }

  return { allowed: true };
}

export function canModifyRules(state: GuardrailState): {
  allowed: boolean;
  message?: string;
} {
  if (state.session_active) {
    return {
      allowed: false,
      message: "Não é possível alterar regras durante uma sessão ativa.",
    };
  }

  const now = Date.now();
  if (state.rules_locked_until > now) {
    const lockEnd = new Date(state.rules_locked_until);
    return {
      allowed: false,
      message: `Regras bloqueadas até ${lockEnd.toLocaleString("pt-BR")}.`,
    };
  }

  return { allowed: true };
}
