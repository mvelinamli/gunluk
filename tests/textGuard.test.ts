import { describe, expect, it } from 'vitest';
import { sanitizePlainText, validatePlainText } from '../electron/textGuard';

describe('textGuard', () => {
  it('allows normal Turkish plain text with punctuation and newlines', () => {
    const res = validatePlainText('Bugün 13.11.2026 — çok verimli bir gündü!\nYeni defterime başladım...');
    expect(res.valid).toBe(true);
  });

  it('rejects http/https URLs and www links', () => {
    expect(validatePlainText('Şu siteye bak: https://example.com').valid).toBe(false);
    expect(validatePlainText('Adres: http://test.org/a').valid).toBe(false);
    expect(validatePlainText('www.ornek.com').valid).toBe(false);
  });

  it('rejects markdown links/images and HTML embeds', () => {
    expect(validatePlainText('[tıkla](https://example.com)').valid).toBe(false);
    expect(validatePlainText('![foto](resim.png)').valid).toBe(false);
    expect(validatePlainText('<img src="x.png">').valid).toBe(false);
    expect(validatePlainText('<a href="x">link</a>').valid).toBe(false);
  });

  it('rejects base64 data URIs', () => {
    expect(validatePlainText('data:image/png;base64,iVBORw0KGgo=').valid).toBe(false);
  });

  it('sanitizes CRLF and control characters', () => {
    expect(sanitizePlainText('satir1\r\nsatir2\u0000')).toBe('satir1\nsatir2');
  });
});
