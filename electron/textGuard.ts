export interface TextValidationResult {
  valid: boolean;
  reason?: string;
}

const URL_PATTERN = /(?:https?:\/\/|ftp:\/\/|mailto:|file:\/\/|www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;
const MARKDOWN_LINK_OR_IMAGE_PATTERN = /!?\[[^\]]*\]\(\s*[^)\s]+(?:\s+"[^"]*")?\s*\)/i;
const HTML_EMBED_PATTERN = /<\s*(?:a|img|iframe|video|audio|source|embed|object|svg|script|link)\b[^>]*>/i;
const DATA_URI_PATTERN = /data:(?:image|video|audio|text\/html|application)\/[a-z0-9.+-]+;base64,/i;

export function sanitizePlainText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function validatePlainText(input: string): TextValidationResult {
  const text = sanitizePlainText(input);

  if (DATA_URI_PATTERN.test(text)) {
    return {
      valid: false,
      reason: 'Yalnızca düz metin girişine izin verilir; gömülü medya veya dosya eklenemez.',
    };
  }

  if (HTML_EMBED_PATTERN.test(text)) {
    return {
      valid: false,
      reason: 'Yalnızca düz metin girişine izin verilir; HTML bağlantısı veya medya etiketi eklenemez.',
    };
  }

  if (MARKDOWN_LINK_OR_IMAGE_PATTERN.test(text)) {
    return {
      valid: false,
      reason: 'Yalnızca düz metin girişine izin verilir; bağlantı veya görsel sözdizimi eklenemez.',
    };
  }

  if (URL_PATTERN.test(text)) {
    return {
      valid: false,
      reason: 'Yalnızca düz metin girişine izin verilir; web bağlantısı (URL) eklenemez.',
    };
  }

  return { valid: true };
}
