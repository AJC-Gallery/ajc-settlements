/** Injection token for the validated AppConfig. The config module is the only reader of process.env. */
export const APP_CONFIG = Symbol("APP_CONFIG");