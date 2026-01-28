import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

// Tema PrimeNG 21 basado en la paleta Different Roads.
// Traduce las variables CSS de :root y .my-app-dark a tokens de PrimeNG.

export const MyPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      // Equivalente a :root (tema claro)
      light: {
        surface: {
          0: '#ffffff',  // --p-surface-0
          50: '#f5f5f5',
          100: '#e5e7eb',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2933',
          900: '#111827',
          950: '#020617',
        },
        primary: {
          color: '#093642',      // --dr-navy
          contrastColor: '#ffffff',
          hoverColor: '#0a4252', // --dr-navy-soft
          activeColor: '#0a4252',
        },
        text: {
          color: '#093642',      // --p-text-color
          hoverColor: '#031317',
          mutedColor: '#6b7280', // --p-text-secondary-color
          hoverMutedColor: '#4b5563',
        },
        highlight: {
          background: '#f9fafb',  // --p-highlight-bg / --dr-bg-subtle
          focusBackground: '#e5edf0',
          color: '#093642',
          focusColor: '#072a33',
        },
        formField: {
          background: '#ffffff',               // --p-input-bg
          disabledBackground: '#e5e7eb',
          filledBackground: '#f5f5f5',
          filledHoverBackground: '#f5f5f5',
          filledFocusBackground: '#f5f5f5',
          borderColor: 'rgba(9,54,66,0.1)',   // --dr-border-soft
          hoverBorderColor: '#9ca3af',
          focusBorderColor: '#093642',        // --p-input-focus-border-color
          invalidBorderColor: '#d4183d',      // --dr-danger
          color: '#093642',                   // --p-input-text-color
          disabledColor: '#6b7280',
          placeholderColor: '#6b7280',
          invalidPlaceholderColor: '#b31334',
          floatLabelColor: '#6b7280',
          floatLabelFocusColor: '#093642',
          floatLabelActiveColor: '#6b7280',
          floatLabelInvalidColor: '#b31334',
          iconColor: '#9ca3af',
          shadow: '0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(18,18,23,0.05)',
        },
        content: {
          background: '#ffffff',
          hoverBackground: '#f5f5f5',
          borderColor: 'rgba(9,54,66,0.1)',
          color: '#093642',
          hoverColor: '#031317',
        },
      },

      // Equivalente a .my-app-dark
      dark: {
        surface: {
          0: '#020617',
          50: '#020617',
          100: '#111827',
          200: '#1f2933',
          300: '#374151',
          400: '#4b5563',
          500: '#6b7280',
          600: '#9ca3af',
          700: '#d1d5db',
          800: '#e5e7eb',
          900: '#f9fafb',
          950: '#ffffff',
        },
        primary: {
          color: '#ea685c',   // --dr-coral
          contrastColor: '#0b1120',
          hoverColor: '#f08a81',
          activeColor: '#e45345',
        },
        text: {
          color: '#f9fafb',   // --p-text-color
          hoverColor: '#f9fafb',
          mutedColor: '#d1d5db', // --p-text-secondary-color
          hoverMutedColor: '#e5e7eb',
        },
        highlight: {
          background: 'rgba(248,250,252,0.08)',  // --p-highlight-bg
          focusBackground: 'rgba(248,250,252,0.16)',
          color: '#f9fafb',
          focusColor: '#f9fafb',
        },
        formField: {
          background: '#020617',                 // --p-input-bg
          disabledBackground: '#374151',
          filledBackground: '#1f2933',
          filledHoverBackground: '#1f2933',
          filledFocusBackground: '#1f2933',
          borderColor: 'rgba(15,23,42,0.6)',    // --p-border-color
          hoverBorderColor: '#6b7280',
          focusBorderColor: '#ea685c',          // --p-input-focus-border-color (primary coral)
          invalidBorderColor: '#d4183d',
          color: '#f9fafb',                     // --p-input-text-color
          disabledColor: '#9ca3af',
          placeholderColor: '#9ca3af',
          invalidPlaceholderColor: '#f08a81',
          floatLabelColor: '#9ca3af',
          floatLabelFocusColor: '#ea685c',
          floatLabelActiveColor: '#9ca3af',
          floatLabelInvalidColor: '#f08a81',
          iconColor: '#9ca3af',
          shadow: '0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(15,23,42,0.75)',
        },
        content: {
          background: '#020617',
          hoverBackground: '#111827',
          borderColor: 'rgba(15,23,42,0.6)',
          color: '#f9fafb',
          hoverColor: '#f9fafb',
        },
      },
    },
  },
});

export default MyPreset;
