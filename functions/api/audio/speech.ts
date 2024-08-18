import { audio } from '../../../src/api/controllers/audio';
import { sessionManager } from '../../../src/lib/session-manager';
import { tokenManager } from '../../../src/lib/token-manager';
import { REPLACE_AUDIO_MODEL, VOICE_TO_MODEL_INDEX } from '../../../src/api/consts/model-map';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 验证 API 密钥
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== env.API_KEY) {
    return new Response('Invalid API key', { status: 401 });
  }

  try {
    const { model, input, voice, conversation_id } = await request.json();

    if (!input || typeof input !== 'string') {
      return new Response('Invalid input', { status: 400 });
    }

    if (!voice || typeof voice !== 'string') {
      return new Response('Invalid voice', { status: 400 });
    }

    // 使用 conversation_id 获取对应的token
    let sessionId = conversation_id || `temp_${Date.now()}`;
    let { token, tokenIndex } = await sessionManager.getToken(sessionId, env);

    console.log(`Speech request for session ${sessionId} using token ${tokenIndex + 1}/${await tokenManager.getTokenCount(env)}`);

    let mappedVoice = voice;
    if (voice in VOICE_TO_MODEL_INDEX) {
      mappedVoice = REPLACE_AUDIO_MODEL[VOICE_TO_MODEL_INDEX[voice]] || "male-botong";
      console.log(`使用voice映射为: ${mappedVoice}`);
    }

    const audioStream = await audio.createSpeech(model, input, mappedVoice, token, env);

    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error in speech API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
