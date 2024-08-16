import _ from 'lodash';
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';
import logger from '@/lib/logger.ts';
import util from '@/lib/util.ts';

export interface RequestOptions {
    time?: number;
}

export default class Request {
    /** 请求方法 */
    method: string;
    /** 请求URL */
    url: string;
    /** 请求路径 */
    path: string;
    /** 请求载荷类型 */
    type: string;
    /** 请求headers */
    headers: any;
    /** 请求原始查询字符串 */
    search: string;
    /** 请求查询参数 */
    query: any;
    /** 请求URL参数 */
    params: any;
    /** 请求载荷 */
    body: any;
    /** 上传的文件 */
    files: any[];
    /** 客户端IP地址 */
    remoteIP: string | null;
    /** 请求接受时间戳（毫秒） */
    time: number;

    private ctx: any;

    constructor(ctx, options: RequestOptions = {}) {
        const { time } = options;
        this.ctx = ctx;
        this.method = ctx.request.method;
        this.url = ctx.request.url;
        this.path = ctx.request.path;
        this.type = ctx.request.type;
        this.headers = ctx.request.headers || {};
        this.search = ctx.request.search;
        this.query = ctx.query || {};
        this.params = ctx.params || {};
        this.body = ctx.request.body || {};
        this.files = ctx.request.files || {};
        this.remoteIP = this.headers["X-Real-IP"] || this.headers["x-real-ip"] || this.headers["X-Forwarded-For"] || this.headers["x-forwarded-for"] || ctx.ip || null;
        this.time = Number(_.defaultTo(time, util.timestamp()));
    }

    validate(key: string, fn?: Function) {
        try {
            const value = _.get(this, key);
            if (fn) {
                if (fn(value) === false)
                    throw `[Mismatch] -> ${fn}`;
            }
            else if (_.isUndefined(value))
                throw '[Undefined]';
        }
        catch (err) {
            logger.warn(`Params ${key} invalid:`, err);
            throw new APIException(EX.API_REQUEST_PARAMS_INVALID, `Params ${key} invalid`);
        }
        return this;
    }

    async json() {
        if (!this.body || _.isEmpty(this.body)) {
            const rawBody = await this.getRawBody();
            try {
                this.body = JSON.parse(rawBody);
            } catch (e) {
                logger.error(`Error parsing request body: ${e.message}`);
                throw new APIException(EX.API_REQUEST_BODY_PARSE_ERROR, 'Invalid JSON in request body');
            }
        }
        return this.body;
    }

    private getRawBody(): Promise<string> {
        return new Promise((resolve, reject) => {
            let data = '';
            this.ctx.req.on('data', chunk => {
                data += chunk;
            });
            this.ctx.req.on('end', () => {
                resolve(data);
            });
            this.ctx.req.on('error', (err) => {
                reject(err);
            });
        });
    }

    get(header: string): string | undefined {
        return this.headers[header.toLowerCase()];
    }
}
