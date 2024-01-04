export default class Utils {
  Store = {};
  Theme = "";
  Password = "";

  constructor(conf) {
    this.Store = conf.Store;
    this.Theme = conf.Theme;
    this.Password = conf.Password;
  }

  async UserAuth(type) {
    switch (type) {
      case "login":
        const data = await request.json();
        if (data.password === (await utils.Store.get("password"))) {
          const time = Date.now();
          const token = JSON.stringify({
            exp: time + 86400000,
            value: SHA512(JSON.stringify([Math.random(), time])),
          });
          await utils.Store.put("token", token);
          return new Response(
            { code: 0, msg: "Success", data: token },
            {
              headers: {
                "content-type": "application/json;charset=UTF-8",
                "Set-Cookie": `token=${token}; expires=${new Date(
                  time + 86400000
                ).toUTCString()}`,
              },
            }
          );
        }
        return new Response({
          code: 1001,
          msg: "Password error.",
          data: null,
        });
      default:
        await this.Store.delete("token");
        return new Response(
          { code: 0, msg: "Success", data: null },
          {
            headers: {
              "content-type": "application/json;charset=UTF-8",
              "Set-Cookie": `token=; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
            },
          }
        );
    }
  }

  async $static(file) {
    const base = {
      github: `https://tokinx.github.io/ShortUrl/pages`,
      jsdelivr: `https://cdn.jsdelivr.net/gh/Tokinx/ShortUrl@main/pages`,
    };

    const result = await fetch(`${base.github}/${file}`);
    return new Response(await result.text(), {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  }

  async SHA512(str) {
    str = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest({ name: "SHA-512" }, str);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async GeneralKey(len) {
    len = len || 6;
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    const seed = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
    const seedLen = seed.length;
    let key = "";
    for (let i = 0; i < len; i++) {
      key += seed.charAt(Math.floor(Math.random() * seedLen));
    }
    if (await this.Store.get(key)) return GeneralKey(len);
    return key;
  }

  GetCookie(cookieString, key) {
    if (cookieString) {
      const allCookies = cookieString.split("; ");
      const targetCookie = allCookies.find((cookie) => cookie.includes(key));
      if (targetCookie) {
        const [_, value] = targetCookie.split("=");
        return value;
      }
    }
    return null;
  }
}
