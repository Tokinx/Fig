import Utils from "./utils.js";

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const utils = new Utils({
      Store: env.STORE,
      Theme: env.THEME,
      Password: env.PASSWORD,
    });

    switch (url.pathname) {
      case "/":
        if (url.searchParams.has("logout")) {
          return await utils.UserAuth("logout");
        } else if (url.searchParams.has("login")) {
          return await utils.UserAuth("login");
        }
        console.log(request.headers.get("Cookie"));
        const token = utils.GetCookie(request.headers.get("Cookie"), "token");
        if (token !== utils.Password) {
          return await utils.$static("login.html");
        }
        return await utils.$static("index.html");
      case "/api":
        break;
      default:
        return new Response(await $static(url.pathname), {
          headers: {
            "content-type": "text/html;charset=UTF-8",
          },
        });
    }
  },
};
