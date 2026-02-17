import { GuardrailRules } from "../shared/types";
import { getRules, setRules, getState, setState } from "../shared/storage";
import { canModifyRules } from "../shared/rules";

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const form = $<HTMLFormElement>("rules-form");
const inputStakeBase = $<HTMLInputElement>("stake_base");
const inputStakeMax = $<HTMLInputElement>("stake_max");
const inputStopDiario = $<HTMLInputElement>("stop_diario");
const inputLossStreak = $<HTMLInputElement>("loss_streak_toggle");
const inputConfirm = $<HTMLInputElement>("confirm-checkbox");

const btnSave = $<HTMLButtonElement>("btn-save");
const elFeedback = $("save-feedback");
const elLockWarning = $("lock-warning");
const elLockMsg = $("lock-msg");
const elSessionWarning = $("session-warning");
const elConfirmBox = $("confirm-box");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function showFeedback(msg: string, type: "success" | "error"): void {
  elFeedback.textContent = msg;
  elFeedback.className = `feedback ${type}`;
  elFeedback.classList.remove("hidden");
  setTimeout(() => elFeedback.classList.add("hidden"), 4000);
}

function setFormDisabled(disabled: boolean): void {
  inputStakeBase.disabled = disabled;
  inputStakeMax.disabled = disabled;
  inputStopDiario.disabled = disabled;
  inputLossStreak.disabled = disabled;
  inputConfirm.disabled = disabled;
  btnSave.disabled = disabled;

  if (disabled) {
    elConfirmBox.classList.add("hidden");
  } else {
    elConfirmBox.classList.remove("hidden");
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadCurrentRules(): Promise<void> {
  const rules = await getRules();
  const state = await getState();

  // Populate fields
  if (rules.stake_base > 0) inputStakeBase.value = String(rules.stake_base);
  if (rules.stake_max > 0) inputStakeMax.value = String(rules.stake_max);
  if (rules.stop_diario > 0) inputStopDiario.value = String(rules.stop_diario);
  inputLossStreak.checked = rules.ativar_bloqueio_apos_loss_streak;

  // Check if rules can be modified
  const check = canModifyRules(state);

  if (!check.allowed) {
    setFormDisabled(true);

    if (state.session_active) {
      elSessionWarning.classList.remove("hidden");
    } else if (state.rules_locked_until > Date.now()) {
      elLockWarning.classList.remove("hidden");
      elLockMsg.textContent = check.message || "";
    }
  } else {
    setFormDisabled(false);
  }
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

async function saveRules(): Promise<void> {
  const stakeBase = parseFloat(inputStakeBase.value);
  const stakeMax = parseFloat(inputStakeMax.value);
  const stopDiario = parseFloat(inputStopDiario.value);
  const lossStreakEnabled = inputLossStreak.checked;

  // Validations
  if (isNaN(stakeBase) || stakeBase <= 0) {
    showFeedback("Stake base deve ser maior que zero.", "error");
    inputStakeBase.focus();
    return;
  }

  if (isNaN(stakeMax) || stakeMax <= 0) {
    showFeedback("Stake máxima deve ser maior que zero.", "error");
    inputStakeMax.focus();
    return;
  }

  if (stakeMax < stakeBase) {
    showFeedback("Stake máxima não pode ser menor que a stake base.", "error");
    inputStakeMax.focus();
    return;
  }

  if (isNaN(stopDiario) || stopDiario <= 0) {
    showFeedback("Stop diário deve ser maior que zero.", "error");
    inputStopDiario.focus();
    return;
  }

  const rules: GuardrailRules = {
    stake_base: stakeBase,
    stake_max: stakeMax,
    stop_diario: stopDiario,
    ativar_bloqueio_apos_loss_streak: lossStreakEnabled,
  };

  await setRules(rules);

  // Apply 24h lock and mark as configured
  const lockUntil = Date.now() + 24 * 60 * 60 * 1000;
  await setState({
    rules_locked_until: lockUntil,
    configured: true,
  });

  showFeedback(
    "Regras salvas. Lock de 24h aplicado. Guardrail ativo.",
    "success"
  );

  // Disable form after save
  setFormDisabled(true);
  elLockWarning.classList.remove("hidden");
  const lockDate = new Date(lockUntil);
  elLockMsg.textContent = `Regras bloqueadas até ${lockDate.toLocaleString("pt-BR")}.`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

inputConfirm.addEventListener("change", () => {
  btnSave.disabled = !inputConfirm.checked;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  saveRules();
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadCurrentRules();
