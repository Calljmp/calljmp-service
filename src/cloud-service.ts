import { Platform, CloudServiceContext, CloudServiceEnv } from './types';

const CLOUD_SERVICE_ARGS_HEADER = 'X-Calljmp-Args';

class CloudServiceArgs {
  public readonly platform: Platform;
  public readonly serviceId: string;
  public readonly userId?: string;

  private constructor(data: Record<string, unknown>) {
    this.platform = (data.platform as Platform) || Platform.Unknown;
    this.serviceId = data.serviceId as string;
    this.userId = data.userId as string;
  }

  static from(args: any) {
    let value: string | null = null;

    if (
      'req' in args &&
      'header' in args.req &&
      typeof args.req.header === 'function'
    ) {
      // Hono Context
      value = args.req.header(CLOUD_SERVICE_ARGS_HEADER);
    } else if ('header' in args && typeof args.header === 'function') {
      // Hono Request
      value = args.header(CLOUD_SERVICE_ARGS_HEADER);
    } else if (args instanceof Request) {
      value = args.headers.get(CLOUD_SERVICE_ARGS_HEADER);
    } else if (args && typeof args === 'object') {
      value = args[CLOUD_SERVICE_ARGS_HEADER];
    } else if (typeof args === 'string') {
      value = args;
    }

    if (!value) {
      throw new Error(`Unable to resolve arguments from ${args}`);
    }

    const json = JSON.parse(value);

    return new CloudServiceArgs(json);
  }

  static tryFrom(args: any) {
    try {
      const data = CloudServiceArgs.from(args);
      return {
        args: data,
        error: null,
      };
    } catch (error) {
      return {
        args: null,
        error: error as Error,
      };
    }
  }
}

export abstract class CloudService {
  private _context?: CloudServiceContext;
  private _env?: CloudServiceEnv;

  get context(): CloudServiceContext {
    if (!this._context) {
      throw new Error('Context is only available after fetch');
    }
    return this._context;
  }

  get database(): D1Database {
    if (!this._env) {
      throw new Error('Environment not set');
    }
    return this._env.db;
  }

  get buckets(): CloudServiceEnv['buckets'] {
    if (!this._env) {
      throw new Error('Environment not set');
    }
    return this._env.buckets || {};
  }

  get secrets(): CloudServiceEnv['secrets'] {
    if (!this._env) {
      throw new Error('Environment not set');
    }
    return this._env.secrets || {};
  }

  get variables(): CloudServiceEnv['variables'] {
    if (!this._env) {
      throw new Error('Environment not set');
    }
    return this._env.variables || {};
  }

  async fetch(
    request: Request,
    env?: CloudServiceEnv,
    executionCtx?: ExecutionContext
  ): Promise<Response> {
    this._env = env;
    this._context = {
      platform: Platform.Unknown,
      serviceId: null,
      userId: undefined,
      development: env?.DEVELOPMENT === true,
    };

    const { args } = CloudServiceArgs.tryFrom(request);
    if (args) {
      this._context.platform = args.platform;
      this._context.serviceId = args.serviceId;
      this._context.userId = args.userId;
    }

    return this.onRequest(request, env, executionCtx);
  }

  protected abstract onRequest(
    request: Request,
    env?: CloudServiceEnv,
    executionCtx?: ExecutionContext
  ): Response | Promise<Response>;
}
