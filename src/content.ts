import { GuardrailRules, GuardrailState, DEFAULT_RULES, DEFAULT_STATE } from "./shared/types";
import { validateBet } from "./shared/rules";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let rules: GuardrailRules = { ...DEFAULT_RULES };
let state: GuardrailState = { ...DEFAULT_STATE };

async function refreshCache(): Promise<void> {
  const result = await chrome.storage.local.get(["rules", "state"]);
  if (result.rules) rules = result.rules;
  if (result.state) state = result.state;
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.rules?.newValue) rules = changes.rules.newValue;
  if (changes.state?.newValue) state = changes.state.newValue;
});

refreshCache();

// ---------------------------------------------------------------------------
// Bet Button Detection
// ---------------------------------------------------------------------------

const BET_BUTTON_SELECTORS = [
  ".betslip-place-bet-button",
  ".place-bet-button",
  ".place-bet",
  ".bet-submit",
  '[data-action="place-bet"]',
  'button[type="submit"].bet',
  ".btn-bet",
  ".place-bet-btn",
  ".betslip-bet-button",
  ".quick-bet-button",
  ".submit-bet",
  ".confirm-bet",
];

const BET_KEYWORDS = [
  "apostar",
  "place bet",
  "confirmar aposta",
  "bet now",
  "colocar aposta",
  "fazer aposta",
  "place my bet",
  "confirm bet",
  "submit bet",
];

function isBetButton(el: HTMLElement): boolean {
  for (const selector of BET_BUTTON_SELECTORS) {
    if (el.matches(selector) || el.closest(selector)) return true;
  }

  const button =
    el.closest("button") || (el.tagName === "BUTTON" ? el : null);
  if (button) {
    const text = (button.textContent || "").toLowerCase().trim();
    if (BET_KEYWORDS.some((kw) => text.includes(kw))) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Stake Value Detection
// ---------------------------------------------------------------------------

const STAKE_INPUT_SELECTORS = [
  ".betslip-stake input",
  ".stake-input",
  ".bet-stake-input",
  "input[data-stake]",
  "input.stake",
  '.betslip input[type="number"]',
  '.betslip input[type="text"]',
  'input[name*="stake"]',
  'input[placeholder*="Stake"]',
  'input[placeholder*="stake"]',
  'input[placeholder*="Valor"]',
  'input[placeholder*="valor"]',
  'input[placeholder*="Aposta"]',
  'input[placeholder*="aposta"]',
];

function findStakeValue(): number {
  for (const selector of STAKE_INPUT_SELECTORS) {
    const inputs = document.querySelectorAll<HTMLInputElement>(selector);
    for (const input of inputs) {
      const val = parseFloat(input.value.replace(/,/g, ".").replace(/[^\d.]/g, ""));
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

const OVERLAY_ID = "guardrail-overlay";

function showModal(message: string): void {
  removeModal();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.75);z-index:2147483647;
    display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:12px;
    max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.6);
    border:1px solid #e94560;text-align:center;
  `;

  const icon = document.createElement("div");
  icon.style.cssText = "font-size:40px;margin-bottom:16px;";
  icon.textContent = "\u{1F6E1}\u{FE0F}";

  const title = document.createElement("h2");
  title.style.cssText =
    "margin:0 0 12px;color:#e94560;font-size:18px;font-weight:700;letter-spacing:1px;";
  title.textContent = "GUARDRAIL";

  const msg = document.createElement("p");
  msg.style.cssText =
    "margin:0 0 24px;font-size:15px;line-height:1.6;color:#ccc;";
  msg.textContent = message;

  const btn = document.createElement("button");
  btn.style.cssText = `
    background:#e94560;color:#fff;border:none;padding:12px 32px;
    border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;
    transition:background 0.2s;
  `;
  btn.textContent = "Entendido";
  btn.addEventListener("click", removeModal);
  btn.addEventListener("mouseenter", () => (btn.style.background = "#c73e54"));
  btn.addEventListener("mouseleave", () => (btn.style.background = "#e94560"));

  modal.append(icon, title, msg, btn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) removeModal();
  });
}

function removeModal(): void {
  document.getElementById(OVERLAY_ID)?.remove();
}

// ---------------------------------------------------------------------------
// Intercept
// ---------------------------------------------------------------------------

document.addEventListener(
  "click",
  (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    if (!isBetButton(target)) return;
    if (!state.configured) return;

    if (!state.session_active) {
      chrome.runtime.sendMessage({ type: "START_SESSION" });
    }

    const stakeValue = findStakeValue();
    if (stakeValue <= 0) return;

    const result = validateBet(stakeValue, rules, state);

    if (!result.allowed) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      showModal(result.message || "Você está quebrando sua política de risco.");

      chrome.runtime.sendMessage({ type: "REGISTER_BLOCK" });

      if (result.activateCooldown) {
        chrome.runtime.sendMessage({ type: "ACTIVATE_COOLDOWN" });
      }

      refreshCache();
      return;
    }

    chrome.runtime.sendMessage({
      type: "UPDATE_LAST_STAKE",
      stake: stakeValue,
    });
  },
  true
);
