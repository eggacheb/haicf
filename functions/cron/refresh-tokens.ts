import tokenManager from '../../src/lib/token-manager';
import logger from '../../src/lib/logger';

export async function onSchedule(event) {
  const { env } = event;
  
  // 初始化 TokenManager
  await tokenManager.initialize(env);
  
  try {
    // 刷新 tokens
    await tokenManager.refreshTokens(env);
    
    logger.info('Tokens refreshed successfully');
    return new Response('Tokens refreshed successfully');
  } catch (error) {
    logger.error('Error in token refresh:', error);
    return new Response('Error refreshing tokens', { status: 500 });
  }
}
