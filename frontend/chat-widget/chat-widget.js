/**
 * Mortgage Freedom Calculator - Chat Widget
 * A standalone, embeddable chat component for mortgage advice
 */
(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    // API endpoint - update this after deployment
    apiUrl: 'https://mortgage-mcp-server.YOUR_SUBDOMAIN.workers.dev/api/chat',
    maxMessageLength: 2000,
    maxHistoryLength: 10,
  };

  // Quick action suggestions
  const QUICK_ACTIONS = [
    'What are current rates?',
    'How do extra payments work?',
    'Should I refinance?',
  ];

  // State
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];

  // DOM Elements
  let widget, toggleBtn, chatWindow, messagesContainer, inputField, sendBtn;

  // Icons
  const ICONS = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    advisor: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
  };

  /**
   * Initialize the chat widget
   */
  function init() {
    createWidget();
    attachEventListeners();
  }

  /**
   * Create the widget DOM structure
   */
  function createWidget() {
    widget = document.createElement('div');
    widget.className = 'mfc-chat-widget';
    widget.innerHTML = `
      <button class="mfc-chat-toggle" aria-label="Open chat">
        ${ICONS.chat}
      </button>
      <div class="mfc-chat-window">
        <div class="mfc-chat-header">
          <div class="mfc-chat-avatar">
            ${ICONS.advisor}
          </div>
          <div class="mfc-chat-title">
            <h3>Mortgage Advisor</h3>
            <p>Ask about rates, payments & savings</p>
          </div>
          <button class="mfc-chat-close" aria-label="Close chat">
            ${ICONS.close}
          </button>
        </div>
        <div class="mfc-chat-messages">
          <div class="mfc-welcome">
            <h4>Welcome!</h4>
            <p>I can help you understand mortgage rates, calculate savings from extra payments, and explore refinancing options.</p>
            <div class="mfc-quick-actions">
              ${QUICK_ACTIONS.map(action => `
                <button class="mfc-quick-action">${action}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="mfc-chat-input-area">
          <div class="mfc-chat-input-wrapper">
            <textarea
              class="mfc-chat-input"
              placeholder="Ask about mortgage rates, payments..."
              rows="1"
            ></textarea>
            <button class="mfc-chat-send" aria-label="Send message" disabled>
              ${ICONS.send}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Cache DOM references
    toggleBtn = widget.querySelector('.mfc-chat-toggle');
    chatWindow = widget.querySelector('.mfc-chat-window');
    messagesContainer = widget.querySelector('.mfc-chat-messages');
    inputField = widget.querySelector('.mfc-chat-input');
    sendBtn = widget.querySelector('.mfc-chat-send');
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Toggle button
    toggleBtn.addEventListener('click', toggleChat);

    // Close button
    widget.querySelector('.mfc-chat-close').addEventListener('click', closeChat);

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Input field
    inputField.addEventListener('input', handleInput);
    inputField.addEventListener('keydown', handleKeydown);

    // Quick actions
    widget.querySelectorAll('.mfc-quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        inputField.value = btn.textContent;
        handleInput();
        sendMessage();
      });
    });

    // Auto-resize textarea
    inputField.addEventListener('input', autoResize);
  }

  /**
   * Toggle chat open/closed
   */
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('open', isOpen);

    if (isOpen) {
      inputField.focus();
    }
  }

  /**
   * Close chat
   */
  function closeChat() {
    isOpen = false;
    chatWindow.classList.remove('open');
    toggleBtn.classList.remove('open');
  }

  /**
   * Handle input changes
   */
  function handleInput() {
    const hasText = inputField.value.trim().length > 0;
    sendBtn.disabled = !hasText || isLoading;
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        sendMessage();
      }
    }
  }

  /**
   * Auto-resize textarea
   */
  function autoResize() {
    inputField.style.height = 'auto';
    inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
  }

  /**
   * Send a message to the API
   */
  async function sendMessage() {
    const message = inputField.value.trim();
    if (!message || isLoading) return;

    // Clear input
    inputField.value = '';
    inputField.style.height = 'auto';
    sendBtn.disabled = true;

    // Remove welcome message if present
    const welcome = messagesContainer.querySelector('.mfc-welcome');
    if (welcome) {
      welcome.remove();
    }

    // Add user message
    addMessage(message, 'user');

    // Add to history
    conversationHistory.push({ role: 'user', content: message });

    // Show typing indicator
    isLoading = true;
    showTypingIndicator();

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory.slice(-CONFIG.maxHistoryLength),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Remove typing indicator
      hideTypingIndicator();

      // Add assistant response
      addMessage(data.response, 'assistant');

      // Add to history
      conversationHistory.push({ role: 'assistant', content: data.response });

      // Trim history if needed
      if (conversationHistory.length > CONFIG.maxHistoryLength * 2) {
        conversationHistory = conversationHistory.slice(-CONFIG.maxHistoryLength * 2);
      }
    } catch (error) {
      console.error('Chat error:', error);
      hideTypingIndicator();
      showError('Unable to connect. Please try again.');
    } finally {
      isLoading = false;
      handleInput();
    }
  }

  /**
   * Add a message to the chat
   */
  function addMessage(content, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `mfc-message ${role}`;

    // Basic markdown-like formatting for assistant messages
    if (role === 'assistant') {
      content = formatMessage(content);
    } else {
      content = escapeHtml(content);
    }

    messageEl.innerHTML = content;
    messagesContainer.appendChild(messageEl);
    scrollToBottom();
  }

  /**
   * Format message with basic markdown
   */
  function formatMessage(text) {
    // Escape HTML first
    text = escapeHtml(text);

    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Code: `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Line breaks
    text = text.replace(/\n/g, '<br>');

    // Bullet points
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return text;
  }

  /**
   * Escape HTML characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show typing indicator
   */
  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'mfc-typing';
    typing.id = 'mfc-typing-indicator';
    typing.innerHTML = `
      <div class="mfc-typing-dot"></div>
      <div class="mfc-typing-dot"></div>
      <div class="mfc-typing-dot"></div>
    `;
    messagesContainer.appendChild(typing);
    scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  function hideTypingIndicator() {
    const typing = document.getElementById('mfc-typing-indicator');
    if (typing) {
      typing.remove();
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    const error = document.createElement('div');
    error.className = 'mfc-error';
    error.textContent = message;
    messagesContainer.appendChild(error);
    scrollToBottom();

    // Remove after 5 seconds
    setTimeout(() => error.remove(), 5000);
  }

  /**
   * Scroll to bottom of messages
   */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for external control
  window.MortgageChatWidget = {
    open: () => { isOpen = false; toggleChat(); },
    close: closeChat,
    sendMessage: (msg) => {
      inputField.value = msg;
      handleInput();
      sendMessage();
    },
  };
})();
