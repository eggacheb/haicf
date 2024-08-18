import tokenManager from '../../src/lib/token-manager';
import { refreshToken } from '../../src/api/controllers/token-utils';
import config from '../../src/lib/config';
import logger from '../../src/lib/logger';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 验证API密钥
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (apiKey !== config.apiKey) {
      return new Response('Invalid API key', { status: 401 });
    }

    // 初始化 TokenManager
    await tokenManager.initialize(env);

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return new Response('Token is required and must be a string', { status: 400 });
    }

    // 尝试刷新token
    let newToken: string | null = null;
    try {
      newToken = await refreshToken(token);
    } catch (error) {
      logger.error(`Failed to refresh token: ${error.message}`);
      return new Response('Failed to refresh token. The provided token may be invalid or expired.', { status: 500 });
    }

    if (newToken) {
      // 如果刷新成功，更新token
      await tokenManager.updateToken(token, newToken, env);
      return new Response(JSON.stringify({
        message: 'Token更新成功',
        tokenCount: tokenManager.getTokenCount(),
        newToken: newToken
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // 如果刷新失败，返回错误
      return new Response('Failed to refresh token. The provided token may be invalid or expired.', { status: 500 });
    }
  } catch (error) {
    logger.error(`Error in /token route: ${error.message}`);
    return new Response('An unexpected error occurred', { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // 验证API密钥
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (apiKey !== config.apiKey) {
      return new Response('Invalid API key', { status: 401 });
    }

    // 初始化 TokenManager
    await tokenManager.initialize(env);

    await tokenManager.refreshTokens(env);
    const status = tokenManager.getRefreshStatus();

    return new Response(JSON.stringify({
      message: '刷新成功',
      tokenCount: tokenManager.getTokenCount(),
      status
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error(`Error in /token/refresh route: ${error.message}`);
    return new Response('An unexpected error occurred', { status: 500 });
  }
}
