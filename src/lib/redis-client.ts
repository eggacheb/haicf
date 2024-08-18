interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

class RedisClient {
  private getKV(env: any): KVNamespace {
    if (!env.HAILUO_KV) {
      throw new Error('HAILUO_KV is not defined in the environment');
    }
    return env.HAILUO_KV;
  }

  async get(key: string, env: any): Promise<string | null> {
    const kv = this.getKV(env);
    return await kv.get(key);
  }

  async set(key: string, value: string, env: any): Promise<void> {
    const kv = this.getKV(env);
    await kv.put(key, value);
  }

  async del(key: string, env: any): Promise<void> {
    const kv = this.getKV(env);
    await kv.delete(key);
  }

  async smembers(key: string, env: any): Promise<string[]> {
    const kv = this.getKV(env);
    const value = await kv.get(key);
    return value ? JSON.parse(value) : [];
  }

  async sadd(key: string, env: any, ...members: string[]): Promise<void> {
    const kv = this.getKV(env);
    const existingMembers = await this.smembers(key, env);
    const newMembers = [...new Set([...existingMembers, ...members])];
    await kv.put(key, JSON.stringify(newMembers));
  }

  async srem(key: string, env: any, ...members: string[]): Promise<void> {
    const kv = this.getKV(env);
    const existingMembers = await this.smembers(key, env);
    const newMembers = existingMembers.filter(m => !members.includes(m));
    await kv.put(key, JSON.stringify(newMembers));
  }

  // 添加其他需要的方法...
}

export default new RedisClient();
