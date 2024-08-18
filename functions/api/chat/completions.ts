import tokenManager from '../../../src/lib/token-manager';
import sessionManager from '../../../src/lib/session-manager';
import { chat } from '../../../src/api/controllers/chat';
import config from '../../../src/lib/config';
import logger from '../../../src/lib/logger';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 验证 API 密钥
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== config.apiKey) {
    return new Response('Invalid API key', { status: 401 });
  }

  // 初始化 TokenManager
  await tokenManager.initialize(env);

  try {
    const { model, conversation_id: convId, messages, stream } = await request.json();

    let sessionId = convId || `temp_${Date.now()}`;
    let { token, tokenIndex } = await sessionManager.getToken(sessionId, env);

    logger.info(`Chat completion request for session ${sessionId} using token ${tokenIndex + 1}/${tokenManager.getTokenCount()}`);

    if (stream) {
      const streamResponse = await chat.createCompletionStream(model, messages, token, sessionId);
      return new Response(streamResponse, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    } else {
      const completion = await chat.createCompletion(model, messages, token, sessionId);
      return new Response(JSON.stringify(completion), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    logger.error('Error in chat completion:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
