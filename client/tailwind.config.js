/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'slack-purple': '#4a154b',
        'slack-purple-dark': '#350d36',
        'slack-gray': '#3f0e40',
        'slack-gray-dark': '#1a1d21',
        'slack-blue': '#1264a3',
        'slack-green': '#2eb67d',
        'slack-text': '#1d1c1d',
        'slack-text-dark': '#d1d2d3',
      },
      fontFamily: {
        slack: ['Slack-Lato', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
