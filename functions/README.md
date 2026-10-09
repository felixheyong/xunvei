# /slab 服务端访问控制（Cloudflare Pages Functions）

`functions/_middleware.js`（**顶层**中间件）对 `/slab/*` 做服务端鉴权，其余路径（主页、/concrete、/sop 等）直接放行。

- **主密码** `19921080011`：始终可用，签发 30 分钟签名会话 Cookie（`slab_session`）。
- **一次性密码（OTP）**：100 个 8 位码（哈希存于中间件内），提交时校验；核销依赖 KV 命名空间。
- **注意**：中间件必须放在顶层 `functions/`（子目录 `functions/slab/_middleware.js` 只会拦截同目录 Functions，不会拦截静态 HTML）。

## 必须的部署配置（Cloudflare 后台一次性操作）

1. **创建 KV 命名空间**
   - 登录 dash.cloudflare.com → Workers & Pages → KV → 创建命名空间，名称如 `SLAB_OTP`。
2. **绑定到 Pages 项目**
   - 打开 Pages 项目 `xunvei` → Settings → Functions → KV namespace bindings。
   - 变量名填 **`SLAB_OTP`**，选择刚创建的命名空间。
   - （变量名必须与中间件内 `env.SLAB_OTP` 一致，否则 OTP 无法核销。）
3. **（建议）设置会话签名密钥环境变量**
   - Settings → Functions → Environment variables，添加 `SLAB_SECRET`（随机长字符串）。
   - 不设置时中间件用内置默认值，安全性较弱，仅建议测试期使用。

## 行为说明

- 未登录访问 `/slab/*` → 显示登录页；提交后 302 回 `/slab/` 并设置 HttpOnly Cookie。
- **未绑定 KV 时**：主密码仍可用；OTP 可进入但"一次性"不生效（同一码可重复用）——上线前务必完成上面的 KV 绑定。
- 会话 30 分钟过期；主密码可重复登录，不受 OTP 核销影响。
