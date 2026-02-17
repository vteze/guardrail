import { getState, setState, getRules, resetDailyState } from "./shared/storage";
import { deriveLicenseStatus } from "./shared/license";

const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hora
const BET_HOST_PATTERN = /\.bet\.br$/;
const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutos sem atividade

// Mantém controle simples de quais abas já abriram o pop-up nesta sessão do SW
const greetedTabs = new Set<number>();

// --- First run / Install ----------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Abre automaticamente o livro de regras / configuração inicial
    chrome.runtime.openOptionsPage();
  }
});

// --- Tab navigation: abrir pop-up ao entrar em site de bet ------------------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url) return;

  try {
    const url = new URL(tab.url);
    const host = url.hostname;

    if (!BET_HOST_PATTERN.test(host)) return;
    if (greetedTabs.has(tabId)) return;

    greetedTabs.add(tabId);

    const popupUrl = chrome.runtime.getURL("popup/popup.html");
    chrome.windows.create({
      url: popupUrl,
      type: "popup",
      width: 360,
      height: 520,
      focused: true,
    });
  } catch {
    // URL inválida ou não http(s); ignorar
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  greetedTabs.delete(tabId);
});

// --- Daily Reset -----------------------------------------------------------

async function checkDailyReset(): Promise<void> {
  const state = await getState();
  const today = new Date().toISOString().split("T")[0];
  if (state.last_reset_date !== today) {
    await resetDailyState();
  }
}

checkDailyReset();

chrome.alarms.create("daily-reset", { periodInMinutes: 1 });
chrome.alarms.create("session-timeout", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "daily-reset") {
    checkDailyReset();
  } else if (alarm.name === "session-timeout") {
    maybeTimeoutSession();
  }
});

async function touchActivity(): Promise<void> {
  await setState({ last_activity_at: Date.now() });
}

async function maybeTimeoutSession(): Promise<void> {
  const state = await getState();
  if (!state.session_active) return;

  const last = state.last_activity_at || 0;
  const now = Date.now();
  if (last > 0 && now - last > SESSION_TIMEOUT_MS) {
    await setState({ session_active: false });
  }
}

// --- Message Handlers -------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // keep channel open for async response
});

async function handleMessage(
  message: Record<string, unknown>
): Promise<unknown> {
  await checkDailyReset();

  switch (message.type) {
    case "GET_STATUS":
      return getFullStatus();

    case "START_SESSION":
      await setState({ session_active: true });
      await touchActivity();
      return { ok: true };

    case "END_SESSION":
      await setState({ session_active: false });
      return { ok: true };

    case "REGISTER_LOSS":
      await touchActivity();
      return handleLoss(
        message.amount as number,
        message.currentStake as number
      );

    case "REGISTER_WIN":
      await setState({ loss_streak: 0 });
      await touchActivity();
      return { ok: true };

    case "REGISTER_BLOCK": {
      const state = await getState();
      await setState({ bloqueios_hoje: state.bloqueios_hoje + 1 });
      await touchActivity();
      return { ok: true };
    }

    case "ACTIVATE_COOLDOWN":
      await setState({ cooldown_until: Date.now() + COOLDOWN_DURATION_MS });
      await touchActivity();
      return { ok: true };

    case "UPDATE_LAST_STAKE": {
      const stake = (message.stake as number) || 0;
      const state = await getState();
      const window = [...(state.stakes_window || []), stake].slice(-5);
      await setState({ last_stake: stake, stakes_window: window });
      await touchActivity();
      return { ok: true };
    }

    default:
      return { error: "unknown message type" };
  }
}

// --- Loss Handler -----------------------------------------------------------

async function handleLoss(
  amount: number,
  currentStake: number
): Promise<{ ok: true; cooldownActivated: boolean }> {
  const state = await getState();
  const rules = await getRules();

  const newLossStreak = state.loss_streak + 1;
  const newPerda = state.perda_acumulada_dia + Math.abs(amount);

  const updates: Record<string, unknown> = {
    loss_streak: newLossStreak,
    perda_acumulada_dia: newPerda,
    last_stake: currentStake || state.last_stake,
  };

  let cooldownActivated = false;

  if (rules.ativar_bloqueio_apos_loss_streak && newLossStreak >= 2) {
    updates.cooldown_until = Date.now() + COOLDOWN_DURATION_MS;
    cooldownActivated = true;
  }

  if (rules.stop_diario > 0 && newPerda >= rules.stop_diario) {
    updates.session_active = false;
  }

  await setState(updates);
  return { ok: true, cooldownActivated };
}

// --- Status -----------------------------------------------------------------

async function getFullStatus() {
  await checkDailyReset();
  await maybeTimeoutSession();

  const state = await getState();
  const rules = await getRules();
  const now = Date.now();

  return {
    rules,
    state: { ...state, license_status: deriveLicenseStatus(state, now) },
    cooldownActive: state.cooldown_until > now,
    cooldownRemaining: Math.max(0, state.cooldown_until - now),
    stopDiarioAtingido:
      rules.stop_diario > 0 &&
      state.perda_acumulada_dia >= rules.stop_diario,
  };
}
