import { useState, useEffect, useRef, useCallback } from "react";
import { debounce } from "lodash";
import "./styles/AppStream.css";
import logo from "./assets/logo.png";

const SHORT_MESSAGES = ["hey", "hello", "hi", "hola", "hey there", "hi there"];
const VALIDATION_RESPONSE = {
  type: "bot",
  validation: true,
  content:
    "🌟 **Hello!**\nI'd be happy to help! Could you please elaborate on your question so I can provide the most helpful response?",
};
const DOMAIN = atob("aHR0cHM6Ly90ZXN0LmNvbnZlcnNhdGlvbi5nb2VuZ2VuLmNvbQ==");
const OIDC_CONFIG = JSON.parse(
  atob(
    "eyJjbGllbnRJZCI6IlhYWFhYWFhYLWFkMjctNGIyNS1hZDkxLWRjNGY4MjQ1Y2NmOSIsInJlZGlyZWN0VXJpIjoiaHR0cDovL2xvY2FsaG9zdDo0MjAwIiwiYXV0aEVuZHBvaW50IjoiaHR0cHM6Ly9vYXV0aC5pZC5qdW1wY2xvdWQuY29tL29hdXRoMi9hdXRoIiwidG9rZW5FbmRwb2ludCI6Imh0dHBzOi8vb2F1dGguaWQuanVtcGNsb3VkLmNvbS9vYXV0aDIvdG9rZW4iLCJ1c2VySW5mb0VuZHBvaW50IjoiaHR0cHM6Ly9vYXV0aC5pZC5qdW1wY2xvdWQuY29tL3VzZXJpbmZvIiwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImNsaWVudFNlY3JldCI6IlhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFgifQ=="
  )
);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced scroll functions
  const advancedScrollToBottom = useCallback(
    debounce((behavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }, 300),
    []
  );

  const scrollToBottom = useCallback(
    debounce(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300),
    []
  );

  useEffect(() => {
    const savedSession = sessionStorage.getItem("chatSession");
    const savedUser = sessionStorage.getItem("userInfo");
    if (savedSession) setSession(savedSession);
    if (savedUser) setUserInfo(JSON.parse(savedUser));
    handleOidcCallback();
    setTimeout(() => setShowWelcome(false), 2000);
  }, []);

  useEffect(() => {
    // Immediate scroll for new messages
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "start",
    });

    // Debounced smooth scroll for updates
    advancedScrollToBottom();
  }, [messages, advancedScrollToBottom]);

  const markdownToHTML = (text) => {
    return text
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/  \n/g, "<br>");
  };

  const handleOidcCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("oidc_state");

    if (code && state && state === savedState) {
      try {
        const tokenData = await exchangeCodeForToken(code);
        const userInfo = await getUserInfo(tokenData.access_token);
        setUserInfo(userInfo);
        sessionStorage.setItem("userInfo", JSON.stringify(userInfo));
        sessionStorage.setItem("accessToken", tokenData.access_token);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("OAuth error:", error);
      }
    }
  };

  const showAlert = (message) => {
    const alert = document.createElement("div");
    alert.className = "coming-soon-alert feedback-alert show";
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 2000);
  };

  const handleFeedback = (message, feedbackType) => {
    showAlert("Thank you for your feedback!");
    console.log("Feedback:", feedbackType, message);
  };

  const exchangeCodeForToken = async (code) => {
    const codeVerifier = sessionStorage.getItem("code_verifier");
    const params = new URLSearchParams();
    params.append("client_id", OIDC_CONFIG.clientId);
    params.append("client_secret", OIDC_CONFIG.clientSecret);
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", OIDC_CONFIG.redirectUri);
    params.append("code_verifier", codeVerifier);

    const response = await fetch(OIDC_CONFIG.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    return await response.json();
  };

  const getUserInfo = async (token) => {
    const response = await fetch(OIDC_CONFIG.userInfoEndpoint, {
      headers: {
        Authorization: "Bearer",
      },
    });
    return await response.json();
  };

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let currentContent = "";

    try {
      // Add user message immediately
      setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
      setInput("");
      setIsLoading(true);

      // Simulated API call
      const response = await fetch(
        `${DOMAIN}/discover/v1alpha/data-discovery/prompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: userInfo
              ? `Bearer ${sessionStorage.getItem("accessToken")}`
              : "Bearer ",
          },
          body: JSON.stringify({
            query: userMessage,
            ...(session && { session }),
          }),
          signal: controller.signal,
        }
      );

      const data = await response.json();

      // Add initial bot message
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "",
          isStreaming: true,
          references: [],
          relatedQuestions: [],
        },
      ]);

      const fullResponse = data.answer.answerText;
      const baseSpeed = 10; // 40 characters per second
      let CHUNK_SIZE = Math.floor(
        Math.min(Math.max(fullResponse.length * 0.05, 5), 80)
      );

      let CHUNK_DELAY = Math.floor((100 / baseSpeed) * CHUNK_SIZE);

      // Adjust for very long responses
      if (fullResponse.length > 1000) {
        CHUNK_SIZE = Math.min(80, Math.floor(fullResponse.length * 0.03));
        CHUNK_DELAY = 50;
      }

      console.log(`Streaming ${CHUNK_SIZE} chars every ${CHUNK_DELAY}ms`);

      const streamChunk = async (index = 0) => {
        if (controller.signal.aborted) return;

        // Dynamic chunk sizing for final portion
        const remaining = fullResponse.length - index;
        let dynamicChunkSize = CHUNK_SIZE;
        if (remaining < 100) {
          dynamicChunkSize = Math.max(2, Math.floor(remaining * 0.3));
        }

        currentContent = fullResponse.substring(0, index + dynamicChunkSize);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: currentContent },
          ];
        });

        const newIndex = index + dynamicChunkSize;
        if (newIndex < fullResponse.length) {
          // Dynamic speed adjustment
          let delay = CHUNK_DELAY;
          if (remaining < 200) {
            delay = Math.max(20, delay * 0.7);
          }

          // Add natural typing variation
          delay *= 1 - 0.2 + Math.random() * 0.4;

          await new Promise((resolve) => setTimeout(resolve, delay));
          await streamChunk(newIndex);
        }
      };

      await streamChunk(0);

      // Finalize successful response
      if (!controller.signal.aborted) {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: fullResponse,
              isStreaming: false,
              relatedQuestions: data.answer.relatedQuestions || [],
              references: data.answer.references || [],
            },
          ];
        });

        if (data.session?.name) {
          setSession(data.session.name);
          sessionStorage.setItem("chatSession", data.session.name);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: `${currentContent}\n\n**Stopped by user**`,
              isStreaming: false,
            },
          ];
        });
      } else {
        console.error("API Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: "Sorry, there was an error processing your request.",
            references: [],
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <div className="header-left">
            <img src={logo} alt="Logo" className="header-logo" />
          </div>
          <div className="header-center">
            <h2 className="header-title"> discover</h2>
          </div>
          <div className="header-right">User name</div>
        </div>
      </header>
      <div className="chat-container">
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((msg, i) => (
            <Message
              key={i}
              message={msg}
              markdownToHTML={markdownToHTML}
              handleFeedback={handleFeedback}
              setInput={setInput}
            />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} className="messages-end-anchor" />
        </div>
      </div>

      <div
        className={`input-container ${messages.length === 0 ? "initial" : ""}`}
      >
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className="message-input"
            rows="2"
            disabled={isLoading}
          />
          {isLoading ? (
            <button className="stop-button" onClick={handleStop}>
              Stop
              <span className="stop-icon"></span>
            </button>
          ) : (
            <button
              className="send-button"
              onClick={handleSend}
              disabled={isLoading}
            >
              Send
            </button>
          )}
        </div>
      </div>

      <footer>
        <p>© 2024 Chat Interface. All rights reserved.</p>
      </footer>
    </div>
  );
}

const Message = ({ message, markdownToHTML, handleFeedback, setInput }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showAlert("Copied!");
  };

  const showAlert = (message) => {
    const alert = document.createElement("div");
    alert.className = "coming-soon-alert show";
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 1000);
  };

  return (
    <div
      className={`message ${message.type}-message ${
        message.validation ? "validation-message" : ""
      }`}
    >
      {message.validation ? (
        <div
          className="validation-text"
          dangerouslySetInnerHTML={{ __html: markdownToHTML(message.content) }}
        />
      ) : (
        <>
          {message.type === "bot" && message.isStreaming ? (
            <div className="streaming-message">{message.content}</div>
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html:
                  message.type === "bot"
                    ? markdownToHTML(message.content)
                    : message.content,
              }}
            />
          )}

          {message.type === "bot" && !message.isStreaming && (
            <div className="action-container">
              <div className="feedback-buttons">
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(message.content)}
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"
                    />
                  </svg>
                </button>
                <button
                  className="feedback-button"
                  onClick={() => handleFeedback(message, "positive")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.1318 2.50389C12.3321 2.15338 12.7235 1.95768 13.124 2.00775L13.5778 2.06447C16.0449 2.37286 17.636 4.83353 16.9048 7.20993L16.354 8.99999H17.0722C19.7097 8.99999 21.6253 11.5079 20.9313 14.0525L19.5677 19.0525C19.0931 20.7927 17.5124 22 15.7086 22H6C4.34315 22 3 20.6568 3 19V12C3 10.3431 4.34315 8.99999 6 8.99999H8C8.25952 8.99999 8.49914 8.86094 8.6279 8.63561L12.1318 2.50389ZM10 20H15.7086C16.6105 20 17.4008 19.3964 17.6381 18.5262L19.0018 13.5262C19.3488 12.2539 18.391 11 17.0722 11H15C14.6827 11 14.3841 10.8494 14.1956 10.5941C14.0071 10.3388 13.9509 10.0092 14.0442 9.70591L14.9932 6.62175C15.3384 5.49984 14.6484 4.34036 13.5319 4.08468L10.3644 9.62789C10.0522 10.1742 9.56691 10.5859 9 10.8098V19C9 19.5523 9.44772 20 10 20ZM7 11V19C7 19.3506 7.06015 19.6872 7.17071 20H6C5.44772 20 5 19.5523 5 19V12C5 11.4477 5.44772 11 6 11H7Z"
                    />
                  </svg>
                </button>
                <button
                  className="feedback-button"
                  onClick={() => handleFeedback(message, "negative")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M11.8727 21.4961C11.6725 21.8466 11.2811 22.0423 10.8805 21.9922L10.4267 21.9355C7.95958 21.6271 6.36855 19.1665 7.09975 16.7901L7.65054 15H6.93226C4.29476 15 2.37923 12.4921 3.0732 9.94753L4.43684 4.94753C4.91145 3.20728 6.49209 2 8.29589 2H18.0045C19.6614 2 21.0045 3.34315 21.0045 5V12C21.0045 13.6569 19.6614 15 18.0045 15H16.0045C15.745 15 15.5054 15.1391 15.3766 15.3644L11.8727 21.4961ZM14.0045 4H8.29589C7.39399 4 6.60367 4.60364 6.36637 5.47376L5.00273 10.4738C4.65574 11.746 5.61351 13 6.93226 13H9.00451C9.32185 13 9.62036 13.1506 9.8089 13.4059C9.99743 13.6612 10.0536 13.9908 9.96028 14.2941L9.01131 17.3782C8.6661 18.5002 9.35608 19.6596 10.4726 19.9153L13.6401 14.3721C13.9523 13.8258 14.4376 13.4141 15.0045 13.1902V5C15.0045 4.44772 14.5568 4 14.0045 4ZM17.0045 13V5C17.0045 4.64937 16.9444 4.31278 16.8338 4H18.0045C18.5568 4 19.0045 4.44772 19.0045 5V12C19.0045 12.5523 18.5568 13 18.0045 13H17.0045Z"
                    />
                  </svg>
                </button>
              </div>

              {message.relatedQuestions?.length > 0 && (
                <div className="related-questions">
                  {message.relatedQuestions.map((question, i) => (
                    <button
                      key={i}
                      className="related-question-btn"
                      onClick={() => setInput(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {message.references?.length > 0 && (
                <References references={message.references} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const References = ({ references }) => {
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);

  const filteredRefs = references.filter(
    (ref) => ref.chunkInfo.relevanceScore >= 0.5
  );

  return (
    <div className="references-section">
      <div
        className="section-header"
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        References ({filteredRefs.length})
        <svg
          className={`section-chevron ${isSectionExpanded ? "expanded" : ""}`}
          viewBox="0 0 24 24"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </div>

      <div className={`section-content ${isSectionExpanded ? "expanded" : ""}`}>
        {filteredRefs.map((ref, i) => {
          const metadata = ref.chunkInfo.documentMetadata;
          const uniqueId = `${metadata.uri}-${ref.chunkInfo.relevanceScore}-${i}`;
          const isItemExpanded = expandedItemId === uniqueId;

          return (
            <div key={uniqueId} className="reference-item">
              <div
                className="reference-header"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedItemId(isItemExpanded ? null : uniqueId);
                }}
              >
                <div className="header-text">
                  <small>{metadata.title}&nbsp;</small>
                  <small>
                    Relevance: {Math.round(ref.chunkInfo.relevanceScore * 100)}%
                  </small>
                </div>
                <svg
                  className={`chevron-icon ${isItemExpanded ? "expanded" : ""}`}
                  viewBox="0 0 24 24"
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </div>
              <div
                className={`reference-content ${
                  isItemExpanded ? "expanded" : ""
                }`}
              >
                <div className="chunk-info">
                  {ref.chunkInfo.content.split(" ").slice(0, 40).join(" ")}...
                </div>
                <a
                  href={metadata.uri}
                  className="doc-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Source Document
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LoadingDots = () => (
  <div className="loading-dots">
    <span></span>
    <span></span>
    <span></span>
  </div>
);

export default App;
