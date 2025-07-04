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

export interface CloudServiceTypes {
  [key: string]: unknown;
}

export interface CloudServiceEnv {
  DATABASE: D1Database;
  DEVELOPMENT?: boolean;
  [key: string]: any;
}
