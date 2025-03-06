import { markdownToHTML } from "./utils.js";
import { DOMAIN, SHORT_MESSAGES, VALIDATION_RESPONSE } from "./config.js";

let messages = [];
let currentSession = sessionStorage.getItem("chatSession") || null;
let isFirstInteraction = true;

export function initChat() {
  // Event listeners
  document
    .getElementById("userInput")
    .addEventListener("keydown", handleKeyDown);
  document
    .querySelector(".send-button")
    .addEventListener("click", handleSendMessage);
  document
    .querySelector(".new-chat-btn")
    .addEventListener("click", clearSessionAndChat);
  document
    .getElementById("scrollToBottomBtn")
    .addEventListener("click", scrollToBottom);

  // Scroll listener
  document
    .getElementById("chatMessages")
    .addEventListener("scroll", handleScroll);

  // Initial render
  renderChat();
}

async function handleSendMessage() {
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Clear placeholder after first interaction
  if (isFirstInteraction) {
    userInput.placeholder = "";
    isFirstInteraction = false;
  }

  // Check for short messages
  if (SHORT_MESSAGES.includes(userMessage.toLowerCase())) {
    handleShortMessage(userInput, userMessage);
    return;
  }

  messages.push({ type: "user", content: userMessage });
  renderChat();
  userInput.value = "";

  // Show loading effect
  document.getElementById("loadingDots").style.display = "flex";

  try {
    const requestBody = {
      query: userMessage,
      ...(currentSession && { session: currentSession }),
    };

    const response = await fetch(
      `${DOMAIN}/code-translate/v1alpha/data-discovery/prompt`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.session?.name) {
      currentSession = data.session.name;
      sessionStorage.setItem("chatSession", currentSession);
    }

    messages.push({
      type: "bot",
      content: data.answer.answerText,
      relatedQuestions: data.answer.relatedQuestions,
      references: data.answer.references || [],
    });

    if (messages.length === 1) {
      document
        .getElementById("newChatContainer")
        .classList.add("new-chat-visible");
    }

    renderChat();
  } catch (error) {
    console.error("API Error:", error);
    messages.push({
      type: "bot",
      content: "Sorry, there was an error processing your request.",
      references: [],
    });
    renderChat();
  } finally {
    document.getElementById("loadingDots").style.display = "none";
  }
}

function clearSessionAndChat() {
  sessionStorage.removeItem("chatSession");
  currentSession = null;
  messages = [];
  isFirstInteraction = true;
  document.getElementById("userInput").placeholder = "Type your message...";
  renderChat();
  document
    .getElementById("newChatContainer")
    .classList.remove("new-chat-visible");
}

