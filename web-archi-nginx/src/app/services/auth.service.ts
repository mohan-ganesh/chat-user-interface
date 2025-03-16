import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { BehaviorSubject } from 'rxjs';

interface OIDCConfig {
  clientId: string;
  redirectUri: string;
  authEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  scope: string;
  clientSecret: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly OIDC_CONFIG: OIDCConfig = environment.oidcConfig;
  private accessToken$ = new BehaviorSubject<string | null>(null);
  private userInfo$ = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {
    this.initializeAuthState();
  }

  private initializeAuthState() {
    const token = sessionStorage.getItem('accessToken');
    const userInfo = sessionStorage.getItem('userInfo');

    if (token) this.accessToken$.next(token);
    if (userInfo) this.userInfo$.next(JSON.parse(userInfo));
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken$.value;
  }

  get currentUser() {
    return this.userInfo$.value;
  }

  generateRandomString(length: number): string {
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(36).padStart(2, '0')).join('').slice(0, length);
  }

  signIn(): void {
    const state = this.generateRandomString(40);
    const codeVerifier = this.generateRandomString(128);

    sessionStorage.setItem('oidc_state', state);
    sessionStorage.setItem('code_verifier', codeVerifier);

    const authUrl = new URL(this.OIDC_CONFIG.authEndpoint);
    authUrl.searchParams.append('client_id', this.OIDC_CONFIG.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', this.OIDC_CONFIG.scope);
    authUrl.searchParams.append('redirect_uri', this.OIDC_CONFIG.redirectUri);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeVerifier); // In production, use proper PKCE

    window.location.href = authUrl.toString();
  }

  async handleCallback(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      console.error('OIDC Error:', error, params.get('error_description'));
      return false;
    }

    if (!code || !state) return false;

    const savedState = sessionStorage.getItem('oidc_state');
    if (state !== savedState) {
      console.error('Invalid state parameter');
      return false;
    }

    try {
      const tokenResponse = await this.exchangeCodeForToken(code);
      if (!tokenResponse?.access_token) return false;

      sessionStorage.setItem('accessToken', tokenResponse.access_token);
      this.accessToken$.next(tokenResponse.access_token);

      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      if (userInfo) {
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        this.userInfo$.next(userInfo);
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  private async exchangeCodeForToken(code: string): Promise<any> {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    const params = new URLSearchParams({
      client_id: this.OIDC_CONFIG.clientId,
      client_secret: this.OIDC_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.OIDC_CONFIG.redirectUri,
      code_verifier: codeVerifier || ''
    });

    return this.http.post(this.OIDC_CONFIG.tokenEndpoint, params.toString(), {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    }).toPromise();
  }

  private async getUserInfo(accessToken: string): Promise<any> {
    return this.http.get(this.OIDC_CONFIG.userInfoEndpoint, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      })
    }).toPromise();
  }

  signOut(): void {
    sessionStorage.clear();
    this.accessToken$.next(null);
    this.userInfo$.next(null);
    window.location.reload();
  }
}