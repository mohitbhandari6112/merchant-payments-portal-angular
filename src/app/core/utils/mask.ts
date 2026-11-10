export function maskEmail(value: string): string {
  const trimmed = value.trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex <= 0) {
    return maskTail(trimmed, 0);
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  const visiblePrefix = localPart.slice(0, 1);
  const hiddenLength = Math.max(3, localPart.length - 1);

  return `${visiblePrefix}${'•'.repeat(hiddenLength)}${domain}`;
}

export function maskTail(value: string, visibleDigits = 4): string {
  const compact = value.replace(/\s+/g, '');

  if (compact.length === 0) {
    return 'Not provided';
  }

  const visible = compact.slice(-Math.min(visibleDigits, compact.length));
  const hiddenLength = Math.min(10, Math.max(4, compact.length - visible.length));

  return `${'•'.repeat(hiddenLength)} ${visible}`;
}

export function maskPhone(value: string): string {
  return maskTail(value.replace(/[^\d+]/g, ''), 4);
}
