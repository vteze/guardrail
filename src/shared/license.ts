import { GuardrailState, LicenseStatus } from "./types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function hasValidLicense(state: GuardrailState, now = Date.now()): boolean {
  if (!state.license_code) return false;
  if (state.license_status === "expired" || state.license_valid_until <= 0) {
    return false;
  }
  return state.license_valid_until > now;
}

export function deriveLicenseStatus(state: GuardrailState, now = Date.now()): LicenseStatus {
  if (!state.license_code) return "none";
  if (state.license_valid_until <= now) return "expired";
  return state.license_status === "trial" ? "trial" : "paid";
}

export function createLicenseFromCode(code: string, now = Date.now()) {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Código de acesso não pode ser vazio.");
  }

  // MVP: qualquer código não vazio é aceito; opcionalmente validar prefixo "GR-".
  const validUntil = now + THIRTY_DAYS_MS;

  return {
    license_code: trimmed,
    license_valid_until: validUntil,
    license_status: "paid" as LicenseStatus,
  };
}

// PIX estático para CNPJ 62776577000147, valor R$19,90
// Geramos o payload EMV para uso em QR e "copia e cola".
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function getPixPayload(): string {
  const pixKey = "62776577000147"; // CNPJ
  const merchantName = "GUARDRAIL";
  const merchantCity = "SAO PAULO";
  const amount = "19.90";
  const txid = "GRBETA";

  const gui = "BR.GOV.BCB.PIX";

  const merchantAccountInfo =
    "00" + gui.length.toString().padStart(2, "0") + gui +
    "01" + pixKey.length.toString().padStart(2, "0") + pixKey;

  const merchantAccountField =
    "26" +
    merchantAccountInfo.length.toString().padStart(2, "0") +
    merchantAccountInfo;

  const payloadFormat = "000201";
  // Para QR estático o campo 01 (Point of Initiation Method) é opcional; vamos omitir
  const merchantCategoryCode = "52040000";
  const transactionCurrency = "5303986"; // 53 03 986
  const transactionAmount =
    "54" + amount.length.toString().padStart(2, "0") + amount;
  const countryCode = "5802BR";
  const nameField =
    "59" + merchantName.length.toString().padStart(2, "0") + merchantName;
  const cityField =
    "60" + merchantCity.length.toString().padStart(2, "0") + merchantCity;

  const txidField =
    "05" + txid.length.toString().padStart(2, "0") + txid;
  const additionalDataField =
    "62" + txidField.length.toString().padStart(2, "0") + txidField;

  const withoutCrc =
    payloadFormat +
    merchantAccountField +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    nameField +
    cityField +
    additionalDataField +
    "6304";

  const crc = crc16(withoutCrc);
  return withoutCrc + crc;
}


