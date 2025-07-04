export enum Platform {
  Unknown = 'unknown',
  Android = 'android',
  iOS = 'ios',
}

export interface CloudServiceContext {
  platform: Platform;
  serviceId: string | null;
  userId?: string;
  development: boolean;
}

export interface BaseCloudServiceEnv {
  db: D1Database;
  DEVELOPMENT?: boolean;
  buckets: Record<string, R2Bucket>;
  secrets: Record<string, string>;
  variables: Record<string, string>;
}

export interface CloudServiceEnv extends BaseCloudServiceEnv {
  db: D1Database;
  DEVELOPMENT?: boolean;
}
