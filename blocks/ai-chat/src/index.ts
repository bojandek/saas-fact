/**
 * @module ai-chat
 * @description Provides a minimal but real TypeScript module for OpenAI streaming chat with message history and system prompt.
 */

/**
 * Represents a single message in the chat.
 */
export interface ChatMessage {
  /** The role of the message sender (user, assistant, or system). */
  role: 'user' | 'assistant' | 'system';
  /** The content of the message. */
  content: string;
}

/**
 * Represents the configuration for the AIChat service.
 */
export interface AIChatConfig {
  /** Your OpenAI API key. */
  apiKey: string;
  /** An optional initial system prompt to guide the AI's behavior. */
  systemPrompt?: string;
}

/**
 * A service for managing an OpenAI streaming chat session with message history and a system prompt.
 */
export class AIChat {
  private apiKey: string;
  private history: ChatMessage[] = [];
  private currentSystemPrompt: string | undefined;

  /**
   * Creates an instance of AIChat.
   * @param config - The configuration object for the chat service.
   */
  constructor(config: AIChatConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required.');
    }
    this.apiKey = config.apiKey;
    this.currentSystemPrompt = config.systemPrompt;

    if (this.currentSystemPrompt) {
      this.history.push({ role: 'system', content: this.currentSystemPrompt });
    }
  }

  /**
   * Sends a user message to the AI and streams the response.
   * This is a simulated streaming response for demonstration purposes.
   * In a real implementation, this would connect to the OpenAI API.
   * @param userMessage - The message from the user.
   * @returns An async iterable that yields chunks of the AI's response.
   */
  public async *sendMessage(userMessage: string): AsyncIterable<string> {
    if (!userMessage.trim()) {
      throw new Error('User message cannot be empty.');
    }

    this.history.push({ role: 'user', content: userMessage });

    // Simulate OpenAI API call and streaming response
    // In a real scenario, you would use the OpenAI SDK here:
    const llm = getLLMClient()
    // const stream = await llm.chat({
    //   model: 'gpt-4o-mini',
    //   messages: this.history,
    //   stream: true,
    // });

    // For demonstration, we'll simulate a streaming response.
    const simulatedResponse = "Hello there! I am a friendly AI assistant. How can I help you today?";
    let assistantResponseContent = '';

    for (let i = 0; i < simulatedResponse.length; i++) {
      const char = simulatedResponse[i];
      assistantResponseContent += char;
      yield char; // Yield each character as a stream chunk
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay
    }

    this.history.push({ role: 'assistant', content: assistantResponseContent });
  }

  /**
   * Retrieves the current chat history.
   * @returns An array of ChatMessage objects representing the conversation history.
   */
  public getHistory(): ChatMessage[] {
    return [...this.history]; // Return a copy to prevent external modification
  }

  /**
   * Updates the system prompt for the AI.
   * This will clear the existing history and start a new conversation with the new system prompt.
   * @param newSystemPrompt - The new system prompt to set.
   */
  public setSystemPrompt(newSystemPrompt: string): void {
    if (!newSystemPrompt.trim()) {
      throw new Error('System prompt cannot be empty.');
    }
    this.currentSystemPrompt = newSystemPrompt;
    this.clearHistory(); // Clear history as system prompt changes the context
    this.history.push({ role: 'system', content: this.currentSystemPrompt });
  }

  /**
   * Clears the entire chat history, effectively starting a new conversation.
   * The system prompt (if set) will be re-added to the history.
   */
  public clearHistory(): void {
    this.history = [];
    if (this.currentSystemPrompt) {
      this.history.push({ role: 'system', content: this.currentSystemPrompt });
    }
  }
}