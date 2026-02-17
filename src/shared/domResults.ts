export type BetResult = "win" | "loss";

type ResultCallback = (result: BetResult) => void;

let lastResultAt = 0;
const MIN_INTERVAL_MS = 2000;

function shouldEmit(): boolean {
  const now = Date.now();
  if (now - lastResultAt < MIN_INTERVAL_MS) return false;
  lastResultAt = now;
  return true;
}

export function initDomResultDetection(callback: ResultCallback): void {
  const host = window.location.hostname;

  // Por enquanto focamos em BetBoom; arquitetura permite adicionar outros sites depois.
  if (host.includes("betboom")) {
    initBetboomDetection(callback);
  }
}

function initBetboomDetection(callback: ResultCallback): void {
  if (!document.body) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        scanNodeForResult(node, callback);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function scanNodeForResult(node: Node, callback: ResultCallback): void {
  if (!(node instanceof HTMLElement)) return;

  // 1) Detecção estruturada específica da BetBoom:
  //    blocos de aposta têm container .bb-YI com coluna .bb-S0 contendo badge "Loss" ou "Win".
  const betContainer =
    node.closest?.(".bb-YI") || (node.matches?.(".bb-YI") ? node : null);

  if (betContainer instanceof HTMLElement) {
    const statusContainer = betContainer.querySelector<HTMLElement>(".bb-S0");
    if (statusContainer) {
      const badges = statusContainer.querySelectorAll<HTMLElement>(".bb-T0");
      const lastBadge = badges[badges.length - 1];
      const label = lastBadge?.innerText.trim().toLowerCase();

      if (label === "loss" && shouldEmit()) {
        callback("loss");
        return;
      }

      if ((label === "win" || label === "won") && shouldEmit()) {
        callback("win");
        return;
      }
    }
  }

  // 2) Fallback textual genérico (pt/en) caso a estrutura mude.
  const text = node.innerText?.trim().toLowerCase() ?? "";
  if (!text) return;

  const isWin =
    text.includes("aposta ganha") ||
    text.includes("ganhou") ||
    text.includes("ganho") ||
    text.includes("vitória") ||
    text.includes("vencedor") ||
    text.includes("win") ||
    text.includes("won");

  const isLoss =
    text.includes("aposta perdida") ||
    text.includes("perdeu") ||
    text.includes("derrota") ||
    text.includes("perda total") ||
    text.includes("loss");

  if (isWin && shouldEmit()) {
    callback("win");
    return;
  }

  if (isLoss && shouldEmit()) {
    callback("loss");
  }
}

