# Clash 自定义规则集

我的个人 Clash 直连规则集合

## 使用方法

在 Clash 配置中添加：

```yaml
rule-providers:
  MyCustomDirect:
    type: http
    behavior: classical
    url: "https://testingcf.jsdelivr.net/gh/AEI-boop/clash_rule@main/MyCustomDirect.list"
    path: ./ruleset/MyCustomDirect.list
    interval: 86400
```

## 规则说明

- 微信、QQ 相关服务
- 教育网站和学校资源
- 常用国内网站


