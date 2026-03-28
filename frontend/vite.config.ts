import path from "path";
import { createRequire } from "module";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";

const require = createRequire(import.meta.url);
const reactDomPackagePath = require.resolve("react-dom/package.json");
const reactPackagePathForDom = require.resolve("react/package.json", {
  paths: [path.dirname(reactDomPackagePath)],
});

const reactDomDir = path.dirname(reactDomPackagePath);
const reactDir = path.dirname(reactPackagePathForDom);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: reactDir,
      "react/jsx-runtime": path.join(reactDir, "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.join(reactDir, "jsx-dev-runtime.js"),
      "react-dom": reactDomDir,
    },
    dedupe: ["react", "react-dom"],
  },
});
