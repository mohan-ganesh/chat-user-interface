import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  Output,
  EventEmitter
} from '@angular/core';
import { ChatMessage } from '../models/chat.model';

@Component({
  selector: 'app-chat-messages',
  templateUrl: './chat-messages.component.html',
  styleUrls: ['./chat-messages.component.css']
})
export class ChatMessagesComponent implements AfterViewChecked {
  @Input() messages: ChatMessage[] = [];
  @Output() sendQuestion = new EventEmitter<string>();
  @Output() feedback = new EventEmitter<{ type: string, message: ChatMessage }>();

  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  showScrollButton = false;
  private isScrolled = false;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    if (!this.isScrolled && this.chatMessagesContainer) {
      try {
        this.chatMessagesContainer.nativeElement.scrollTop =
          this.chatMessagesContainer.nativeElement.scrollHeight;
      } catch (err) { }
    }
  }

  onScroll() {
    const element = this.chatMessagesContainer.nativeElement;
    const atBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;
    this.showScrollButton = !atBottom;
    this.isScrolled = !atBottom;
  }

  jumpToBottom() {
    try {
      this.isScrolled = false;
      this.chatMessagesContainer.nativeElement.scroll({
        top: this.chatMessagesContainer.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    } catch (err) { }
  }

  copyContent(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      // Handle copy feedback
    });
  }

  handleFeedback(message: ChatMessage, type: 'positive' | 'negative') {
    this.feedback.emit({ type, message });
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return index + message.content.substring(0, 50);
  }
}