import _ from 'lodash';
import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import audio from '@/api/controllers/audio.ts';
import modelMap from "../consts/model-map.ts";
import environment from "@/lib/environment.ts";
import config from '@/lib/config.ts';
import sessionManager from '@/lib/session-manager.ts';
import tokenManager from '@/lib/token-manager.ts';
import logger from "@/lib/logger.ts";

const REPLACE_AUDIO_MODEL_ENV = (
  environment.envVars["REPLACE_AUDIO_MODEL"] || ""
)
  .split(",")
  .map((v) => v.trim());
const VOICE_TO_MODEL_INDEX = Object.keys(modelMap["tts-1"]).reduce(
  (obj, key, i) => {
    obj[key] = i;
    return obj;
  },
  {}
);
const REPLACE_AUDIO_MODEL = Object.values(modelMap["tts-1"]).map(
  (v, i) => REPLACE_AUDIO_MODEL_ENV[i] || v
);

export default {
  prefix: "/v1/audio",

  post: {
    "/speech": async (request: Request) => {
      request
        .validate("body.input", _.isString)
        .validate("body.voice", _.isString)
        .validate("body.conversation_id", v => _.isUndefined(v) || _.isString(v))
        .validate("headers.authorization", _.isString);

      // 验证API密钥
      const apiKey = request.headers.authorization.replace('Bearer ', '');
      if (apiKey !== config.apiKey) {
        throw new Error('Invalid API key');
      }

      let { model, input, voice, conversation_id } = request.body;

      // 使用 conversation_id 获取对应的token
      let sessionId = conversation_id || `temp_${Date.now()}`;
      let { token, tokenIndex } = sessionManager.getToken(sessionId);

      logger.info(`Speech request for session ${sessionId} using token ${tokenIndex + 1}/${tokenManager.getTokenCount()}`);

      if (voice in VOICE_TO_MODEL_INDEX) {
        voice =
          REPLACE_AUDIO_MODEL[VOICE_TO_MODEL_INDEX[voice]] || "male-botong";
        logger.info(`使用voice映射为: ${voice}`);
      }
      const stream = await audio.createSpeech(model, input, voice, token);
      return new Response(stream, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    },

    "/transcriptions": async (request: Request) => {
      request
        .validate("body.model", _.isString)
        .validate("body.response_format", v => _.isUndefined(v) || _.isString(v))
        .validate("body.conversation_id", v => _.isUndefined(v) || _.isString(v))
        .validate("headers.authorization", _.isString);
      
      // 验证API密钥
      const apiKey = request.headers.authorization.replace('Bearer ', '');
      if (apiKey !== config.apiKey) {
        throw new Error('Invalid API key');
      }

      const { model, response_format: responseFormat = 'json', conversation_id } = request.body;

      // 使用 conversation_id 获取对应的token
      let sessionId = conversation_id || `temp_${Date.now()}`;
      let { token, tokenIndex } = sessionManager.getToken(sessionId);

      logger.info(`Transcription request for session ${sessionId} using token ${tokenIndex + 1}/${tokenManager.getTokenCount()}`);

      if(!request.files['file'] && !request.body["file"])
        throw new Error('File field is not set');
      let tmpFilePath;
      if(request.files['file']) {
        const file = request.files['file'];
        if(!['audio/mp3', 'audio/mpeg', 'audio/x-wav', 'audio/wave', 'audio/mp4a-latm', 'audio/flac', 'audio/ogg', 'audio/webm'].includes(file.mimetype))
          throw new Error(`File MIME type ${file.mimetype} is unsupported`);
        tmpFilePath = file.filepath;
      }
      else
        throw new Error('File field is not set');
      
      const text = await audio.createTranscriptions(model, tmpFilePath, token);
      return new Response(responseFormat == 'json' ? { text } : text);
    },
  },
};
