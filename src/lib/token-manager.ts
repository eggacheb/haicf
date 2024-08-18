import redis from './redis-client';
import logger from './logger';
import sessionManager from './session-manager';
import { refreshToken } from '../api/controllers/token-utils';
import config from './config';

const TOKENS_KEY = 'hailuofree:tokens';

interface RefreshStatus {
  timestamp: string;
  successCount: number;
  failCount: number;
}

class TokenManager {
  private lastRefreshStatus: RefreshStatus | null = null;
  private lastRefreshTime: number = Date.now();
  private cachedTokens: string[] = [];
  private currentTokenIndex: number = 0;
  private initialized: boolean = false;

  constructor() {
    logger.info('TokenManager: Initializing...');
  }

  async initialize(env: any) {
    if (this.initialized) {
      return;
    }
    logger.info('TokenManager: Starting initialization...');
    await this.loadTokens(env);
    this.initialized = true;
    logger.info('TokenManager: Initialization completed');
  }

  private async loadTokens(env: any): Promise<void> {
    try {
      this.cachedTokens = await redis.smembers(TOKENS_KEY, env);
      if (this.cachedTokens.length === 0) {
        throw new Error('No tokens found in KV store');
      }
      logger.info(`TokenManager: Tokens loaded successfully. Total tokens: ${this.cachedTokens.length}`);
    } catch (error) {
      logger.error(`TokenManager: Failed to load tokens from KV store: ${error.message}`);
    }
  }

  private async saveTokens(tokens: string[], env: any): Promise<boolean> {
    try {
      await redis.del(TOKENS_KEY, env);
      if (tokens.length > 0) {
        await redis.sadd(TOKENS_KEY, env, ...tokens);
      }
      this.cachedTokens = tokens;
      logger.info(`TokenManager: Tokens saved successfully. Total tokens: ${tokens.length}`);
      return true;
    } catch (error) {
      logger.error(`TokenManager: Failed to save tokens: ${error.message}`);
      return false;
    }
  }

  getAllTokens(): string {
    return this.cachedTokens.join(',');
  }

  getRefreshStatus(): RefreshStatus | null {
    return this.lastRefreshStatus;
  }

  getNextRefreshTime(): number {
    return this.lastRefreshTime + config.tokenRefreshInterval;
  }

  async refreshTokens(env: any) {
    if (this.cachedTokens.length === 0) {
      logger.warn('TokenManager: No tokens available for refresh');
      return;
    }

    logger.info(`TokenManager: Starting token refresh. Total tokens to refresh: ${this.cachedTokens.length}`);
    let successCount = 0;
    let failCount = 0;

    const newTokens = [];

    for (let i = 0; i < this.cachedTokens.length; i++) {
      try {
        const newToken = await refreshToken(this.cachedTokens[i]);
        if (newToken) {
          newTokens.push(newToken);
          logger.info(`TokenManager: Token ${i + 1} refreshed successfully`);
          successCount++;
        } else {
          logger.warn(`TokenManager: Token ${i + 1} refresh failed, keeping old token`);
          newTokens.push(this.cachedTokens[i]);
          failCount++;
        }
      } catch (error) {
        logger.error(`TokenManager: Failed to refresh token ${i + 1}: ${error.message}`);
        newTokens.push(this.cachedTokens[i]);
        failCount++;
      }
    }

    if (await this.saveTokens(newTokens, env)) {
      await sessionManager.updateSessionTokens(env);
    }

    this.lastRefreshStatus = {
      timestamp: new Date().toISOString(),
      successCount,
      failCount
    };

    this.lastRefreshTime = Date.now();

    logger.info(`TokenManager: Token refresh completed. Success: ${successCount}, Failed: ${failCount}, Total tokens: ${newTokens.length}`);
  }

  async addToken(newToken: string, env: any) {
    if (!this.cachedTokens.includes(newToken)) {
      this.cachedTokens.push(newToken);
      await this.saveTokens(this.cachedTokens, env);
      await sessionManager.updateSessionTokens(env);
      logger.info(`New token added and tokens reloaded`);
    } else {
      logger.warn(`Token already exists, not adding duplicate`);
    }
  }

  async updateToken(oldToken: string, newToken: string, env: any) {
    const index = this.cachedTokens.indexOf(oldToken);
    if (index !== -1) {
      this.cachedTokens[index] = newToken;
      await this.saveTokens(this.cachedTokens, env);
      await sessionManager.updateSessionTokens(env);
      logger.info(`Token updated successfully`);
    } else {
      logger.warn(`Old token not found, adding new token instead`);
      await this.addToken(newToken, env);
    }
  }

  getNextToken(): { token: string; index: number } {
    if (this.cachedTokens.length === 0) {
      throw new Error("No tokens available");
    }
    const token = this.cachedTokens[this.currentTokenIndex];
    const index = this.currentTokenIndex;
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.cachedTokens.length;
    return { token, index };
  }

  getTokenCount(): number {
    return this.cachedTokens.length;
  }
}

export default new TokenManager();
