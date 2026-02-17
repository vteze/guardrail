import { GuardrailRules, GuardrailState } from "../shared/types";
import { getRules, setRules, getState, setState } from "../shared/storage";
import { canModifyRules } from "../shared/rules";
import { createLicenseFromCode, hasValidLicense, getPixPayload } from "../shared/license";

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const form = $<HTMLFormElement>("rules-form");
const inputLicenseCode = $<HTMLInputElement>("license_code");
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
const elCheckLicense = $("check-license");
const elCheckStakes = $("check-stakes");
const elCheckStop = $("check-stop");
const elStakeMaxHelp = $("stake_max_help");
const elPixPayload = document.getElementById("pix-payload") as HTMLElement | null;
const elPixQr = document.getElementById("pix-qr") as HTMLImageElement | null;
const btnCopyPix = document.getElementById("btn-copy-pix") as
  | HTMLButtonElement
  | null;

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

  if (disabled) {
    elConfirmBox.classList.add("hidden");
  } else {
    elConfirmBox.classList.remove("hidden");
  }
}

function updateStakeMaxExamples(): void {
  const base = parseFloat(inputStakeBase.value);
  if (isNaN(base) || base <= 0) {
    elStakeMaxHelp.textContent =
      "Limite absoluto. Qualquer aposta acima será bloqueada.";
    return;
  }
  const ex125 = (base * 1.25).toFixed(2).replace(".", ",");
  const ex150 = (base * 1.5).toFixed(2).replace(".", ",");
  elStakeMaxHelp.textContent = `Limite absoluto. Exemplos com base na sua stake base: 1,25x = R$ ${ex125}, 1,5x = R$ ${ex150}.`;
}

function updateChecklist(rules: GuardrailRules, state: GuardrailState): void {
  const licenseOk = hasValidLicense(state);
  const stakesOk = rules.stake_base > 0 && rules.stake_max > 0;
  const stopOk = rules.stop_diario > 0;

  elCheckLicense.classList.toggle("completed", licenseOk);
  elCheckStakes.classList.toggle("completed", stakesOk);
  elCheckStop.classList.toggle("completed", stopOk);
}

function updatePixSection(): void {
  if (!elPixPayload || !elPixQr) return;
  const payload = getPixPayload();
  elPixPayload.textContent = payload;
  elPixQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    payload
  )}`;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadCurrentRules(): Promise<void> {
  const rules = await getRules();
  const state = await getState();

  // Populate fields
  if (state.license_code) inputLicenseCode.value = state.license_code;
  if (rules.stake_base > 0) inputStakeBase.value = String(rules.stake_base);
  if (rules.stake_max > 0) inputStakeMax.value = String(rules.stake_max);
  if (rules.stop_diario > 0) inputStopDiario.value = String(rules.stop_diario);
  inputLossStreak.checked = rules.ativar_bloqueio_apos_loss_streak;
  updateStakeMaxExamples();
  updateChecklist(rules, state);
  updatePixSection();

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
  const licenseCode = inputLicenseCode.value.trim();
  const previousRules = await getRules();
  const currentState = await getState();
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
    market_policy: previousRules.market_policy,
  };

  const now = Date.now();
  const check = canModifyRules(currentState);

  const stakesChanged =
    rules.stake_base !== previousRules.stake_base ||
    rules.stake_max !== previousRules.stake_max ||
    rules.stop_diario !== previousRules.stop_diario ||
    rules.ativar_bloqueio_apos_loss_streak !==
      previousRules.ativar_bloqueio_apos_loss_streak;

  if (!check.allowed && stakesChanged) {
    showFeedback(
      check.message || "Regras bloqueadas no momento. Tente novamente mais tarde.",
      "error"
    );
    return;
  }

  if (check.allowed) {
    await setRules(rules);
  }

  const nextState: Partial<GuardrailState> = {
    configured: true,
  };

  // Só renova lock de 24h se pudermos modificar regras
  if (check.allowed) {
    nextState.rules_locked_until = now + 24 * 60 * 60 * 1000;
  }

  if (licenseCode) {
    try {
      Object.assign(nextState, createLicenseFromCode(licenseCode, now));
    } catch (e) {
      showFeedback(
        e instanceof Error ? e.message : "Código de acesso inválido.",
        "error"
      );
      return;
    }
  }

  await setState(nextState);

  showFeedback(
    "Regras salvas. Lock de 24h aplicado. Guardrail ativo.",
    "success"
  );

  // Disable form after save
  setFormDisabled(true);
  elLockWarning.classList.remove("hidden");
  const lockDate = new Date(nextState.rules_locked_until!);
  elLockMsg.textContent = `Regras bloqueadas até ${lockDate.toLocaleString("pt-BR")}.`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

inputConfirm.addEventListener("change", () => {
  btnSave.disabled = !inputConfirm.checked;
});

if (btnCopyPix) {
  btnCopyPix.addEventListener("click", () => {
    const payload = getPixPayload();
    navigator.clipboard
      .writeText(payload)
      .then(() => {
        showFeedback("Código Pix copiado para a área de transferência.", "success");
      })
      .catch(() => {
        showFeedback("Não foi possível copiar o código Pix.", "error");
      });
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  saveRules();
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadCurrentRules();
