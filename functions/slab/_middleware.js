// functions/slab/_middleware.js
// 服务端访问控制（Cloudflare Pages Functions 中间件）— 主密码 + 一次性密码(OTP)。
// 会话为签名 Cookie（30 分钟有效），OTP 核销依赖 KV 命名空间 SLAB_OTP（见 README/部署说明）。

const COOKIE = 'slab_session';
const WINDOW_MS = 30 * 60 * 1000;
const MASTER_HASH = '2d88ffbc912883f569bdd47bd68c351cedb751e3aebab40fba24dce3989cb9e8';

// 一次性密码哈希表（服务端，原客户端 VALID_HASHES 迁移至此）
const OTP_HASHES = new Set(["873455d7a6ca5c2d90fc8367cb89bd3b4cff00bc53f63bf866a5b72988cd374d","5c35066cff0d0eb0eaf9c6a62afaba087b653ca8efea37391a65064e2aab4208","8eee884db5f41d749bb7c28522989fb3b5ab58a660222a79a15091bcc31d4464","b8cc557874d5e57b4e6b8ca2e2f36083b5540d875e358c3e369ed72310147669","d6cf76b03498ede7b4ee18b966a1685468b657728163937cea8a194e7d723d53","36a6c8e07d9e877f226b4e136edc012b3be73f0a392757268590ac69b9431cad","a7f9e5ebe7d1df67bc49d816e075021a6d26053387575b24ff0caf3e77ac27f9","89504ddacf1dee4ff5257468991a54b0124274a180ec9a537554b74cf6bdf036","949c1b0a15a77d8a72d2ec3da6d905decb4adb06e02e724c47eaa7c80e5914ad","aa8cfd9ded721fbe536ce6de7bce28eee77e6af14493d395527df4f381070640","1aef948399ada68ed0f98afe1bb82e274c77104e3330f5c4f3dbd884dbcda246","60fad41d5aee8665e0ec75e58a04019a74bf5159266094ffd61f3e02251d8ccf","853c97f6db065e9eb491df19c7e85be45acc4b5abf1c41373060723b3be9d08e","376682f5e6df079508b1e2fe39691bff373365bdabb095ca6f4df94bf32c3404","e8c3a03ddf02b8b77772d40078909e7fe0bbec6ce2d23757cc1721ab1319cd20","0db7bc8ec86329eb7f56fac9d5574a1087de8eab2f70f3e362205c6b0cbe5859","0f910910978b86feca07e545e2fbbfd506a7e0e38b796fa66936e2af559b1fbe","7a52bb95308782610c0b7c91bd569f85c6a3f902b8ca7db296a91fb49ca34112","a26c3a2a2cea1d18373b9cabc8bc5f051262812ef7f9f48c38d4a6a45184df84","b419d7be152ae8eb683ef8927e0d706b996e22998ec299fd046a29d45c2c0ce1","ed0ee72e4e6b67dfcb98d5333f596eb1b1fd7b7eac6b69f7f627da79f2073a0f","5b07355f9298bc05e9d13a135f0cb3c791a79aa7af664412d0dc1316743747ad","d33d696324ab0d7c974ba1e4e77c2f95955278a429de9ea963e35e0644ef647c","c5ee030bcf91cc6ac3a26e82753cedd66960eb2c1cfd4d4571517272d79d2d50","baf09b3163903c0f526c46ee1bf25f8df8d6d81130420668f856772245bad4ed","4ba9d7466ed22fcc4073d1f55d64acbf31a6349361fb18c41a0ea2e72e4f989a","41836fb67bb07ea904f6da8be31360194ca6233aa1d012cd78b85cfe626b3180","f101e5c59f19b9572a8e39d13a2bcde5806898669e067841d6f4697891214b36","71ad9bec5af685a6420eb98287510d01b1c939d5b4f293ca2f471259c8e59a3e","0d8659f0fee3ca46bf6589cb60871ad864dda7d0bc316e2924afeb30899bd1cd","3d3dd3c28fb79e0007bcf67ec2fd01065a49c3d2153b6e0a97fbe4e6bf14fafa","aa22de6ff6490c34f4e36375409e201f2412ccdf258e50fe39991ddc097f2567","ab96621615212c5107c91877b57f84508c6a662465d3b55436f4950f1270d173","6f44e9815a57a09b6fa757401bc3e61f340d8b8e18788a60fa5582df8e3ae948","56cc13846b640be61817f4e431892fac1c15f927eeeb99ba95255b22431b522f","d25d979bc4cef98d191d23308b977d3202b4de9e90bea8981889f66650e2d519","c0aa46fec28fde8ed6377e3589bfa1c4ba7561d5693133ca46fd2ab201255ab7","da57e8ebf828d011e996a54f657d86a6b272333bfd8a7ebd7c0e1611fb6eb7f4","c40ca42cfbeaadb4acd284e6fcfbbb01f26d0f13a29f493eff14f44d7e0eefbb","070f1eddebde4494b0a6027b0f40b67aba9a0b5eafa318ed682ae760e31e281f","e3b727ef44905a40bed1127624296a2b2d1bf0a287c05c42717eff16bfc7439f","8e7f75dac5225fe68a0114ec20cb49738b987cb9a0b5ec349f082f4f788b2cf7","230af6b5c99c650319f73f55239ccedf74214bcdfe7b7a923deeb6add1db43ba","9a2ea9f71505452feb4cf9f7de83b47fcb1124198f17b7d958e6a3e3ddd79d88","a966b5638e6fe92458386f4f7b9fb722c658886fdb02a0309112c8b13dc273c0","353aab91f054ef818c5343cbbbc44cbde2e68c1ad9aaad71ab3e041adbbe26c9","f4e678be6ca5960a110c5370531bc766f3500ce3966819427b8621882cf787b5","3b7a32478c9d653b8f6898bd82712d430a0e0f37f114322fe1127523b29c1051","d15d3a79963c80d5dafb27d65546e09515d78b8425b60247f59cf09e64e98ac2","008554807fdbae02205fd8efc1f2aed88c4ba9d8f3c1cd80fe194445c757de14","9fa22705e3d48c4233de05c3b09a468e60e86f15a9ba5ea19640f1e25312a6d3","dc1d79f796d46aa626d2e555fec2ddef224f3205fc4bfbcf242360b54c42e235","0145c7e9289f8e1d2e108d1ff25ddfb822d9ccd7cc0aa1822d9ac0fbc5019cfc","803876669172bd0735cc478fe4eb612e78756872da7d786d9aa6ddd1f023b009","53c8bc83d46cf8c3420dee9cdf02dd2b85f8a53d5747bd5639367666fcdea2a8","6168f111bbcb0ce1b3122bc70a5077a75b3fea1b21af39b8df6f5ad03322f745","d103b33afdfa3f769d52ebf1776e25aaa3c2a7e07b474526ae4923ea40262e6c","121b2b80697893aeef8b3f5c98868a354027e49a5a1e4ee7b6b0f95d5521efcd","f8a3c36f1e0aff13b6d662c8115595142f0d138dbbe0e5fe04edd4274b856097","1a42ea332a96a8fc15b2089b906c0f014ddd62665603f37ad424cb6b20b483d5","56156635915ca8047cebe283a3e28f257c77e67b24fe7ad64519ef997861dd52","7e0eb7485870f7e1fc84eb9f1f504074c10508f867882cc035d2a3f1e526af06","7d2573cb073e9715178d04b23a320641fb5b581b159d0064963bbbfa9e99f156","8668610ce25fc03f86e3a38da37d98d6e5a7f29b83e452b5efa0925e0524da3c","23067e4ad9c5045fc33fa314e7bb2f460e1276b18d1f978f5e05257916fa854b","5df21884ed2adeb477767143d159e35663de881b9c3afd4a7ae296ed42e932fb","78b9f53b70aa827fe9127b15f3bc3028354ff767113efa0448bd2b91d18e6c2d","8d7ca1a24d39ae4358b29941e5a681381002984166765d2a83ad40f8d308e6ba","d565990cec9d5ec663438fa05ddbb3bde2d3f3e51ec21fe799e32a52e5ec9997","d7c5894e82dde0e980c191a9512d32563ccaa30f85aff9aa4860685a7fad8ef9","d6e50653c2521b3b16704bd1c2f10d97e117da022d18c4574922a52f55019579","781fbcace4c1575c8f0e7a864e831cd3c31f8bed6cd742bc053d031a15600f62","3d0a1b3352a78c7c32e64003ab901945c33804c51ba9b262392f6d1d2d37b7f4","5b6483cd69de3398039832e415cb0c4054a20a5b07540776d466b6525b9f2c19","3acd31d81baabf69733bd17e847c954c5646361adfaeee6a1fa79ac902d42f80","8bddb3c81c6e23efd5f0bae59b74dbcf0de911c97d762935d981cf58701ee673","0e5ac8701002e61badfc48ad6fbcf69ca2a718470ac445163497eb57e56a809b","5b7b297c0691b6350a2d5cefd549bcc482e410751a808f30ce5a208c7030b3f7","6b1198882af08bca660ade45ca0ac6b8ac8fbbbb8384827f97bbf82ce1dd3c3b","caca996536866ed488c4719b5a2cd2a2b81f7758338cad8615779e7a7e0e7926","4ff74e2536ff17be55727d09222caffd959efca4946e07a943d892bcbf2e20a5","1c99df2ea799b4169948d84170debe47b54846d4e13bb66c40cf00b0d12492b9","bef7c4fe08c15e1db62c843f086cb4d4b389e17e3e423de6273215399aa70b04","988491e93508331ff10831d51d29648849a6c9925092c8fb15ca49b2a77df627","3a82954136c5450025624c0cd02dcc6acf48bf855d75bf5bd13419704145268b","62fbc50ccc852ee080ebe91cb074132dd277a25143ee445911cf0491e40bae68","b64020da87df2f83545ea4bff63e5f0fee1833a62db513d94ce612c44dbc79ce","ce6d75f5ee2183fbea1d6f17cb8cdeabe29f2d44b79dc6b0ea717c0f980cdc01","fc1cf7b1ae5aca9e9693708eea1855fb54fa4e74041891267cf375785e6451a5","42b9e2f5344ce3d0283aa45b96db073ad75d16b1240d91ff78fd1ddbcc75dd3f","3fc9426db3faa0febbf3ee344fd656ff60939c2e15af8f7e506d60312c49f7ca","26ac2954986037b81d7ae1dd19c73bce83c53715142b1511364adf2404d590ed","ceeae720e2e20c71001913e97d34a55450e20b706ec443a1e765ce2c50312b78","b14a2586878b088393133f22d9a3cbb6fa859bcdfe5302a15ff82964b8b41c9a","bab01ab27ff5d5a7a48867bedd8d65eb9ec2cfef519dc99008753dcd00488c89","61538942b2f3b206b3889c62adb1e296da2c048d74ec455fa2d261031a00f5e1","123a4676b5c67e276a4aa8a5eab1d71e7d57d0b997e8d89ed3258f1c6e9cf09d","b88580febab30f0d4f961cceb963f4a9d21b3c4cfa7f8259ef73a566aaf8e57f","4a46b3627c460b9f48e4c8c1525973b9aed39bd0adc6ba7b4c37abf808c9bac7","bf9c3c71b83644b6f67ff6909a3c7405c350e25548fe488e9054757c82980b76"]);

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function secret(env) {
  return (env && env.SLAB_SECRET) || 'xunvei-slab-19921080011';
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

async function sign(exp, role, env) {
  const sig = await sha256Hex(exp + '.' + role + ':' + secret(env));
  return exp + '.' + role + '.' + sig;
}

async function validSession(token, env) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const exp = parseInt(parts[0], 36);
  if (!exp || Date.now() > exp) return false;
  return (await sign(parts[0], parts[1], env)) === token;
}

