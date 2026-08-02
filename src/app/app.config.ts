import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, TitleStrategy, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { KeywayPreset } from './core/theme/keyway-preset';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { AuthService } from './core/services/auth.service';
import { PageTitleStrategy } from './core/services/page-title.strategy';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({
                anchorScrolling: 'enabled',
                scrollPositionRestoration: 'enabled'
            }),
            withEnabledBlockingInitialNavigation()
        ),
        // Order matters: the chain runs outside-in, so the auth interceptor sits
        // innermost and gets to refresh and replay a 401 before the error
        // interceptor would have toasted it.
        provideHttpClient(withFetch(), withInterceptors([loadingInterceptor, errorInterceptor, authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: { preset: KeywayPreset, options: { darkModeSelector: '.app-dark' } }
        }),
        MessageService,
        ConfirmationService,
        { provide: TitleStrategy, useClass: PageTitleStrategy },
        // Blocks the first navigation until a stored token pair has been turned
        // back into a session, so guards can trust the current-user signal.
        provideAppInitializer(() => inject(AuthService).initialize())
    ]
};
