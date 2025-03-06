export const DOMAIN = atob(
  "aHR0cHM6Ly90ZXN0LmNvbnZlcnNhdGlvbi5nb2VuZ2VuLmNvbQ=="
);

export const OIDC_CONFIG = {
  clientId: "YOUR_CLIENT_ID",
  redirectUri: window.location.origin,
  authEndpoint: "https://oauth.id.jumpcloud.com/oauth2/auth",
  tokenEndpoint: "https://oauth.id.jumpcloud.com/oauth2/token",
  userInfoEndpoint: "https://oauth.id.jumpcloud.com/userinfo",
  scope: "openid email profile",
  clientSecret: "YOUR_CLIENT_SECRET",
};

export const SHORT_MESSAGES = [
  "hey",
  "hello",
  "hi",
  "hola",
  "hey there",
  "hi there",
];
export const VALIDATION_RESPONSE = {
  type: "bot",
  validation: true,
  content:
    "🌟 **Hello!**\nI'd be happy to help! Could you please elaborate on your question so I can provide the most helpful response?",
};