async function issueSession(role, env) {
  const exp = Date.now() + WINDOW_MS;
  const token = await sign(exp.toString(36), role, env);
  return COOKIE + '=' + token + '; Path=/slab; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(WINDOW_MS / 1000);
}

function redirect(location, setCookie) {
  const headers = { Location: location };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response('', { status: 302, headers });
}

async function handleLogin(request, env) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const pw = (params.get('password') || '').trim();
  if (!pw) return redirect('/slab/login?err=empty');
  const hash = await sha256Hex(pw);
  if (hash === MASTER_HASH) {
    return redirect('/slab/', await issueSession('master', env));
  }
  if (OTP_HASHES.has(hash)) {
    if (env && env.SLAB_OTP) {
      const used = await env.SLAB_OTP.get(hash);
      if (used === '1') return redirect('/slab/login?err=used');
      await env.SLAB_OTP.put(hash, '1');
    }
    return redirect('/slab/', await issueSession('otp', env));
  }
  return redirect('/slab/login?err=bad');
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>访问验证 — 地基承载混凝土地坪设计工具</title>
<style>
:root { --bg:#f3efe8; --card:#faf8f3; --text:#252220; --muted:#8a8278; --border:#e0dbd0; --accent:#2c5f8a; --accent2:#7a5538; --fail:#c4553a; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Inter',-apple-system,'Noto Sans SC',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
.card { background:var(--card); border:1px solid var(--border); border-top:4px solid var(--accent); border-radius:14px; padding:36px 40px; width:100%; max-width:400px; box-shadow:0 1px 3px rgba(37,34,32,.05),0 1px 2px rgba(37,34,32,.03); }
h1 { font-size:1.1rem; margin-bottom:6px; letter-spacing:.02em; }
.sub { color:var(--muted); font-size:.8rem; margin-bottom:22px; }
label { font-size:.82rem; font-weight:600; display:block; margin-bottom:6px; }
input[type=password] { width:100%; padding:11px 13px; border:1px solid #d5cfc4; border-radius:8px; font-size:.95rem; font-family:inherit; background:#fefefc; }
input[type=password]:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px rgba(44,95,138,.12); }
button { margin-top:16px; width:100%; padding:11px; border:none; border-radius:8px; background:var(--accent); color:#fff; font-size:.9rem; font-weight:600; cursor:pointer; font-family:inherit; }
button:hover { background:#3d6a94; }
.err { display:none; margin-top:14px; font-size:.8rem; color:var(--fail); background:#f7e9e3; border:1px solid #f0d5d2; border-radius:8px; padding:10px 14px; line-height:1.6; }
.err.show { display:block; }
.hint { margin-top:16px; font-size:.75rem; color:var(--muted); line-height:1.7; }
</style>
</head>
<body>
<div class="card">
  <h1>🔐 访问验证</h1>
  <div class="sub">地基承载混凝土地坪通用设计计算工具 · TR34 第4版</div>
  <form method="POST" action="/slab/login">
    <label for="pw">请输入访问密码</label>
    <input type="password" id="pw" name="password" placeholder="主密码或一次性密码" autocomplete="off" autofocus>
    <button type="submit">确认进入</button>
  </form>
  <div class="err" id="err"></div>
  <div class="hint">主密码可重复使用；一次性密码仅可用一次，30 分钟后失效。<br>如需访问请联系网站管理员。</div>
</div>
<script>
(function(){
  var code = new URLSearchParams(location.search).get('err');
  var el = document.getElementById('err');
  if (!code) return;
  el.classList.add('show');
  if (code === 'bad') el.textContent = '❌ 密码错误，请重试。';
  else if (code === 'used') el.textContent = '❌ 此一次性密码已被使用，请联系管理员获取新密码。';
  else if (code === 'empty') el.textContent = '❌ 请输入密码。';
  else el.textContent = '❌ 验证失败，请重试。';
})();
</script>
</body>
</html>`;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  if (await validSession(cookies[COOKIE], env)) {
    return next();
  }

  if (request.method === 'POST' && url.pathname.endsWith('/login')) {
    return handleLogin(request, env);
  }

  return new Response(LOGIN_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
