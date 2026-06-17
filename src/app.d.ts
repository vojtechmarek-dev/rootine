/// <reference types="vite-plugin-pwa/svelte" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { DefaultSession } from '@auth/core/types';

declare module '@auth/core/types' {
    interface Session {
        user?: {
            id?: string;
        } & DefaultSession['user'];
    }
}

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            auth: () => Promise<import('@auth/core/types').Session | null>;
            session?: import('@auth/core/types').Session | null;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
