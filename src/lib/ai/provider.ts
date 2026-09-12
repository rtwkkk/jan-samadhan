export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  generateReply(messages: ChatMessage[]): Promise<string | null>;
  generateStructuredData<T>(messages: ChatMessage[]): Promise<T | null>;
}
