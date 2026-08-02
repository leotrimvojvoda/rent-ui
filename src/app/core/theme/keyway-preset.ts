import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * The Keyway brand as a PrimeNG preset.
 *
 * Every PrimeNG component and the whole sakai layout read their colours from
 * the `--p-*` tokens this generates, so defining the brand once here is what
 * makes buttons, inputs, dialogs, toasts, the sidebar and the topbar all land
 * in the same design language — rather than each page being restyled by hand.
 *
 * Source of truth for the raw values: the "Keyway Web Landing" design.
 * The literal hexes also live in `assets/tailwind.css` as `--color-keyway-*`
 * utilities for the handful of places that need the brand directly.
 */

/** Deep bottle green. 700 is the brand colour used across the landing page. */
const green = {
    50: '#eef6f2',
    100: '#d5e9e0',
    200: '#abd3c2',
    300: '#7ab8a0',
    400: '#4a9a7d',
    500: '#1a6b52',
    600: '#145a45',
    700: '#0f4c3a',
    800: '#0c3d2f',
    900: '#092e23',
    950: '#051d16'
};

/** Warm neutrals built around the cream page background (#f7f6f3). */
const sand = {
    0: '#ffffff',
    50: '#f7f6f3',
    100: '#eef0ec',
    200: '#e3e6e2',
    300: '#cfd4cf',
    400: '#a9b1ab',
    500: '#7a857f',
    600: '#66716b',
    700: '#4a534d',
    800: '#2f3733',
    900: '#1d2420',
    950: '#131916'
};

export const KeywayPreset = definePreset(Aura, {
    primitive: {
        borderRadius: {
            none: '0',
            xs: '4px',
            sm: '8px',
            md: '10px',
            lg: '12px',
            xl: '16px'
        }
    },
    semantic: {
        primary: green,
        // The landing page rounds cards at 16px and controls at 12px.
        formField: {
            borderRadius: '12px',
            paddingX: '0.875rem',
            paddingY: '0.75rem'
        },
        content: {
            borderRadius: '16px'
        },
        overlay: {
            select: { borderRadius: '14px' },
            popover: { borderRadius: '16px' },
            modal: { borderRadius: '20px' }
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{primary.700}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.600}',
                    activeColor: '{primary.800}'
                },
                surface: sand,
                content: {
                    background: '{surface.0}',
                    borderColor: '{surface.200}'
                },
                text: {
                    color: '#17201c',
                    mutedColor: '{surface.600}'
                }
            },
            dark: {
                // On dark surfaces the deep brand green goes muddy, so the
                // lighter step carries the accent and keeps text legible.
                primary: {
                    color: '{primary.300}',
                    contrastColor: '{surface.950}',
                    hoverColor: '{primary.200}',
                    activeColor: '{primary.100}'
                },
                surface: sand,
                content: {
                    background: '{surface.900}',
                    borderColor: '{surface.800}'
                },
                text: {
                    color: '{surface.50}',
                    mutedColor: '{surface.400}'
                }
            }
        }
    }
});
