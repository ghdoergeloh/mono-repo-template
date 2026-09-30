export {};

declare module "vitest" {
  export interface ProvidedContext {
    /** True where the story tests compare screenshots (Linux). */
    screenshots: boolean;
  }
}
