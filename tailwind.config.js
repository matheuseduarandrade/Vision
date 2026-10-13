// As cores "white" e "vision-50/400/900/950" vêm de variáveis CSS, o que permite o modo claro e escuro.
const v = n => `rgb(var(--${n}) / <alpha-value>)`;
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: { extend: {
    colors: { white: v('c-fg'), vision: { 50: v('c-v50'), 400: v('c-v400'), 500: '#066dff', 700: '#0338c8', 900: v('c-v900'), 950: v('c-v950') } },
    fontFamily: { sans: ['Sora', 'system-ui', 'sans-serif'] }
  } },
  plugins: []
};
