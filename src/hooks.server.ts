import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

const protectedRoutes = ['/', '/stats', '/profile'];
const authRoutes = ['/auth', '/login'];

const authCheck: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;
    const session = await event.locals.auth();

    // Skip auth check for auth-related routes
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    if (isAuthRoute) {
        return resolve(event);
    }

    // Check if route is protected
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

    if (isProtectedRoute && !session) {
        throw redirect(303, '/login');
    }

    // Redirect authenticated users away from login page
    if (pathname === '/login' && session) {
        throw redirect(303, '/');
    }

    return resolve(event);
};

export const handle = sequence(authHandle, authCheck);
