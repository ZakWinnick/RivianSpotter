import router from './beta-data-router.cjs';

const routeCache = {};

export default {
  async fetch(request, env) {
    if (new URL(request.url).hostname !== router.BETA_HOST) {
      return new Response('Not found', { status: 404 });
    }

    const routed = await router.handleRequest(request, {
      origin: env.BETA_DATA_ORIGIN,
      shellOrigin: env.BETA_SHELL_ORIGIN,
      mode: env.BETA_RENDER_MODE,
      routeCache,
    });
    return routed || fetch(request);
  },
};
