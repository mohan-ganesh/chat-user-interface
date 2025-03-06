import { initChat } from "./chat.js";
import { initAuth } from "./auth.js";
import { DOMAIN } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize modules
  initChat();
  initAuth();

  // Set header logo
  document.querySelector(
    ".header-logo"
  ).src = `${DOMAIN}/assets/engen-fullcolor-horizontal.png`;
});
