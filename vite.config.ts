import { tmpdir } from 'node:os';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleDeepSeekChat } from './server/deepseek/chatProxy';
import { handleArtifactPreview } from './server/preview/previewProxy';
import { handleGeneratedValidation } from './server/validation/validationProxy';

function deepSeekProxyPlugin(apiKey?: string): Plugin {
  return {
    name: 'deepseek-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/deepseek/chat', (req, res) => {
        void handleDeepSeekChat(req, res, apiKey);
      });
      server.middlewares.use('/api/deepseek/validate', (req, res) => {
        void handleGeneratedValidation(req, res);
      });
      server.middlewares.use('/api/deepseek/preview', (req, res) => {
        void handleArtifactPreview(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/deepseek/chat', (req, res) => {
        void handleDeepSeekChat(req, res, apiKey);
      });
      server.middlewares.use('/api/deepseek/validate', (req, res) => {
        void handleGeneratedValidation(req, res);
      });
      server.middlewares.use('/api/deepseek/preview', (req, res) => {
        void handleArtifactPreview(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      deepSeekProxyPlugin(env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY),
    ],
    server: {
      fs: {
        allow: [process.cwd(), tmpdir()],
      },
      watch: {
        ignored: ['**/vapor-preview-*/**'],
      },
    },
  };
});
