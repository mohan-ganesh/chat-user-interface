import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

interface ChatMessage {
  type: 'user' | 'bot' | 'validation';
  content: string;
  relatedQuestions?: string[];
  references?: ChatReference[];
  validation?: boolean;
}

interface ChatReference {
  chunkInfo: {
    relevanceScore: number;
    content: string;
    documentMetadata: {
      title: string;
      uri: string;
    };
  };
}

interface ChatResponse {
  answer: {
    answerText: string;
    relatedQuestions: string[];
    references: ChatReference[];
  };
  session?: {
    name: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly DOMAIN = environment.apiDomain;
  private readonly SHORT_MESSAGES = ['hey', 'hello', 'hi', 'hola', 'hey there', 'hi there'];
  private readonly VALIDATION_RESPONSE: ChatMessage = {
    type: 'bot',
    validation: true,
    content: "🌟 **Hello!**\nI'd be happy to help! Could you please elaborate on your question so I can provide the most helpful response?"
  };

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  private currentSession: string | null = null;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSession();
  }

  private initializeSession() {
    this.currentSession = sessionStorage.getItem('chatSession') || null;
  }

  get messages() {
    return this.messagesSubject.value;
  }

  sendMessage(message: string): Observable<void> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return of();

    if (this.SHORT_MESSAGES.includes(trimmedMessage.toLowerCase())) {
      this.addMessage({ type: 'user', content: trimmedMessage });
      this.addMessage(this.VALIDATION_RESPONSE);
      return of();
    }

    this.addMessage({ type: 'user', content: trimmedMessage });
    this.isLoadingSubject.next(true);

    const requestBody = {
      query: trimmedMessage,
      ...(this.currentSession && { session: this.currentSession })
    };

    return this.http.post<ChatResponse>(
      `${this.DOMAIN}/code-translate/v1alpha/data-discovery/prompt`,
      requestBody
    ).pipe(
      tap(response => this.handleResponse(response)),
      catchError(error => this.handleError(error)),
      map(() => undefined)
    );
  }

  private handleResponse(response: ChatResponse) {
    if (response.session?.name) {
      this.currentSession = response.session.name;
      sessionStorage.setItem('chatSession', this.currentSession);
    }

    const botMessage: ChatMessage = {
      type: 'bot',
      content: response.answer.answerText,
      relatedQuestions: response.answer.relatedQuestions,
      references: response.answer.references
    };

    this.addMessage(botMessage);
    this.isLoadingSubject.next(false);
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    this.addMessage({
      type: 'bot',
      content: 'Sorry, there was an error processing your request.',
      references: []
    });
    this.isLoadingSubject.next(false);
    return of();
  }

  clearSession() {
    sessionStorage.removeItem('chatSession');
    this.currentSession = null;
    this.messagesSubject.next([]);
    this.isLoadingSubject.next(false);
  }

  private addMessage(message: ChatMessage) {
    this.messagesSubject.next([...this.messages, message]);
  }

  markdownToHTML(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  get shouldShowNewChat(): boolean {
    return this.messages.length > 0;
  }
}