function renderChat() {
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = "";

  const newChatContainer = document.getElementById("newChatContainer");
  newChatContainer.classList.toggle("new-chat-visible", messages.length > 0);

  messages.forEach((msg) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${msg.type}-message`;

    if (msg.validation) {
      messageDiv.innerHTML = `
                <div class="validation-text">
                    <strong>Let's dive deeper!</strong>
                    ${markdownToHTML(msg.content)}
                </div>
            `;
      chatMessages.appendChild(messageDiv);
      return;
    }

    const contentWrapper = document.createElement("div");
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";
    contentWrapper.style.gap = "8px";

    const textElement = document.createElement("div");
    textElement.style.whiteSpace = "pre-wrap";
    textElement.style.overflowWrap = "break-word";
    textElement.style.flex = "1 1 auto";
    textElement.innerHTML =
      msg.type === "bot" ? markdownToHTML(msg.content) : msg.content;

    contentWrapper.appendChild(textElement);

    if (msg.type === "bot") {
      addBotMessageActions(contentWrapper, msg);
      addRelatedQuestions(contentWrapper, msg);
      addReferences(contentWrapper, msg);
    }

    messageDiv.appendChild(contentWrapper);
    chatMessages.appendChild(messageDiv);
  });

  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: "smooth",
  });

  const inputContainer = document.querySelector(".input-container");
  inputContainer.classList.toggle("initial", messages.length === 0);
}

// Helper functions
function handleKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
}

function handleScroll() {
  const chatMessages = document.getElementById("chatMessages");
  const isAtBottom =
    chatMessages.scrollHeight - chatMessages.clientHeight <=
    chatMessages.scrollTop + 1;
  document
    .getElementById("scrollToBottomBtn")
    .classList.toggle("visible", !isAtBottom);
}

function scrollToBottom() {
  document.getElementById("chatMessages").scrollTo({
    top: document.getElementById("chatMessages").scrollHeight,
    behavior: "smooth",
  });
}

function handleShortMessage(userInput, userMessage) {
  messages.push({ type: "user", content: userInput.value.trim() });
  messages.push(VALIDATION_RESPONSE);
  renderChat();
  userInput.value = "";
}

function addBotMessageActions(container, msg) {
  const actionContainer = document.createElement("div");
  actionContainer.style.display = "flex";
  actionContainer.style.gap = "12px";
  actionContainer.style.marginTop = "12px";
  actionContainer.style.alignItems = "center";

  // Copy Button
  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.title = "Copy";
  copyButton.innerHTML = `
        <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"/>
        </svg>
        <span class="button-tooltip">Copy</span>
    `;

  const copyFeedback = document.createElement("span");
  copyFeedback.className = "copy-success";
  copyFeedback.textContent = "Copied!";

  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      copyButton.parentElement.classList.add("show-copy-feedback");
      setTimeout(() => {
        copyButton.parentElement.classList.remove("show-copy-feedback");
      }, 2000);
    });
  });

  // Feedback Buttons
  const buttonGroup = document.createElement("div");
  buttonGroup.style.display = "flex";
  buttonGroup.style.gap = "8px";
  buttonGroup.style.alignItems = "center";

  // Add feedback buttons here (thumbs up/down) if needed

  buttonGroup.appendChild(copyButton);
  buttonGroup.appendChild(copyFeedback);
  actionContainer.appendChild(buttonGroup);
  container.appendChild(actionContainer);
}

function addRelatedQuestions(container, msg) {
  if (msg.relatedQuestions?.length > 0) {
    const relatedQuestionsDiv = document.createElement("div");
    relatedQuestionsDiv.className = "related-questions";

    msg.relatedQuestions.forEach((question) => {
      const button = document.createElement("button");
      button.className = "related-question-btn";
      button.textContent = question;
      button.addEventListener("click", () => {
        document.getElementById("userInput").value = question;
        handleSendMessage();
      });
      relatedQuestionsDiv.appendChild(button);
    });
    container.appendChild(relatedQuestionsDiv);
  }
}

function addReferences(container, msg) {
  if (msg.references?.length > 0) {
    const referencesSection = document.createElement("div");
    referencesSection.className = "references-section";

    msg.references.forEach((reference) => {
      if (reference.chunkInfo.relevanceScore >= 0.5) {
        const referenceDiv = createReferenceElement(reference);
        referencesSection.appendChild(referenceDiv);
      }
    });

    if (referencesSection.children.length > 0) {
      container.appendChild(referencesSection);
    }
  }
}

function createReferenceElement(reference) {
  const chunk = reference.chunkInfo;
  const metadata = chunk.documentMetadata;
  const title =
    metadata.title === "untitled"
      ? metadata.uri.split("/").pop()
      : metadata.title;

  const referenceDiv = document.createElement("div");
  const header = document.createElement("div");
  header.className = "reference-header";
  header.innerHTML = `
        <div>
            <strong>${title}</strong><br>
            <small>Relevance: ${Math.round(chunk.relevanceScore * 100)}%</small>
        </div>
        <svg class="chevron-icon" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
    `;

  const content = document.createElement("div");
  content.className = "reference-content";
  const truncatedContent =
    chunk.content.split(" ").slice(0, 40).join(" ") + "...";
  content.innerHTML = `
        <div class="chunk-info">${truncatedContent}</div>
        <a href="${metadata.uri}" class="doc-link" target="_blank">View Source Document</a>
    `;

  header.addEventListener("click", () => {
    content.classList.toggle("expanded");
    header.querySelector(".chevron-icon").classList.toggle("expanded");
  });

  referenceDiv.appendChild(header);
  referenceDiv.appendChild(content);
  return referenceDiv;
}
