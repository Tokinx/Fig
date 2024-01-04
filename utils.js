export async function SHA512(str) {
  str = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest({ name: "SHA-512" }, str);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GeneralKey(len) {
  len = len || 6;
  // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
  const seed = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  const seedLen = seed.length;
  let key = "";
  for (let i = 0; i < len; i++) {
    key += seed.charAt(Math.floor(Math.random() * seedLen));
  }
  if (await DB.get(key)) return GeneralKey(len);
  return key;
}
