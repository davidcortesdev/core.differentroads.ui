import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const MyPreset2 = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--primary-color-50)',
      100: 'var(--primary-color-100)',
      200: 'var(--primary-color-200)',
      300: 'var(--primary-color-300)',
      400: 'var(--primary-color-400)',
      500: 'var(--primary-color-500)',
      600: 'var(--primary-color-600)',
      700: 'var(--primary-color-700)',
      800: 'var(--primary-color-800)',
      900: 'var(--primary-color-900)',
      950: 'var(--primary-color-950)',
    },

    colorScheme: {
      light: {
        surface: {
          0: 'var(--surface-color-0)',
          50: 'var(--surface-color-50)',
          100: 'var(--surface-color-100)',
          200: 'var(--surface-color-200)',
          300: 'var(--surface-color-300)',
          400: 'var(--surface-color-400)',
          500: 'var(--surface-color-500)',
          600: 'var(--surface-color-600)',
          700: 'var(--surface-color-700)',
          800: 'var(--surface-color-800)',
          900: 'var(--surface-color-900)',
          950: 'var(--surface-color-950)',
        },
        menubar: {
            color: 'var(--primary-color-500)',
            border:{
              color: 'var(--primary-color-500)',},
          100: 'var(--menubar-color-100)',
          200: 'var(--menubar-color-200)',
          300: 'var(--menubar-color-300)',
          400: 'var(--menubar-color-400)',
        },
      },
    },
  },
});

export default MyPreset2;
