import {
  GuardrailRules,
  GuardrailState,
  DEFAULT_RULES,
  DEFAULT_STATE,
} from "./types";

export async function getRules(): Promise<GuardrailRules> {
  const result = await chrome.storage.local.get("rules");
  return { ...DEFAULT_RULES, ...(result.rules ?? {}) };
}

export async function setRules(rules: GuardrailRules): Promise<void> {
  await chrome.storage.local.set({ rules });
}

export async function getState(): Promise<GuardrailState> {
  const result = await chrome.storage.local.get("state");
  return { ...DEFAULT_STATE, ...(result.state ?? {}) };
}

export async function setState(
  partial: Partial<GuardrailState>
): Promise<void> {
  const current = await getState();
  await chrome.storage.local.set({ state: { ...current, ...partial } });
}

export async function resetDailyState(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await setState({
    perda_acumulada_dia: 0,
    loss_streak: 0,
    cooldown_until: 0,
    session_active: false,
    bloqueios_hoje: 0,
    last_reset_date: today,
    last_stake: 0,
  });
}
