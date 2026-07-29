import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LayoutService, ThemeMode } from '../../core/layout/service/layout.service';
import { AppConfigurator } from '../../core/layout/component/app.configurator';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [FormsModule, SelectButtonModule, AppConfigurator],
    templateUrl: './settings.html'
})
export class Settings {
    private layoutService = inject(LayoutService);

    themeOptions = [
        { label: 'Light', value: 'light', icon: 'pi pi-sun' },
        { label: 'Dark',  value: 'dark',  icon: 'pi pi-moon' },
        { label: 'System', value: 'system', icon: 'pi pi-desktop' }
    ];

    get selectedTheme(): ThemeMode {
        return this.layoutService.themeMode();
    }

    onThemeChange(mode: ThemeMode) {
        this.layoutService.setThemeMode(mode);
    }
}
