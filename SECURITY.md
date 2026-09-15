# امنیت و پیکربندی اسرار

## ۱. اول از همه: توکن قدیمی را باطل کن

نسخه‌ی قبلی `worker.js` این مقدار را هاردکد داشت:

```
02f4****************************************  (PROXY_TOKEN)
```

این مقدار در تاریخچه‌ی git باقی می‌ماند حتی بعد از این تغییرات. قبل از عمومی کردن ریپو:

1. یک توکن جدید بساز:
   ```bash
   openssl rand -hex 24
   ```
2. روی Worker ست کن: `wrangler secret put PROXY_TOKEN`
3. اگر می‌خواهی مقدار قدیمی از تاریخچه هم پاک شود، `git filter-repo` یا BFG لازم است — صرفاً کامیت جدید کافی نیست.
4. نام ورکر قبلی (`rough-dew-b6af`) هم در تاریخچه هست. اگر لو رفتنش مهم است، ورکر را با نام جدید دیپلوی کن و قبلی را حذف کن.

## ۲. چه چیزی واقعاً محرمانه است؟

| مقدار | کجا نگه‌داری می‌شود | در مرورگر دیده می‌شود؟ |
|---|---|---|
| `PROXY_TOKEN` | Cloudflare Worker secret | ❌ نه |
| `CLOUDFLARE_API_TOKEN` | GitHub secret (فقط CI) | ❌ نه |
| `VITE_CORS_PROXY_URL` | GitHub secret → build | ✅ بله |
| `VITE_ADMIN_TOKEN` | GitHub secret → build | ✅ بله |
| `VITE_WORKER_PROXY_TOKEN` | GitHub secret → build | ✅ بله |

هر چیزی با پیشوند `VITE_` توسط Vite داخل باندل جاوااسکریپت inline می‌شود. GitHub Secrets فقط جلوی دیده‌شدن در **کد منبع** را می‌گیرد، نه در **سایت منتشرشده**.

بنابراین برای دیپلوی عمومی:

- `VITE_WORKER_PROXY_TOKEN` را **خالی بگذار**. هر کاربر توکن خودش را در Settings → امنیت وارد می‌کند و در `localStorage` مرورگر خودش می‌ماند.
- محافظت واقعی ورکر از `ALLOWED_ORIGINS` می‌آید: فقط دامنه‌ی سایت خودت اجازه دارد. این را مثل یک قفل جدی ببین، برخلاف توکنی که در باندل عمومی است.

## ۳. Secretهایی که در GitHub باید بسازی

`Settings → Secrets and variables → Actions`:

| نام | نمونه |
|---|---|
| `CLOUDFLARE_API_TOKEN` | توکن API با دسترسی Pages + Workers |
| `CLOUDFLARE_ACCOUNT_ID` | شناسه‌ی اکانت Cloudflare |
| `CLOUDFLARE_PAGES_PROJECT` | `private-router` |
| `CF_WORKER_NAME` | نام ورکر، مثلاً `pr-proxy-9f2c` |
| `PROXY_TOKEN` | خروجی `openssl rand -hex 24` |
| `ALLOWED_ORIGINS` | `https://private-router.pages.dev` |
| `ALLOW_HOSTS` | اختیاری، مثلاً `api.openai.com,api.groq.com` |
| `VITE_CORS_PROXY_URL` | `https://pr-proxy-9f2c.<sub>.workers.dev/?url={url}` |
| `VITE_ADMIN_TOKEN` | رمز ورود به `/admin` |
| `VITE_WORKER_PROXY_TOKEN` | برای سایت عمومی خالی |

`PROXY_TOKEN` در GitHub و مقدار ست‌شده روی Worker باید یکی باشند؛ workflow این همگام‌سازی را خودکار انجام می‌دهد.

## ۴. قفل AES-GCM

فعال‌سازی از Settings → امنیت. جزئیات پیاده‌سازی (`src/utils/crypto.ts`):

- مشتق‌سازی کلید: PBKDF2-SHA256، ۲۵۰٬۰۰۰ تکرار، salt تصادفی ۱۶ بایتی.
- رمزگذاری: AES-GCM ۲۵۶ بیتی با IV تصادفی ۱۲ بایتی که **در هر بار نوشتن عوض می‌شود**.
- `CryptoKey` با `extractable: false` ساخته می‌شود؛ بایت‌های خام کلید حتی از داخل کد قابل خواندن نیستند.
- رمز عبور هیچ‌جا ذخیره نمی‌شود. صحت آن با شکست خوردن تگ احراز اصالت GCM سنجیده می‌شود، نه با هش ذخیره‌شده.
- وقتی قفل فعال است، `combo_router_services_v1` (متن ساده) حذف و `combo_router_vault_v1` (بلاب رمزگذاری‌شده) جایگزین می‌شود.

**رمز قابل بازیابی نیست.** فراموش کردن آن یعنی از دست رفتن کلیدهای ذخیره‌شده.

## ۵. همگام‌سازی Gist

پیاده‌سازی در `src/utils/gistApi.ts` روی `api.github.com` (بدون نیاز به پروکسی، چون CORS دارد).
توکن فقط به scope `gist` نیاز دارد.

⚠️ Gist «مخفی» خصوصی نیست — فقط فهرست‌نشده است و هرکس URL را داشته باشد می‌تواند بخواندش.
به همین دلیل وقتی قفل AES-GCM فعال باشد، محتوای بکاپ **قبل از ارسال** رمزگذاری می‌شود.
اگر قفل خاموش باشد، UI قبل از Push هشدار می‌دهد که کلیدها به‌صورت متن ساده ارسال می‌شوند.

## ۶. نکات باقی‌مانده

- بخش `/admin` صرفاً یک قفل سمت کلاینت است. هر کسی می‌تواند با ست‌کردن `admin_auth` در localStorage از آن عبور کند. برای کنترل دسترسی واقعی به Cloudflare Access یا احراز هویت سمت سرور نیاز داری.
- دکمه‌ی «جستجوی وب» در چت فقط یک پرچم روی پیام است و جستجوی واقعی انجام نمی‌دهد؛ برای کار کردن، مدل مقصد باید خودش قابلیت جستجو داشته باشد.
