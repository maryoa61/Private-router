import { AIService, ComboItem, AdapterConfig, Conversation, PromptTemplate, AppSettings } from './types';

export const initialServices: AIService[] = [
  {
    id: 'srv-1',
    name: 'OpenAI Production',
    preset: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-proj-99887766554433221100',
    corsProxy: 'https://proxy.worker.dev/{url}',
    status: 'online',
    models: [
      { id: 'gpt-4o', name: 'gpt-4o', contextWindow: '128k', isHealthy: true, latencyMs: 310 },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', contextWindow: '128k', isHealthy: true, latencyMs: 140 },
    ],
  },
  {
    id: 'srv-2',
    name: 'Anthropic Claude direct',
    preset: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: 'sk-ant-api03-abcdef123456',
    corsProxy: '',
    status: 'online',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet', contextWindow: '200k', isHealthy: true, latencyMs: 420 },
      { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku', contextWindow: '200k', isHealthy: true, latencyMs: 180 },
    ],
  },
  {
    id: 'srv-3',
    name: 'DeepSeek Fast API',
    preset: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-ds-981273981273',
    corsProxy: '',
    status: 'online',
    models: [
      { id: 'deepseek-chat', name: 'deepseek-chat (V3)', contextWindow: '64k', isHealthy: true, latencyMs: 220 },
      { id: 'deepseek-reasoner', name: 'deepseek-reasoner (R1)', contextWindow: '64k', isHealthy: true, latencyMs: 510 },
    ],
  },
];

export const initialCombos: ComboItem[] = [
  {
    id: 'combo-1',
    name: 'Ultra-Smart General (Tier 1)',
    customEndpoint: 'https://router.local/v1/combo/ultra-smart',
    customKey: 'cr-live-9041a772b9ef18',
    strategy: 'fallback',
    models: [
      { serviceId: 'srv-2', serviceName: 'Anthropic', modelName: 'claude-3-5-sonnet', priority: 1, isHealthy: true },
      { serviceId: 'srv-1', serviceName: 'OpenAI', modelName: 'gpt-4o', priority: 2, isHealthy: true },
      { serviceId: 'srv-3', serviceName: 'DeepSeek', modelName: 'deepseek-chat', priority: 3, isHealthy: true },
    ],
  },
  {
    id: 'combo-2',
    name: 'High-Throughput Round Robin',
    customEndpoint: 'https://router.local/v1/combo/load-balance',
    customKey: 'cr-live-11a84f3e09cc92',
    strategy: 'round_robin',
    models: [
      { serviceId: 'srv-1', serviceName: 'OpenAI', modelName: 'gpt-4o-mini', priority: 1, weight: 60, isHealthy: true },
      { serviceId: 'srv-2', serviceName: 'Anthropic', modelName: 'claude-3-5-haiku', priority: 2, weight: 40, isHealthy: true },
    ],
  },
  {
    id: 'combo-3',
    name: 'Triple Consensus Judge (Fusion)',
    customEndpoint: 'https://router.local/v1/combo/fusion-judge',
    customKey: 'cr-live-77d33241bcfae5',
    strategy: 'fusion',
    models: [
      { serviceId: 'srv-2', serviceName: 'Anthropic', modelName: 'claude-3-5-sonnet (داور نهایی)', priority: 1, isHealthy: true },
      { serviceId: 'srv-1', serviceName: 'OpenAI', modelName: 'gpt-4o', priority: 2, isHealthy: true },
      { serviceId: 'srv-3', serviceName: 'DeepSeek', modelName: 'deepseek-reasoner', priority: 3, isHealthy: true },
    ],
  },
];

