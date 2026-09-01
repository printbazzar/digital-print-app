/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pb: {
          yellow: '#FACC15', // Vibrant Amber Yellow (Print Bazzar primary)
          yellowDark: '#EAB308',
          yellowLight: '#FEF08A',
          yellowSubtle: '#FEFCE8',
          black: '#0F172A',  // Deep Rich Carbon Black
          blackDark: '#020617',
          surface: '#1E293B',
          grayDark: '#334155',
          border: '#E2E8F0',
          bgLight: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};
