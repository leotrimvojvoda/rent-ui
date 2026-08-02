import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LayoutService, ThemeMode } from '../../core/layout/service/layout.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [FormsModule, SelectButtonModule],
    templateUrl: './settings.html'
})
export class Settings {
    private layoutService = inject(LayoutService);

    authService = inject(AuthService);

    themeOptions = [
        { label: 'Light', value: 'light', icon: 'pi pi-sun' },
        { label: 'Dark', value: 'dark', icon: 'pi pi-moon' },
        { label: 'System', value: 'system', icon: 'pi pi-desktop' }
    ];

    get selectedTheme(): ThemeMode {
        return this.layoutService.themeMode();
    }

    onThemeChange(mode: ThemeMode) {
        this.layoutService.setThemeMode(mode);
    }
}
