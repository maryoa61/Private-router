/**
 * زمان‌ها حالا به شکل ISO ذخیره می‌شوند (قابل مرتب‌سازی و مستقل از
 * locale) و فقط موقع نمایش قالب‌بندی می‌شوند. نسخه‌ی قبلی رشته‌های
 * از پیش‌قالب‌بندی‌شده مثل «هم‌اکنون» را ذخیره می‌کرد که بعد از
 * بازیابی بکاپ بی‌معنا می‌شدند.
 *
 * هر دو تابع در برابر داده‌ی قدیمی مقاوم‌اند: اگر مقدار ISO معتبر
 * نبود، همان رشته‌ی اصلی برگردانده می‌شود.
 */

function toDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ساعت و دقیقه — برای زیر هر پیام. */
export function formatClock(value: string): string {
  const d = toDate(value);
  if (!d) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** «هم‌اکنون» / «۵ دقیقه پیش» — برای لیست گفتگوها. */
export function formatRelative(value: string): string {
  const d = toDate(value);
  if (!d) return value;

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'هم‌اکنون';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} روز پیش`;

  return d.toLocaleDateString('fa-IR');
}
