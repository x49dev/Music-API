import type { FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import { randomUUID } from 'node:crypto';

export const requestLogger: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const startTime = Date.now();
  const requestId = randomUUID();

  request.id = requestId;
  reply.header('x-request-id', requestId);

  const safeUrl = request.url.split('?')[0];
  const safeHeaders = { ...request.headers };
  delete safeHeaders.authorization;
  delete safeHeaders.cookie;
  delete safeHeaders['x-api-key'];

  request.log.info(
    {
      requestId,
      method: request.method,
      url: safeUrl,
      headers: safeHeaders,
      query: request.query,
      params: request.params,
    },
    'Incoming request'
  );

  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;
    request.log.info(
      {
        requestId,
        method: request.method,
        url: safeUrl,
        statusCode: reply.statusCode,
        durationMs: duration,
      },
      'Request completed'
    );
  });
};

declare module 'fastify' {
  interface FastifyRequest {
    id: string;
  }
}
