function formatKeyList(keys) {
  return keys.join(", ");
}

function validateOptionalConfigGroup({
  name,
  enabledKeys,
  requiredKeys,
}) {
  const enabled = enabledKeys.some((key) => Boolean(process.env[key]));
  if (!enabled) return;

  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length === 0) return;

  const message = `[config] ${name}: faltan ${formatKeyList(missing)}. Requeridas cuando se habilita ${name}.`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(message);
}

export function validateRuntimeConfig() {
  validateOptionalConfigGroup({
    name: "Mercado Pago",
    enabledKeys: [
      "MP_CLIENT_ID",
      "MP_CLIENT_SECRET",
      "MP_REDIRECT_URI",
      "MP_NOTIFICATION_URL",
      "MP_WEBHOOK_SECRET",
      "MP_SPONSOR_ID",
    ],
    requiredKeys: ["MP_CLIENT_ID", "MP_CLIENT_SECRET", "MP_REDIRECT_URI"],
  });

  validateOptionalConfigGroup({
    name: "ARCA",
    enabledKeys: [
      "ARCA_CUIT",
      "ARCA_CERT_PEM",
      "ARCA_PRIVATE_KEY",
      "ARCA_PTO_VENTA",
      "ARCA_ENV",
    ],
    requiredKeys: [
      "ARCA_CUIT",
      "ARCA_CERT_PEM",
      "ARCA_PRIVATE_KEY",
      "ARCA_PTO_VENTA",
    ],
  });
}
