export type RoutingStrategy = 'fallback' | 'round_robin' | 'fusion';

export interface ServiceModel {
  id: string;
  name: string;
  contextWindow?: string;
  isHealthy: boolean;
  latencyMs?: number;
}

export interface AIService {
  id: string;
  name: string;
  preset: string; // 'OpenAI' | 'Anthropic' | 'Gemini' | 'Groq' | 'DeepSeek' | 'OpenRouter' | 'Custom'
  baseUrl: string;
  apiKey: string;
  corsProxy?: string;
  status: 'online' | 'offline' | 'degraded' | 'checking';
  models: ServiceModel[];
}

export interface ComboItem {
  id: string;
  name: string;
  customEndpoint: string;
  customKey: string;
  strategy: RoutingStrategy;
  models: {
    serviceId: string;
    serviceName: string;
    modelName: string;
    priority: number;
    weight?: number;
    isHealthy: boolean;
  }[];
}

export interface AdapterConfig {
  id: 'vision' | 'audio';
  name: string;
  enabled: boolean;
  strategy: 'fallback' | 'round_robin';
  pool: {
    serviceName: string;
    modelName: string;
    isHealthy: boolean;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isCodeFix?: boolean;
  codeAnalysis?: {
    cause: string;
    solution: string;
    fixedCode: string;
    language: string;
    diffSummary: string;
  };
  hasWebSearch?: boolean;
  webSources?: { title: string; url: string }[];
  isPending?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  serviceOrComboId: string;
  targetType: 'service' | 'combo';
  targetName: string;
  updatedAt: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextLimit: number;
  messages: ChatMessage[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  autoTitle: boolean;
  ttsEnabled: boolean;
  defaultContextLimit: number;
  defaultCorsProxy: string;
  workerSecurityToken: string;
  hasKeyLock: boolean;
  gistToken: string;
  gistId: string;
}
