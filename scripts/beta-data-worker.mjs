import router from './beta-data-router.cjs';
export default {
  async fetch(request, env) {
    const routed = await router.handleRequest(request, {origin: env.BETA_DATA_ORIGIN});
    return routed || fetch(request);
  }
};
