import { GuardrailRules, GuardrailState } from "../shared/types";

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const elNotConfigured = $("not-configured");
const elStatusPanel = $("status-panel");
const elCooldownPanel = $("cooldown-panel");
const elCooldownMsg = $("cooldown-msg");
const elStopPanel = $("stop-panel");
const elActions = $("actions");

const elSessionStatus = $("session-status");
const elStakeBase = $("val-stake-base");
const elStakeMax = $("val-stake-max");
const elStopDiario = $("val-stop-diario");
const elPerda = $("val-perda");
const elLossStreak = $("val-loss-streak");
const elBloqueios = $("val-bloqueios");

const btnConfigure = $<HTMLButtonElement>("btn-configure");
const btnSession = $<HTMLButtonElement>("btn-session");
const btnWin = $<HTMLButtonElement>("btn-win");
const btnLoss = $<HTMLButtonElement>("btn-loss");
const btnConfirmLoss = $<HTMLButtonElement>("btn-confirm-loss");
const btnCancelLoss = $<HTMLButtonElement>("btn-cancel-loss");
const btnOptions = $<HTMLButtonElement>("btn-options");

const elLossForm = $("loss-form");
const elLossAmount = $<HTMLInputElement>("loss-amount");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function show(el: HTMLElement): void {
  el.classList.remove("hidden");
}

function hide(el: HTMLElement): void {
  el.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

interface StatusResponse {
  rules: GuardrailRules;
  state: GuardrailState;
  cooldownActive: boolean;
  cooldownRemaining: number;
  stopDiarioAtingido: boolean;
}

function render(status: StatusResponse): void {
  const { rules, state, cooldownActive, cooldownRemaining, stopDiarioAtingido } =
    status;

  if (!state.configured) {
    show(elNotConfigured);
    hide(elStatusPanel);
    hide(elCooldownPanel);
    hide(elStopPanel);
    hide(elActions);
    return;
  }

  hide(elNotConfigured);
  show(elStatusPanel);
  show(elActions);

  // Session
  if (state.session_active) {
    elSessionStatus.textContent = "Ativa";
    elSessionStatus.className = "badge badge-on";
    btnSession.textContent = "Encerrar Sessão";
  } else {
    elSessionStatus.textContent = "Inativa";
    elSessionStatus.className = "badge badge-off";
    btnSession.textContent = "Iniciar Sessão";
  }

  // Rules
  elStakeBase.textContent = formatBRL(rules.stake_base);
  elStakeMax.textContent = formatBRL(rules.stake_max);
  elStopDiario.textContent = formatBRL(rules.stop_diario);

  // State
  elPerda.textContent = formatBRL(state.perda_acumulada_dia);
  elLossStreak.textContent = String(state.loss_streak);
  elBloqueios.textContent = String(state.bloqueios_hoje);

  // Cooldown
  if (cooldownActive) {
    show(elCooldownPanel);
    elCooldownMsg.textContent = `Restam ${formatCountdown(cooldownRemaining)}`;
  } else {
    hide(elCooldownPanel);
  }

  // Stop diário
  if (stopDiarioAtingido) {
    show(elStopPanel);
  } else {
    hide(elStopPanel);
  }
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadStatus(): Promise<StatusResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      resolve(response as StatusResponse);
    });
  });
}

async function refresh(): Promise<void> {
  const status = await loadStatus();
  render(status);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

btnConfigure.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

btnOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

btnSession.addEventListener("click", async () => {
  const status = await loadStatus();
  const msgType = status.state.session_active ? "END_SESSION" : "START_SESSION";
  chrome.runtime.sendMessage({ type: msgType }, () => refresh());
});

btnWin.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "REGISTER_WIN" }, () => refresh());
});

btnLoss.addEventListener("click", () => {
  show(elLossForm);
  elLossAmount.value = "";
  elLossAmount.focus();
});

btnCancelLoss.addEventListener("click", () => {
  hide(elLossForm);
});

btnConfirmLoss.addEventListener("click", async () => {
  const amount = parseFloat(elLossAmount.value);
  if (isNaN(amount) || amount <= 0) {
    elLossAmount.style.borderColor = "var(--danger)";
    return;
  }
  elLossAmount.style.borderColor = "";

  const status = await loadStatus();
  chrome.runtime.sendMessage(
    {
      type: "REGISTER_LOSS",
      amount,
      currentStake: status.state.last_stake || amount,
    },
    () => {
      hide(elLossForm);
      refresh();
    }
  );
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

refresh();

setInterval(refresh, 2000);
