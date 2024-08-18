import serviceConfig from "./configs/service-config.ts";
import systemConfig from "./configs/system-config.ts";

class Config {
    /** 服务配置 */
    service = serviceConfig;
    
    /** 系统配置 */
    system = systemConfig;

    /** API密钥 */
    apiKey = typeof API_KEY !== 'undefined' ? API_KEY : 'sk-hailuofreeapi';

    /** token刷新间隔（毫秒） */
    tokenRefreshInterval = typeof TOKEN_REFRESH_INTERVAL !== 'undefined' ? 
        parseInt(TOKEN_REFRESH_INTERVAL as string) : 604800000; // 默认7天

    /** 调试模式 */
    debug = typeof DEBUG !== 'undefined' ? DEBUG === 'true' : false;

    /** 日志级别 */
    logLevel = typeof LOG_LEVEL !== 'undefined' ? LOG_LEVEL : 'info';

    constructor() {
        // 可以在这里添加一些配置验证逻辑
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
