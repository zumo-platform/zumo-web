const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export function getApiBaseUrl(): string {
  return apiBaseUrl ?? "";
}

export function getWebhookEndpoint(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return "";
  return `${baseUrl.replace(/\/$/, "")}/webhook/whatsapp`;
}
