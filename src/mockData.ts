import { AIService, ComboItem, AdapterConfig, Conversation, PromptTemplate, AppSettings } from './types';
import { ENV_CORS_PROXY, ENV_WORKER_TOKEN } from './utils/env';

export const initialServices: AIService[] = [];
export const initialCombos: ComboItem[] = [];
export const initialAdapters: AdapterConfig[] = [
  {
    id: 'vision',
    name: 'Vision Adapter (پردازش تصویر و نمودار)',
    enabled: true,
    strategy: 'fallback',
    pool: [],
  },
  {
    id: 'audio',
    name: 'Audio Adapter (پردازش و تبدیل صوت)',
    enabled: true,
    strategy: 'round_robin',
    pool: [],
  },
];
export const promptTemplates: PromptTemplate[] = [
  {
    id: 'pt-1',
    title: 'برنامه‌نویس ارشد و بازبین دقیق کد',
    content: 'تو یک مهندس ارشد نرم‌افزار هستی. پاسخ‌هایت دقیق، تمیز، دارای Typeهای کامل و با رعایت استانداردهای Clean Code و امنیت است.',
    category: 'برنامه‌نویسی',
  },
  {
    id: 'pt-2',
    title: 'متخصص حل خطای کد و دیباگ (Code Doctor)',
    content: 'نقش تو متخصص عیب‌یابی نرم‌افزار است. خطا یا لاگ کاربر را با دقت واکاوی کن، علت ریشه‌ای را در یک پاراگراف توضیح بده و نسخه کامل و اصلاح‌شده کد را بدون ابهام بازنویسی کن.',
    category: 'دیباگینگ',
  },
  {
    id: 'pt-3',
    title: 'دستیار مختصر و پاسخ‌های مستقیم',
    content: 'بدون مقدمه‌چینی، خوش‌آمدگویی یا حواشی اضافه، مستقیماً به اصل موضوع و راه‌حل نهایی پاسخ بده.',
    category: 'عمومی',
  },
];
export const initialConversations: Conversation[] = [];
export const defaultSettings: AppSettings = {
  theme: 'dark',
  autoTitle: true,
  ttsEnabled: true,
  defaultContextLimit: 6,
  defaultCorsProxy: ENV_CORS_PROXY,
  workerSecurityToken: ENV_WORKER_TOKEN,
  hasKeyLock: false,
  gistToken: '',
  gistId: '',
};
