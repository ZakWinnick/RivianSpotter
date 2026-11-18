import router from './production-data-router.cjs';
const routeCache={};
export default {async fetch(request){const response=await router.handleRequest(request,{routeCache});return response || new Response('Not found',{status:404});}};
