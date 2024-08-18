import { Router } from 'itty-router';
import config from './lib/config';
import tokenManager from './lib/token-manager';
import logger from './lib/logger';

const router = Router();

// 初始化函数
async function initialize(env: any) {
  config.initialize(env);
  await tokenManager.initialize(env);
  logger.info('Application initialized');
}

// 错误处理中间件
const errorHandler = (error: any) => {
  logger.error('Unhandled error:', error);
  return new Response('Internal Server Error', { status: 500 });
};

// 添加通用路由
router.get('/', async (request, env) => {
  const content = await env.HAILUO_KV.get('welcome.html');
  return new Response(content, {
    headers: { 'Content-Type': 'text/html' },
  });
});

router.get('/next-refresh', async () => {
  const nextRefresh = tokenManager.getNextRefreshTime();
  return new Response(JSON.stringify({ nextRefresh }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// 404处理
router.all('*', () => new Response('Not Found', { status: 404 }));

// 主处理函数
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    try {
      // 初始化配置和 tokenManager
      await initialize(env);
      
      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      // 路由处理
      const response = await router.handle(request, env, ctx);

      // 添加CORS头
      response.headers.set('Access-Control-Allow-Origin', '*');

      return response;
    } catch (error) {
      return errorHandler(error);
    }
  },
};

// 为 Cloudflare Pages Functions 导出处理函数
export const onRequest: PagesFunction = async (context) => {
  try {
    await initialize(context.env);
    
    // 处理CORS预检请求
    if (context.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 路由处理
    const response = await router.handle(context.request, context.env, context);

    // 添加CORS头
    response.headers.set('Access-Control-Allow-Origin', '*');

    return response;
  } catch (error) {
    return errorHandler(error);
  }
};
