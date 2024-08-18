import { audio } from '../../../src/api/controllers/audio';
import { sessionManager } from '../../../src/lib/session-manager';
import { tokenManager } from '../../../src/lib/token-manager';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 验证 API 密钥
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== env.API_KEY) {
    return new Response('Invalid API key', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const model = formData.get('model');
    const responseFormat = formData.get('response_format') || 'json';
    const conversationId = formData.get('conversation_id');
    const file = formData.get('file');

    if (!model || typeof model !== 'string') {
      return new Response('Invalid model', { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return new Response('Invalid file', { status: 400 });
    }

    // 使用 conversation_id 获取对应的token
    let sessionId = conversationId || `temp_${Date.now()}`;
    let { token, tokenIndex } = await sessionManager.getToken(sessionId, env);

    console.log(`Transcription request for session ${sessionId} using token ${tokenIndex + 1}/${await tokenManager.getTokenCount(env)}`);

    // 由于 Cloudflare Workers 不支持直接的文件系统操作，我们需要将文件内容传递给 createTranscriptions 函数
    const fileBuffer = await file.arrayBuffer();
    const text = await audio.createTranscriptions(model, fileBuffer, token, env);

    if (responseFormat === 'json') {
      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error) {
    console.error('Error in transcriptions API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
