import { SHA512 } from "./utils.js";

class Router {
  routes = [];

  handle(request, env, ctx) {
    for (const route of this.routes) {
      const match = route[0](request, env, ctx);
      if (match) {
        return route[1]({ ...match, request, env, ctx });
      }
    }
    const match = this.routes.find(([matcher]) => matcher(request, env, ctx));
    if (match) {
      return match[1](request, env, ctx);
    }
  }

  register(handler, path, method) {
    const urlPattern = new URLPattern({ pathname: path });
    this.routes.push([
      (request) => {
        if (method === undefined || request.method.toLowerCase() === method) {
          const match = urlPattern.exec({
            pathname: new URL(request.url).pathname,
          });
          if (match) {
            return { params: match.pathname.groups };
          }
        }
      },
      (args) => handler(args),
    ]);
  }

  options(path, handler) {
    this.register(handler, path, "options");
  }
  head(path, handler) {
    this.register(handler, path, "head");
  }
  get(path, handler) {
    this.register(handler, path, "get");
  }
  post(path, handler) {
    this.register(handler, path, "post");
  }
  put(path, handler) {
    this.register(handler, path, "put");
  }
  patch(path, handler) {
    this.register(handler, path, "patch");
  }
  delete(path, handler) {
    this.register(handler, path, "delete");
  }

  all(path, handler) {
    this.register(handler, path);
  }
}

// Setting up our application:

const router = new Router();

router.get("/", async ({ request }) => {
  const url = new URL(request.url);
  // https://domain.com/?login
  if (url.searchParams.has("login")) {
    const data = await request.json();
    if (data.password === (await DB.get("password"))) {
      const token = JSON.stringify({
        // 过期时间，24小时
        exp: Date.now() + 86400000,
        // token
        value: SHA512(JSON.stringify([Math.random(), Date.now()])),
      });
      await DB.put("token", token);
      return new Response({ error: false, msg: "Success", data: token });
    }
    return new Response({ error: true, msg: "Password error.", data: null });
  }

  // 获取token
  let html = "";
  if (request.headers.get("token") === (await DB.get("token"))) {
    html = `
    <input type="password" id="password" placeholder="Password" />
    <button onclick="login()">Login</button>

    <script>
      function login() {
        fetch("/?login", {
          method: "GET",
          headers: {
            "content-type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({
            password: document.getElementById("password").value,
          }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.error) {
              alert(res.msg);
            } else {
              localStorage.setItem("token", res.data);
              location.reload();
            }
          });
      }
    </script>
    `;
  } else {
    html = "admin";
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
});

router.get("/:key", ({ params, request }) => {
  // 数据库查询 params.key
  // if proxy
  // return await fetch(url, request);
  // else
  // return Response.redirect(url);
});

router.post("/add", async ({ request }) => {
  // 检查cookie，如果没有登录则返回没有权限
});

router.post("/del", async ({ request }) => {
  // 检查cookie，如果没有登录则返回没有权限
});

// 404 for everything else
router.all("*", () => new Response("Not Found.", { status: 404 }));

export default router;
