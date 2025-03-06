/**
 * Converts basic markdown syntax to HTML
 * @param {string} markdown - The markdown text to convert
 * @returns {string} Formatted HTML
 */
export function markdownToHTML(markdown) {
  if (!markdown) return "";

  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
    .replace(/\n/g, "<br>"); // New lines
}

/**
 * Generates a secure random string for cryptographic purposes
 * @param {number} length - Desired string length
 * @returns {string} Random hexadecimal string
 */
export function generateRandomString(length) {
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(
    array,
    (dec) => ("0" + dec.toString(16)).slice(-2) // Convert to hex and pad
  )
    .join("")
    .substring(0, length);
}

/**
 * Shows a temporary UI alert message
 * @param {string} message - The message to display
 * @param {string} type - 'info' (default) or 'error'
 * @param {number} duration - Display time in milliseconds (default: 3000)
 */
export function showAlert(message, type = "info", duration = 3000) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert ${type}-alert`;
  alertDiv.textContent = message;

  document.body.prepend(alertDiv);
  setTimeout(() => alertDiv.remove(), duration);
}

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Debounce function for limiting frequent calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Formats timestamp to locale string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted local date/time
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
