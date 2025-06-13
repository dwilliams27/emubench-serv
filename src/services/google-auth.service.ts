import { GoogleAuth } from "google-auth-library";

export class GoogleAuthService {
  auth;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }

  async getAccessToken() {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken.token) {
      throw new Error('Failed to retrieve access token from Google Auth');
    }

    return accessToken.token;
  }
}

const googleAuthService = new GoogleAuthService();

export { googleAuthService };
