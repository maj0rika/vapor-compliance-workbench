import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleDeepSeekChat } from './server/deepseek/chatProxy';

function deepSeekProxyPlugin(apiKey?: string): Plugin {
  return {
    name: 'deepseek-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/deepseek/chat', (req, res) => {
        void handleDeepSeekChat(req, res, apiKey);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/deepseek/chat', (req, res) => {
        void handleDeepSeekChat(req, res, apiKey);
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
  };
});
