import tokenManager from '../../src/lib/token-manager';
import sessionManager from '../../src/lib/session-manager';
import logger from '../../src/lib/logger';

export async function onSchedule(event) {
  const { env } = event;
  
  // 初始化 TokenManager
  await tokenManager.initialize(env);
  
  try {
    // 清理过期会话
    await sessionManager.cleanupSessions(env);
    
    logger.info('Sessions cleaned up successfully');
    return new Response('Sessions cleaned up successfully');
  } catch (error) {
    logger.error('Error in session cleanup:', error);
    return new Response('Error cleaning up sessions', { status: 500 });
  }
}
