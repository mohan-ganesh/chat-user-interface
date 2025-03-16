export interface ChatMessage {
    type: 'user' | 'bot' | 'validation';
    content: string;
    relatedQuestions?: string[];
    references?: any[];
    validation?: boolean;
}