import { OIDC_CONFIG } from "./config.js";
import { generateRandomString } from "./utils.js";

export function initAuth() {
  document
    .querySelector(".sign-in-btn")
    .addEventListener("click", handleSignIn);
  handleOidcCallback();
  checkExistingSession();
}

async function handleSignIn(e) {
  e.preventDefault();

  if (sessionStorage.getItem("accessToken")) {
    return;
  }

  const state = generateRandomString(40);
  const codeVerifier = generateRandomString(128);

  sessionStorage.setItem("oidc_state", state);
  sessionStorage.setItem("code_verifier", codeVerifier);

  const authUrl = new URL(OIDC_CONFIG.authEndpoint);
  authUrl.searchParams.append("client_id", OIDC_CONFIG.clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", OIDC_CONFIG.scope);
  authUrl.searchParams.append("redirect_uri", OIDC_CONFIG.redirectUri);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", codeVerifier);

  window.location.href = authUrl.toString();
}

async function handleOidcCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const error = urlParams.get("error");

  if (error) {
    console.error("OIDC Error:", error, urlParams.get("error_description"));
    return;
  }

  if (code && state) {
    try {
      const savedState = sessionStorage.getItem("oidc_state");
      if (state !== savedState) {
        throw new Error("Invalid state parameter");
      }

      const tokenResponse = await exchangeCodeForToken(code);
      if (tokenResponse?.access_token) {
        sessionStorage.setItem("accessToken", tokenResponse.access_token);
        const userInfo = await getUserInfo(tokenResponse.access_token);

        if (userInfo) {
          sessionStorage.setItem("userInfo", JSON.stringify(userInfo));
          updateUIAfterLogin(userInfo);
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showAuthError(error.message);
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

async function exchangeCodeForToken(code) {
  const codeVerifier = sessionStorage.getItem("code_verifier");

  const params = new URLSearchParams();
  params.append("client_id", OIDC_CONFIG.clientId);
  params.append("client_secret", OIDC_CONFIG.clientSecret);
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", OIDC_CONFIG.redirectUri);
  params.append("code_verifier", codeVerifier);

  try {
    const response = await fetch(OIDC_CONFIG.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}

async function getUserInfo(accessToken) {
  try {
    const response = await fetch(OIDC_CONFIG.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`User info request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("User info error:", error);
    throw error;
  }
}

function updateUIAfterLogin(userInfo) {
  const headerRight = document.querySelector(".header-right");
  headerRight.innerHTML = `
        <div class="user-info-container">
            <span class="user-email">${userInfo.email}</span>
            <button class="sign-in-btn" onclick="handleSignOut()">Sign Out</button>
        </div>
    `;
}

function handleSignOut() {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("userInfo");
  sessionStorage.removeItem("oidc_state");
  sessionStorage.removeItem("code_verifier");
  window.location.reload();
}

function checkExistingSession() {
  const userInfo = sessionStorage.getItem("userInfo");
  if (userInfo) {
    updateUIAfterLogin(JSON.parse(userInfo));
  }
}

function showAuthError(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "auth-alert error";
  alertDiv.textContent = `Authentication Error: ${message}`;

  document.body.prepend(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

// Make sign-out available globally for HTML onclick
window.handleSignOut = handleSignOut;
