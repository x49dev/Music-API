import { createApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  try {
    const app = await createApp();

    await app.listen({ port: config.PORT, host: '0.0.0.0' });

    app.log.info(`Server listening on port ${config.PORT}`);
    app.log.info(`Environment: ${config.NODE_ENV}`);
    app.log.info(`API Documentation: http://localhost:${config.PORT}/api-docs`);
    app.log.info(`Health Check: http://localhost:${config.PORT}/health`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

void start();
