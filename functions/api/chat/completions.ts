import { chat } from '../../../src/api/controllers/chat';
import { sessionManager } from '../../../src/lib/session-manager';
import { tokenManager } from '../../../src/lib/token-manager';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 验证 API 密钥
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== env.API_KEY) {
    return new Response('Invalid API key', { status: 401 });
  }

  const { model, conversation_id: convId, messages, stream } = await request.json();

  let sessionId = convId || `temp_${Date.now()}`;
  let { token, tokenIndex } = await sessionManager.getToken(sessionId);

  console.log(`Chat completion request for session ${sessionId} using token ${tokenIndex + 1}/${await tokenManager.getTokenCount()}`);

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
}
