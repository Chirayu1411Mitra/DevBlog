import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        padding: 'verbose',
        environment: 'jsdom',
        setupFiles: './src/setupTests.js', // We will create this
        globals: true,
    },
});
