import { CanMatchFn } from '@angular/router';

/** Top-level segments that live inside the authenticated `AppLayout` shell. */
export const APP_SHELL_SEGMENTS = ['dashboard', 'rentals', 'fleet', 'company', 'notifications', 'settings'];

/**
 * The app shell and the public site both sit at the empty path. Matching the
 * shell on its own segment list keeps the choice explicit rather than relying on
 * the router backtracking out of an empty-path parent whose children missed.
 */
export const appShellMatch: CanMatchFn = (_route, segments) => segments.length > 0 && APP_SHELL_SEGMENTS.includes(segments[0].path);
