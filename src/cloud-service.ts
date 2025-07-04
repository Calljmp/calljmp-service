import {
  Platform,
  CloudServiceContext,
  CloudServiceEnv,
  CloudServiceTypes,
} from './types';

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
  private _buckets?: CloudServiceTypes['buckets'];
  private _secrets?: CloudServiceTypes['secrets'];
  private _variables?: CloudServiceTypes['variables'];

  private _sanitizeName(name: string): string {
    // Handle UPPER_CASE: convert to camelCase
    if (name.includes('_')) {
      return name
        .toLowerCase()
        .split('_')
        .map((word, index) =>
          index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
    }

    // Handle camelCase or PascalCase: ensure first letter is lowercase
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  private _extractEnvByPrefix(prefix: string): Record<string, unknown> {
    if (!this._env) {
      throw new Error('Environment not set');
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this._env)) {
      if (key.startsWith(prefix)) {
        const sanitizedKey = this._sanitizeName(key.replace(prefix, ''));
        result[sanitizedKey] = value;
      }
    }
    return result;
  }

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
    return this._env.DATABASE;
  }

  get buckets(): CloudServiceTypes['buckets'] {
    if (this._buckets) {
      return this._buckets;
    }
    this._buckets = this._extractEnvByPrefix('BUCKET_');
    return this._buckets;
  }

  get secrets(): CloudServiceTypes['secrets'] {
    if (this._secrets) {
      return this._secrets;
    }
    this._secrets = this._extractEnvByPrefix('SECRET_');
    return this._secrets;
  }

  get variables(): CloudServiceTypes['variables'] {
    if (this._variables) {
      return this._variables;
    }
    this._variables = this._extractEnvByPrefix('VARIABLE_');
    return this._variables;
  }

  async fetch(
    request: Request,
    env?: CloudServiceEnv,
    executionCtx?: ExecutionContext
  ): Promise<Response> {
    this._env = env;

    this._buckets = undefined;
    this._secrets = undefined;
    this._variables = undefined;

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
