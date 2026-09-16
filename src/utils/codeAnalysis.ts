/**
 * تشخیص کد و parse کردن پاسخ «Code Doctor».
 *
 * ChatView از قبل یک کارت کامل برای `msg.codeAnalysis` رندر می‌کرد، ولی
 * هیچ‌جا مقداردهی نمی‌شد؛ پاسخ خام و بدون ساختار نمایش داده می‌شد.
 * این فایل همان قرارداد خروجی‌ای که در CODE_DOCTOR_PROMPT از مدل خواسته
 * شده را می‌خواند و به شکل ساختاریافته برمی‌گرداند.
 */

export interface CodeAnalysis {
  cause: string;
  solution: string;
  fixedCode: string;
  language: string;
  diffSummary: string;
}

/**
 * آیا پیام کاربر واقعاً کد/خطا است؟
 *
 * نسخه‌ی قبلی از `\{[\s\S]*\}` استفاده می‌کرد که هر متن فارسیِ حاویِ یک
 * جفت آکولاد را «کد» می‌دید و بی‌دلیل پرامپت عیب‌یابی را تزریق می‌کرد.
 * حالا به نشانه‌های واقعی‌تر و چندخطی بودن تکیه می‌کنیم.
 */
export function looksLikeCode(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // بلوک کد صریح — قطعی است.
  if (/```/.test(trimmed)) return true;

  const strongSignals = [
    /\bTraceback \(most recent call last\)/,
    /^\s*(at\s+\w[\w.$]*\s*\(|File ")/m,
    /\b\w*(Error|Exception):\s/,
    /\b(function|const|let|var|class|def|import|export|return)\b/,
    /[;{}]\s*$/m,
    /^\s*(public|private|protected|static)\s+\w/m,
    /<\/?[a-zA-Z][\w-]*[^>]*>/,
  ];

  const hits = strongSignals.filter((re) => re.test(trimmed)).length;
  const multiline = trimmed.includes('\n');

  // یک نشانه‌ی قوی در متن چندخطی، یا دو نشانه در متن تک‌خطی.
  return multiline ? hits >= 1 : hits >= 2;
}

const CODE_FENCE = /```([a-zA-Z0-9+#_-]*)\r?\n([\s\S]*?)```/;

function extractSection(text: string, labels: string[]): string {
  for (const label of labels) {
    // تا برچسب بعدی، شروع بلوک کد، یا انتهای متن ادامه بده.
    const re = new RegExp(
      `${label}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:علت|راه[‌ ]?حل|راهکار|Cause|Solution|Fix)\\s*[:：]|\`\`\`|$)`,
      'i'
    );
    const m = text.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}

/**
 * پاسخ مدل را به ساختار کارت تحلیل تبدیل می‌کند.
 * اگر پاسخ با قالب موردانتظار نخواند، `null` برمی‌گردد و ChatView
 * همان متن ساده را نشان می‌دهد (degrade به حالت قبل، نه خطا).
 */
export function parseCodeDoctorResponse(raw: string): CodeAnalysis | null {
  if (!raw) return null;

  const fence = raw.match(CODE_FENCE);
  const cause = extractSection(raw, ['علت', 'Cause']);
  const solution = extractSection(raw, ['راه‌حل', 'راه حل', 'راهکار', 'Solution', 'Fix']);

  // بدون کد اصلاح‌شده، کارت تحلیل چیزی به پاسخ اضافه نمی‌کند.
  if (!fence || !fence[2].trim()) return null;
  if (!cause && !solution) return null;

  const fixedCode = fence[2].replace(/\s+$/, '');
  const lineCount = fixedCode.split('\n').length;

  return {
    cause: cause || '—',
    solution: solution || '—',
    fixedCode,
    language: (fence[1] || 'text').toLowerCase(),
    diffSummary: `${lineCount} خط کد اصلاح‌شده`,
  };
}
