// Normalizes a Nigerian phone number to international digits-only format
// for use in wa.me links (e.g. "09065757430" -> "2349065757430").
export function formatNigerianWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}
