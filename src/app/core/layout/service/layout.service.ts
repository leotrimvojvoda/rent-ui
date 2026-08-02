import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * The palette is fixed by the Keyway preset (`core/theme/keyway-preset.ts`), so
 * only the light/dark choice and the menu mode are user state.
 */
export interface layoutConfig {
    darkTheme?: boolean;
    menuMode?: string;
}

interface LayoutState {
    staticMenuDesktopInactive?: boolean;
    overlayMenuActive?: boolean;
    configSidebarVisible?: boolean;
    staticMenuMobileActive?: boolean;
    menuHoverActive?: boolean;
}

interface MenuChangeEvent {
    key: string;
    routeEvent?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private static readonly CONFIG_STORAGE_KEY = 'layoutConfig';

    _config: layoutConfig = {
        darkTheme: false,
        menuMode: 'static',
        ...this.loadConfigFromStorage()
    };

    _state: LayoutState = {
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false
    };

    layoutConfig = signal<layoutConfig>(this._config);

    layoutState = signal<LayoutState>(this._state);

    private configUpdate = new Subject<layoutConfig>();

    private overlayOpen = new Subject<any>();

    private menuSource = new Subject<MenuChangeEvent>();

    private resetSource = new Subject();

    menuSource$ = this.menuSource.asObservable();

    resetSource$ = this.resetSource.asObservable();

    configUpdate$ = this.configUpdate.asObservable();

    overlayOpen$ = this.overlayOpen.asObservable();

    theme = computed(() => (this.layoutConfig()?.darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    themeMode = signal<ThemeMode>('system');

    private systemQueryCleanup: (() => void) | null = null;

    private previousDarkTheme: boolean | undefined = undefined;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();
            if (config) {
                this.onConfigUpdate();
                this.saveConfigToStorage(config);
            }
        });

        effect(() => {
            const config = this.layoutConfig();
            if (!config) return;

            const darkNow = config.darkTheme;
            if (this.previousDarkTheme === undefined) {
                this.previousDarkTheme = darkNow;
                return;
            }

            if (darkNow !== this.previousDarkTheme) {
                this.previousDarkTheme = darkNow;
                this.handleDarkModeTransition(config);
            }
        });

        this.initThemeMode();
    }

    private loadConfigFromStorage(): Partial<layoutConfig> {
        try {
            const saved = localStorage.getItem(LayoutService.CONFIG_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...(parsed.menuMode && { menuMode: parsed.menuMode })
                };
            }
        } catch {
            // Ignore corrupt storage
        }
        return {};
    }

    private saveConfigToStorage(config: layoutConfig): void {
        try {
            const toSave = { menuMode: config.menuMode };
            localStorage.setItem(LayoutService.CONFIG_STORAGE_KEY, JSON.stringify(toSave));
        } catch {
            // Ignore storage errors
        }
    }

    private initThemeMode(): void {
        const saved = localStorage.getItem('themeMode') as ThemeMode | null;
        const mode: ThemeMode = saved ?? 'system';
        this.themeMode.set(mode);
        this.applyThemeMode(mode);
    }

    setThemeMode(mode: ThemeMode): void {
        localStorage.setItem('themeMode', mode);
        this.themeMode.set(mode);
        this.clearSystemListener();
        this.applyThemeMode(mode);
    }

    private applyThemeMode(mode: ThemeMode): void {
        if (mode === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            this.applyDark(mq.matches);
            const listener = (e: MediaQueryListEvent) => this.applyDark(e.matches);
            mq.addEventListener('change', listener);
            this.systemQueryCleanup = () => mq.removeEventListener('change', listener);
        } else {
            this.applyDark(mode === 'dark');
        }
    }

    private applyDark(dark: boolean): void {
        if (dark) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
        this.layoutConfig.update((state) => ({ ...state, darkTheme: dark }));
    }

    private clearSystemListener(): void {
        if (this.systemQueryCleanup) {
            this.systemQueryCleanup();
            this.systemQueryCleanup = null;
        }
    }

    private handleDarkModeTransition(config: layoutConfig): void {
        if ((document as any).startViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
            this.onTransitionEnd();
        }
    }

    private startViewTransition(config: layoutConfig): void {
        const transition = (document as any).startViewTransition(() => {
            this.toggleDarkMode(config);
        });

        transition.ready
            .then(() => {
                this.onTransitionEnd();
            })
            .catch(() => {});
    }

    toggleDarkMode(config?: layoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    private onTransitionEnd() {
        this.transitionComplete.set(true);
        setTimeout(() => {
            this.transitionComplete.set(false);
        });
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));

            if (this.layoutState().overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, staticMenuMobileActive: !this.layoutState().staticMenuMobileActive }));

            if (this.layoutState().staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }

    onConfigUpdate() {
        this._config = { ...this.layoutConfig() };
        this.configUpdate.next(this.layoutConfig());
    }

    onMenuStateChange(event: MenuChangeEvent) {
        this.menuSource.next(event);
    }

    reset() {
        this.resetSource.next(true);
    }
}
