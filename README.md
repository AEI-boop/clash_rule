# Clash 自定义规则集

我的个人 Clash (mihomo) 配置脚本和直连规则集合。

## 文件说明

| 文件 | 用途 |
|---|---|
| `CurrentScripts.js` | 完整 Clash 配置脚本（DNS、代理组、规则链），适用于 mihomo/Meta 内核客户端 |
| `MyCustomDirect.list` | 自定义直连规则集，可在配置中作为 rule-providers 引用 |
| `CFChallenge.list` | Cloudflare 验证码/风控域名，置顶避免 AI 服务被拦截 |

## CurrentScripts.js

配置脚本涵盖：

- **DNS 防泄露**：fake-ip + respect-rules，国内域名走 UDP 53，国外走 DoH+PROXY
- **代理组**：地区自动测速、服务手动选择、AI 专用节点
- **规则链**：CF 验证码 > 自定义直连 > 广告拦截 > AI 分流 > 服务分流 > 国内直连 > 漏网之鱼兜底
- **GEO 数据库**：通过 fastgh 镜像加速下载

在 Clash Verge / Mihomo Party 等客户端中，将脚本内容粘贴到「脚本覆写」即可生效。

## MyCustomDirect.list 使用方法

在 Clash 配置中添加：

```yaml
rule-providers:
  MyCustomDirect:
    type: http
    behavior: classical
    url: "https://fastly.jsdelivr.net/gh/AEI-boop/clash_rule@main/MyCustomDirect.list"
    path: ./ruleset/MyCustomDirect.list
    interval: 86400
```

## 直连规则覆盖范围

- 微信、QQ 相关服务（含 wechatpay、servicewechat、qpic、gtimg 等核心域名）
- 杭州电子科技大学及教育网资源（含 edu.cn 通用域名、CERNET IP 段）
- 学术文献库（知网、万方、Web of Science、ScienceDirect、Springer、IEEE、PubMed）
- 知识管理（语雀）
- 国内网站和服务（网易、淘宝、抖音等）
- 国产 AI（DeepSeek、Kimi、通义、文心、豆包等 — 走国内 DNS 直连）
- tokendance.space（Tokendance 舞蹈平台）

## AI 服务分流

海外 AI（OpenAI、Claude、Gemini、Copilot）走专用 AI 节点，国产 AI 走直连。CF 验证码域名置顶，避免触发风控。
