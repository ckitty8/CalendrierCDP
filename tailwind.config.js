/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f6ff",
          100: "#dbe9ff",
          200: "#b3d1ff",
          300: "#80b3ff",
          400: "#4d8fff",
          500: "#2569f5",
          600: "#1a52d1",
          700: "#173fa3",
          800: "#173682",
          900: "#152f69",
        },
      },
    },
  },
  plugins: [],
};
