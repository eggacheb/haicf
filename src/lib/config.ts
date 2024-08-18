import serviceConfig from "./configs/service-config.ts";
import systemConfig from "./configs/system-config.ts";

class Config {
    /** 服务配置 */
    service = serviceConfig;
    
    /** 系统配置 */
    system = systemConfig;

    /** API密钥 */
    apiKey: string;

    /** token刷新间隔（毫秒） */
    tokenRefreshInterval: number;

    /** 调试模式 */
    debug: boolean;

    /** 日志级别 */
    logLevel: string;

    constructor() {
        this.apiKey = 'sk-hailuofreeapi';
        this.tokenRefreshInterval = 604800000; // 默认7天
        this.debug = false;
        this.logLevel = 'info';
    }

    initialize(env: any) {
        this.apiKey = env.API_KEY || this.apiKey;
        this.tokenRefreshInterval = parseInt(env.TOKEN_REFRESH_INTERVAL || '') || this.tokenRefreshInterval;
        this.debug = env.DEBUG === 'true';
        this.logLevel = env.LOG_LEVEL || this.logLevel;

        if (this.apiKey === 'sk-hailuofreeapi') {
            console.warn("Warning: Using default API key. Please set a custom API key in environment variables.");
        }

        if (this.debug) {
            console.log("Debug mode is enabled.");
        }

        console.log(`Configuration loaded. Log level: ${this.logLevel}`);
    }
}

export default new Config();
