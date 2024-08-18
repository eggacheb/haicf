import tokenManager from './token-manager.ts';
import logger from './logger.ts';
import redis from './redis-client.ts';

interface SessionData {
    token: string;
    tokenIndex: number;
    lastAccess: number;
}

const SESSION_KEY_PREFIX = 'hailuofree:session:';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

class SessionManager {
    private sessions: Map<string, SessionData> = new Map();

    async getToken(sessionId: string, env: any): Promise<{ token: string; tokenIndex: number }> {
        let sessionData = this.sessions.get(sessionId);
        
        if (sessionData) {
            sessionData.lastAccess = Date.now();
            logger.info(`Using existing token for session ${sessionId}: ${this.maskToken(sessionData.token)} (Token ${sessionData.tokenIndex + 1}/${tokenManager.getTokenCount()})`);
            return { token: sessionData.token, tokenIndex: sessionData.tokenIndex };
        }
        
        // 如果内存中没有，尝试从KV加载
        const sessionKey = SESSION_KEY_PREFIX + sessionId;
        const sessionDataString = await redis.get(sessionKey, env);
        
        if (sessionDataString) {
            sessionData = JSON.parse(sessionDataString);
            sessionData.lastAccess = Date.now();
            this.sessions.set(sessionId, sessionData);
            await redis.set(sessionKey, JSON.stringify(sessionData), env);
            logger.info(`Loaded session ${sessionId} from KV: ${this.maskToken(sessionData.token)} (Token ${sessionData.tokenIndex + 1}/${tokenManager.getTokenCount()})`);
            return { token: sessionData.token, tokenIndex: sessionData.tokenIndex };
        }
        
        // 如果session不存在，创建一个新的
        const { token, index } = tokenManager.getNextToken();
        sessionData = { token, tokenIndex: index, lastAccess: Date.now() };
        this.sessions.set(sessionId, sessionData);
        await redis.set(sessionKey, JSON.stringify(sessionData), env);
        logger.info(`Created new session ${sessionId} with token: ${this.maskToken(token)} (Token ${index + 1}/${tokenManager.getTokenCount()})`);
        return { token, tokenIndex: index };
    }

    async cleanupSessions(env: any) {
        const now = Date.now();
        
        // 清理内存中的过期会话
        for (const [sessionId, sessionData] of this.sessions.entries()) {
            if (now - sessionData.lastAccess > SESSION_TIMEOUT) {
                this.sessions.delete(sessionId);
                logger.info(`Cleaned up session ${sessionId} from memory`);
            }
        }
        
        // 清理KV中的过期会话
        const allKeys = await redis.smembers(SESSION_KEY_PREFIX, env);
        for (const key of allKeys) {
            const sessionDataString = await redis.get(key, env);
            if (sessionDataString) {
                const sessionData: SessionData = JSON.parse(sessionDataString);
                if (now - sessionData.lastAccess > SESSION_TIMEOUT) {
                    await redis.del(key, env);
                    logger.info(`Cleaned up session ${key.replace(SESSION_KEY_PREFIX, '')} from KV`);
                }
            }
        }
    }

    async updateSessionTokens(env: any) {
        // 更新内存中的会话
        for (const [sessionId, sessionData] of this.sessions.entries()) {
            const { token, index } = tokenManager.getNextToken();
            sessionData.token = token;
            sessionData.tokenIndex = index;
            logger.info(`Updated token for session ${sessionId} in memory: ${this.maskToken(token)} (Token ${index + 1}/${tokenManager.getTokenCount()})`);
        }
        
        // 更新KV中的会话
        const allKeys = await redis.smembers(SESSION_KEY_PREFIX, env);
        for (const key of allKeys) {
            const sessionDataString = await redis.get(key, env);
            if (sessionDataString) {
                const sessionData: SessionData = JSON.parse(sessionDataString);
                const { token, index } = tokenManager.getNextToken();
                sessionData.token = token;
                sessionData.tokenIndex = index;
                await redis.set(key, JSON.stringify(sessionData), env);
                logger.info(`Updated token for session ${key.replace(SESSION_KEY_PREFIX, '')} in KV: ${this.maskToken(token)} (Token ${index + 1}/${tokenManager.getTokenCount()})`);
            }
        }
    }

    private maskToken(token: string): string {
        return token.slice(0, 4) + '****' + token.slice(-4);
    }
}

export default new SessionManager();