export const initialAdapters: AdapterConfig[] = [
  {
    id: 'vision',
    name: 'Vision Adapter (پردازش تصویر و نمودار)',
    enabled: true,
    strategy: 'fallback',
    pool: [
      { serviceName: 'OpenAI', modelName: 'gpt-4o (Vision Native)', isHealthy: true },
      { serviceName: 'Anthropic', modelName: 'claude-3-5-sonnet (Vision)', isHealthy: true },
    ],
  },
  {
    id: 'audio',
    name: 'Audio Adapter (پردازش و تبدیل صوت)',
    enabled: true,
    strategy: 'round_robin',
    pool: [
      { serviceName: 'OpenAI', modelName: 'whisper-1 / gpt-4o-audio', isHealthy: true },
      { serviceName: 'Groq', modelName: 'distil-whisper-large-v3', isHealthy: true },
    ],
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

export const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'دیباگ خطای TypeError در متد map',
    serviceOrComboId: 'combo-1',
    targetType: 'combo',
    targetName: 'Ultra-Smart General (Tier 1)',
    updatedAt: '۱۰ دقیقه پیش',
    systemPrompt: 'تو یک متخصص ارشد جاوااسکریپت و تایپ‌اسکریپت هستی.',
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 4096,
    contextLimit: 8,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        content: `سلام، در ری‌اکت این کامپوننت را نوشتم اما خطای زیر رخ میده:\nUncaught TypeError: Cannot read properties of undefined (reading 'map')\n\n\`\`\`tsx\nexport function UserList({ data }) {\n  return (\n    <ul>\n      {data.users.map((u) => (\n        <li key={u.id}>{u.name}</li>\n      ))}\n    </ul>\n  );\n}\n\`\`\``,
        timestamp: '14:22',
      },
      {
        id: 'm-2',
        role: 'assistant',
        content: 'خطای شما به این علت است که هنگام اولین رندر یا در صورت ناموفق بودن درخواست داده، شیء `data` یا مقدار `data.users` هنوز مقداردهی نشده و `undefined` است.',
        timestamp: '14:23',
        isCodeFix: true,
        codeAnalysis: {
          cause: 'دسترسی مستقیم به ویژگی `users` بدون بررسی وجود `data` یا استفاده از Optional Chaining و مقدار پیش‌فرض.',
          solution: 'افزودن Optional Chaining (`data?.users?.map`) به همراه تعریف نوع داده (TypeScript Interface) و مدیریت وضعیت بارگذاری یا لیست خالی.',
          language: 'typescript',
          diffSummary: '- {data.users.map((u) => ...\n+ {data?.users?.map((u) => ... || <EmptyPlaceholder />',
          fixedCode: `interface User {
  id: string | number;
  name: string;
}

interface UserListProps {
  data?: {
    users?: User[];
  };
}

export function UserList({ data }: UserListProps) {
  const users = data?.users;

  if (!users || users.length === 0) {
    return <p className="text-gray-400 text-sm">هیچ کاربری یافت نشد.</p>;
  }

  return (
    <ul className="space-y-1">
      {users.map((u) => (
        <li key={u.id} className="p-2 rounded bg-slate-800 text-sm">
          {u.name}
        </li>
      ))}
    </ul>
  );
}`,
        },
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'بررسی وضعیت جدیدترین مدل‌های LLM',
    serviceOrComboId: 'srv-1',
    targetType: 'service',
    targetName: 'OpenAI Production (gpt-4o)',
    updatedAt: '۲ ساعت پیش',
    systemPrompt: '',
    temperature: 0.5,
    topP: 1.0,
    maxTokens: 2048,
    contextLimit: 0,
    messages: [
      {
        id: 'm-3',
        role: 'user',
        content: 'آخرین مدل‌های معرفی‌شده با قابلیت روتینگ هوشمند و معماری هیبریدی چه مزایایی دارند؟',
        timestamp: '12:05',
        hasWebSearch: true,
      },
      {
        id: 'm-4',
        role: 'assistant',
        content: 'روترهای ترکیبی (Combo Routers) بار پردازشی و هزینه را با استراتژی‌های Fallback، Round-Robin و Consensus Judge بهینه‌سازی می‌کنند. اگر یک سرویس با محدودیت Rate-Limit مواجه شود یا در دسترس نباشد، درخواست به سرعت به مدل پشتیبان هدایت می‌شود.',
        timestamp: '12:06',
        webSources: [
          { title: 'Next-Gen LLM Routing Architectures', url: 'https://example.com/llm-routing' },
          { title: 'Proxy Optimization & Fallback Systems', url: 'https://example.com/proxy-benchmark' },
        ],
      },
    ],
  },
];

export const defaultSettings: AppSettings = {
  theme: 'dark',
  autoTitle: true,
  ttsEnabled: true,
  defaultContextLimit: 6,
  defaultCorsProxy: 'https://cors-proxy.my-worker.workers.dev/{url}',
  workerSecurityToken: 'sec_tok_9918231aa7',
  hasKeyLock: false,
  gistToken: '',
  gistId: '',
};
