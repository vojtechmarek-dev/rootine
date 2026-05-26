import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

const protectedRoutes = ['/', '/stats', '/profile', '/workout'];
const authRoutes = ['/auth'];

function matchesRoute(pathname: string, route: string): boolean {
    if (route === '/') {
        return pathname === '/';
    }

    return pathname === route || pathname.startsWith(`${route}/`);
}

const authCheck: Handle = async ({ event, resolve }) => {
    const { pathname } = event.url;

    const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));
    const isLoginRoute = pathname === '/login';
    const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(pathname, route));

    // Fast path: routes that don't require session checks should not await Neon/auth.
    if (isAuthRoute || (!isProtectedRoute && !isLoginRoute)) {
        return resolve(event);
    }

    const session = await event.locals.auth();
    event.locals.session = session;

    if (isProtectedRoute && !session) {
        throw redirect(303, '/login');
    }

    if (isLoginRoute && session) {
        throw redirect(303, '/');
    }

    return resolve(event);
};

export const handle = sequence(authHandle, authCheck);
