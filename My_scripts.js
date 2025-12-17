/**
 * Clash 配置文件主函数
 * @param {Object} config - 原始配置对象
 * @returns {Object} - 修改后的配置对象
 */
function main(config) {
  // ==================== DNS 配置部分 ====================
  // DNS配置用于解析域名，防止DNS泄露，提高隐私安全

  // 定义国内DNS服务器列表（使用DoH协议 - DNS over HTTPS）
  // 223.5.5.5 是阿里云DNS，1.12.12.12 是DNSPod
  const cnDnsList = [
    "https://223.5.5.5/dns-query",
    "https://1.12.12.12/dns-query",
  ];

  // 定义可信的国外DNS服务器列表
  // cooluc.com 使用QUIC协议（更快），1.0.0.1 和 1.1.1.1 是Cloudflare DNS
  const trustDnsList = [
    "quic://dns.cooluc.com",
    "https://1.0.0.1/dns-query",
    "https://1.1.1.1/dns-query",
  ];

  // 配置DNS选项
  config.dns = {
    enable: true, // 启用DNS功能
    "prefer-h3": true, // 优先使用HTTP/3协议（DoH3），速度更快

    // 默认DNS服务器：用于解析其他DNS服务器的域名和代理节点的域名
    // 必须是IP地址或可直接访问的DNS
    "default-nameserver": cnDnsList,

    // 主DNS服务器：用于解析普通网络请求的域名
    nameserver: trustDnsList,

    // DNS分流策略：根据域名类型选择不同的DNS服务器
    "nameserver-policy": {
      "geosite:cn": cnDnsList, // 中国大陆域名使用国内DNS
      "geosite:gfw": trustDnsList, // GFW列表域名使用国外DNS
      "geosite:google": trustDnsList, // Google域名使用国外DNS
    },

    // 备用DNS服务器：当主DNS返回可疑结果时使用
    fallback: trustDnsList,

    // 备用DNS过滤器：判断DNS结果是否被污染
    "fallback-filter": {
      geoip: true, // 启用GeoIP过滤
      "geoip-code": "CN", // 如果IP是中国的，直接采用；否则使用fallback结果
      geosite: ["gfw"], // GFW列表中的域名被视为污染，只使用fallback
      ipcidr: ["240.0.0.0/4"], // 这个IP段的结果视为被污染
      domain: ["+.google.com", "+.facebook.com", "+.youtube.com"], // 这些域名使用fallback
    },
  };

  // ==================== 连接优化选项 ====================

  // 统一延迟测试：使所有节点使用相同的延迟测试方法，结果更准确
  config["unified-delay"] = true;

  // TCP并发：同时尝试连接多个节点，选择最快的，提高连接速度
  config["tcp-concurrent"] = true;

  // 配置文件持久化选项
  config.profile = {
    "store-selected": true, // 保存用户选择的节点，重启后恢复
    "store-fake-ip": true, // 保存Fake-IP映射，重启后恢复
  };

  // 流量嗅探器配置：识别真实的访问目标
  config.sniffer = {
    enable: true, // 启用嗅探功能
    sniff: {
      // 嗅探TLS流量（HTTPS）
      TLS: {
        ports: [443, 8443], // 监听这些端口
      },
      // 嗅探HTTP流量
      HTTP: {
        ports: [80, "8080-8880"], // 监听这些端口范围
        "override-destination": true, // 用嗅探到的域名覆盖原始目标
      },
    },
  };

  // 使用geodata模式：基于地理位置的规则匹配，更精确
  config["geodata-mode"] = true;

  // ==================== GEO数据库配置 ====================
  // GEO数据用于IP和域名的地理位置判断

  // GitHub加速镜像前缀（国内访问GitHub慢，使用镜像加速）
  const githubPrefix = "https://fastgh.lainbo.com/";

  // GEO数据库的原始GitHub下载地址
  const rawGeoxURLs = {
    geoip:
      "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat", // IP地理位置数据库
    geosite:
      "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat", // 域名分类数据库
    mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb", // MaxMind数据库格式
  };

  // 将所有GEO数据库URL添加加速前缀
  config["geox-url"] = Object.fromEntries(
    Object.entries(rawGeoxURLs).map(([key, githubUrl]) => [
      key,
      `${githubPrefix}${githubUrl}`, // 给每个URL加上镜像前缀
    ])
  );

  // ==================== 代理组配置 ====================
  // 代理组是对代理节点的分组和策略管理

  config["proxy-groups"] = [
    // 【主选择组】用户手动选择使用哪个策略
    {
      name: "节点选择", // 代理组名称
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png", // 显示图标
      type: "select", // 类型：手动选择
      proxies: [
        // 可选的选项列表
        "自动选择", // 自动测速选择最快节点
        "香港节点", // 香港节点组
        "台湾节点", // 台湾节点组
        "狮城节点", // 新加坡节点组
        "美国节点", // 美国节点组
        "日本节点", // 日本节点组
        "韩国节点", // 韩国节点组
        "其他节点", // 其他地区节点组
        "手动切换", // 手动选择具体节点
        "DIRECT", // 直连，不使用代理
      ],
    },

    // 【自动选择组】自动测速，选择延迟最低的节点
    {
      name: "自动选择",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png",
      type: "url-test", // 类型：URL测试，自动选择最快节点
      "include-all": true, // 包含所有代理节点
      "exclude-filter": "香港|Hong Kong|HK|hk|hongkong|HongKong", // 排除香港节点（正则表达式）
      interval: 300, // 每300秒（5分钟）测试一次
      tolerance: 50, // 延迟容差50ms：新节点比当前节点快50ms以上才切换
    },

    // 【手动切换组】可以手动选择任意一个具体的代理节点
    {
      name: "手动切换",
      icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png",
      "include-all": true, // 包含所有代理节点
      type: "select", // 手动选择类型
    },

    // 【AI服务专用组】用于ChatGPT、Claude等AI服务
    {
      name: "AI节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bot.png",
      type: "select",
      proxies: [
        "美国节点", // AI服务通常需要美国节点
        "节点选择",
        "自动选择",
        "狮城节点",
        "香港节点",
        "台湾节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
        "DIRECT",
      ],
    },

    // 【Telegram专用组】
    {
      name: "电报消息",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png",
      type: "select",
      proxies: [
        "美国节点", // Telegram服务器主要在美国
        "节点选择",
        "自动选择",
        "狮城节点",
        "香港节点",
        "台湾节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
        "DIRECT",
      ],
    },

    // 【YouTube专用组】
    {
      name: "油管视频",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png",
      type: "select",
      proxies: [
        "节点选择",
        "自动选择",
        "狮城节点",
        "香港节点",
        "台湾节点",
        "日本节点",
        "美国节点",
        "韩国节点",
        "其他节点",
        "手动切换",
        "DIRECT",
      ],
    },

    // 【Netflix专用组】
    {
      name: "奈飞视频",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
      type: "select",
      proxies: [
        "节点选择",
        "自动选择",
        "狮城节点",
        "香港节点",
        "台湾节点",
        "日本节点",
        "美国节点",
        "韩国节点",
        "其他节点",
        "手动切换",
        "DIRECT",
      ],
    },

    // 【国内媒体组】爱奇艺、腾讯视频、B站等
    {
      name: "国内媒体",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/DomesticMedia.png",
      type: "select",
      proxies: [
        "DIRECT", // 国内媒体默认直连
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "美国节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【国外媒体组】除YouTube、Netflix外的其他国外流媒体
    {
      name: "国外媒体",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ForeignMedia.png",
      type: "select",
      proxies: [
        "节点选择",
        "自动选择",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "美国节点",
        "韩国节点",
        "其他节点",
        "手动切换",
        "DIRECT",
      ],
    },

    // 【谷歌FCM组】Google Firebase Cloud Messaging推送服务
    {
      name: "谷歌FCM",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png",
      type: "select",
      proxies: [
        "DIRECT", // FCM在国内可能可用，默认直连
        "节点选择",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【微软Bing组】
    {
      name: "微软Bing",
      icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/bing.png",
      type: "select",
      proxies: [
        "DIRECT", // Bing国内版可直连，国际版需代理
        "节点选择",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【OneDrive组】微软云盘
    {
      name: "微软云盘",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/OneDrive.png",
      type: "select",
      proxies: [
        "DIRECT", // OneDrive在国内可用，默认直连
        "节点选择",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【微软服务组】Windows Update、Office等
    {
      name: "微软服务",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png",
      type: "select",
      proxies: [
        "节点选择", // 部分微软服务需要代理
        "DIRECT",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【苹果服务组】App Store、iCloud、Apple Music等
    {
      name: "苹果服务",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png",
      type: "select",
      proxies: [
        "DIRECT", // 苹果服务在国内大多可用
        "节点选择",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【游戏平台组】Steam、Epic、Origin等
    {
      name: "游戏平台",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Game.png",
      type: "select",
      proxies: [
        "DIRECT", // 游戏平台默认直连，速度更快
        "节点选择",
        "美国节点",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // 【全球直连组】明确需要直连的流量
    {
      name: "全球直连",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png",
      type: "select",
      proxies: [
        "DIRECT", // 默认直连
        "节点选择", // 特殊情况可以选择代理
        "自动选择",
      ],
    },

    // 【广告拦截组】拦截广告域名
    {
      name: "广告拦截",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png",
      type: "select",
      proxies: [
        "REJECT", // 拒绝连接，拦截广告
        "DIRECT", // 不拦截，直连
      ],
    },

    // 【应用净化组】去除应用内广告
    {
      name: "应用净化",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hijacking.png",
      type: "select",
      proxies: [
        "REJECT", // 拒绝连接
        "DIRECT", // 直连
      ],
    },

    // 【漏网之鱼组】所有规则都不匹配时使用
    {
      name: "漏网之鱼",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png",
      type: "select",
      proxies: [
        "节点选择", // 默认走代理
        "自动选择",
        "DIRECT",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "日本节点",
        "美国节点",
        "韩国节点",
        "其他节点",
        "手动切换",
      ],
    },

    // ========== 以下是地区节点自动选择组 ==========

    // 【香港节点组】自动选择延迟最低的香港节点
    {
      name: "香港节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",
      "include-all": true, // 包含所有节点
      filter: "港|HK|hk|Hong Kong|HongKong|hongkong", // 通过正则表达式筛选香港节点
      type: "url-test", // 自动测速
      interval: 300, // 测速间隔300秒
      tolerance: 50, // 延迟容差50ms
    },

    // 【台湾节点组】
    {
      name: "台湾节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
      "include-all": true,
      filter: "台|新北|彰化|TW|tw|Taiwan|taiwan", // 筛选台湾节点
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【新加坡节点组】
    {
      name: "狮城节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
      "include-all": true,
      filter: "新加坡|坡|狮城|SG|sg|Singapore|singapore", // 筛选新加坡节点
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【美国节点组】
    {
      name: "美国节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
      "include-all": true,
      // 筛选美国节点（包含主要城市名）
      filter:
        "美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|us|United States",
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【日本节点组】
    {
      name: "日本节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
      "include-all": true,
      filter: "日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|jp|Japan|japan", // 筛选日本节点
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【韩国节点组】
    {
      name: "韩国节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
      "include-all": true,
      filter: "KR|kr|Korea|korea|KOR|kor|首尔|韩", // 筛选韩国节点
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【其他地区节点组】不属于上述地区的节点
    {
      name: "其他节点",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",
      "include-all": true,
      // 排除上述所有地区，剩下的就是其他地区
      "exclude-filter":
        "港|HK|hk|Hong Kong|HongKong|hongkong|台|新北|彰化|TW|tw|Taiwan|taiwan|新加坡|坡|狮城|SG|sg|Singapore|singapore|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|us|United States|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|jp|Japan|japan|KR|kr|Korea|korea|KOR|kor|首尔|韩",
      type: "url-test",
      interval: 300,
      tolerance: 50,
    },

    // 【全局组】包含所有代理组，方便统一管理
    {
      name: "GLOBAL",
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",
      "include-all": true, // 包含所有节点
      type: "select", // 手动选择
      proxies: [
        // 列出所有代理组，方便快速切换
        "节点选择",
        "自动选择",
        "手动切换",
        "AI节点",
        "电报消息",
        "油管视频",
        "奈飞视频",
        "国内媒体",
        "国外媒体",
        "谷歌FCM",
        "微软Bing",
        "微软云盘",
        "微软服务",
        "苹果服务",
        "游戏平台",
        "全球直连",
        "广告拦截",
        "应用净化",
        "漏网之鱼",
        "香港节点",
        "台湾节点",
        "狮城节点",
        "美国节点",
        "日本节点",
        "韩国节点",
        "其他节点",
      ],
    },
  ];

  // ==================== 规则提供者配置 ====================
  // 规则提供者：从远程下载规则列表，定期更新

  config["rule-providers"] = {
    // 局域网规则：本地网络地址，应该直连
    LocalAreaNetwork: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/LocalAreaNetwork.list",
      path: "./ruleset/LocalAreaNetwork.list", // 本地缓存路径
      behavior: "classical", // 规则类型：经典模式（支持所有规则类型）
      interval: 86400, // 更新间隔：86400秒=24小时
      format: "text", // 规则格式：文本格式
      type: "http", // 下载方式：HTTP
    },
    // 【⭐ 你的自定义规则集 - 最高优先级】
    MyCustomDirect: {
      type: "http",
      behavior: "classical",
      url: "https://testingcf.jsdelivr.net/gh/AEI-boop/clash_rule@main/MyCustomDirect.list",
      path: "./ruleset/MyCustomDirect.list",
      interval: 86400,
      format: "text",
    },

    // 白名单规则：不应该被拦截的域名
    UnBan: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/UnBan.list",
      path: "./ruleset/UnBan.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 广告拦截规则：常见广告域名列表
    BanAD: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/BanAD.list",
      path: "./ruleset/BanAD.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 应用内广告拦截规则
    BanProgramAD: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/BanProgramAD.list",
      path: "./ruleset/BanProgramAD.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Google FCM推送服务规则
    GoogleFCM: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/GoogleFCM.list",
      path: "./ruleset/GoogleFCM.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Google中国服务规则（可直连）
    GoogleCN: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/GoogleCN.list",
      path: "./ruleset/GoogleCN.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Steam中国服务规则（可直连）
    SteamCN: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/SteamCN.list",
      path: "./ruleset/SteamCN.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 微软Bing规则
    Bing: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Bing.list",
      path: "./ruleset/Bing.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // OneDrive规则
    OneDrive: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/OneDrive.list",
      path: "./ruleset/OneDrive.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 微软服务规则
    Microsoft: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Microsoft.list",
      path: "./ruleset/Microsoft.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 苹果服务规则
    Apple: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Apple.list",
      path: "./ruleset/Apple.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Telegram规则
    Telegram: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Telegram.list",
      path: "./ruleset/Telegram.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // AI平台规则（ChatGPT、Claude等）
    "AI平台-国外": {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/AI.list",
      path: "./ruleset/AI.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 网易云音乐规则
    NetEaseMusic: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/NetEaseMusic.list",
      path: "./ruleset/NetEaseMusic.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Epic游戏平台规则
    Epic: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Epic.list",
      path: "./ruleset/Epic.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Origin游戏平台规则
    Origin: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Origin.list",
      path: "./ruleset/Origin.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Sony PlayStation规则
    Sony: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Sony.list",
      path: "./ruleset/Sony.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Steam规则
    Steam: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Steam.list",
      path: "./ruleset/Steam.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 任天堂Switch规则
    Nintendo: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Nintendo.list",
      path: "./ruleset/Nintendo.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // YouTube规则
    YouTube: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/YouTube.list",
      path: "./ruleset/YouTube.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // Netflix规则
    Netflix: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Netflix.list",
      path: "./ruleset/Netflix.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 巴哈姆特（台湾视频网站）规则
    Bahamut: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Ruleset/Bahamut.list",
      path: "./ruleset/Bahamut.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 中国媒体规则（国内流媒体）
    ChinaMedia: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ChinaMedia.list",
      path: "./ruleset/ChinaMedia.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 国外媒体规则（国外流媒体）
    ProxyMedia: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ProxyMedia.list",
      path: "./ruleset/ProxyMedia.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // GFW规则（需要代理的网站列表）
    ProxyGFWlist: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ProxyGFWlist.list",
      path: "./ruleset/ProxyGFWlist.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 中国域名规则（behavior: domain - 域名专用格式）
    ChinaDomain: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ChinaDomain.list",
      path: "./ruleset/ChinaDomain.list",
      behavior: "domain", // 域名专用格式，匹配速度更快
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 中国公司IP规则（behavior: ipcidr - IP段专用格式）
    ChinaCompanyIp: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/ChinaCompanyIp.list",
      path: "./ruleset/ChinaCompanyIp.list",
      behavior: "ipcidr", // IP段专用格式
      interval: 86400,
      format: "text",
      type: "http",
    },

    // 下载工具规则（BT、PT等）
    Download: {
      url: "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Download.list",
      path: "./ruleset/Download.list",
      behavior: "classical",
      interval: 86400,
      format: "text",
      type: "http",
    },
  };

  // ==================== 规则配置 ====================
  // 规则按从上到下的顺序匹配，一旦匹配就不再继续
  // 所以优先级高的规则要放在前面

  config["rules"] = [
    // ==================== 【最高优先级】自定义规则 ====================
    "RULE-SET,MyCustomDirect,全球直连", // 【⭐ 你的自定义规则集】 → 直连
    "RULE-SET,LocalAreaNetwork,全球直连", // 局域网地址 → 直连
    "RULE-SET,UnBan,全球直连", // 白名单 → 直连
    "RULE-SET,BanAD,广告拦截", // 广告域名 → 拦截
    "RULE-SET,BanProgramAD,应用净化", // 应用内广告 → 拦截
    "RULE-SET,GoogleFCM,谷歌FCM", // Google推送 → 谷歌FCM组
    "RULE-SET,GoogleCN,全球直连", // Google中国服务 → 直连
    "RULE-SET,SteamCN,全球直连", // Steam中国 → 直连
    "RULE-SET,Bing,微软Bing", // Bing → 微软Bing组
    "RULE-SET,OneDrive,微软云盘", // OneDrive → 微软云盘组
    "RULE-SET,Microsoft,微软服务", // 微软服务 → 微软服务组
    "RULE-SET,Apple,苹果服务", // 苹果服务 → 苹果服务组
    "RULE-SET,Telegram,电报消息", // Telegram → 电报消息组
    "RULE-SET,AI平台-国外,AI节点", // AI服务 → AI节点组
    "RULE-SET,Epic,游戏平台", // Epic → 游戏平台组
    "RULE-SET,Origin,游戏平台", // Origin → 游戏平台组
    "RULE-SET,Sony,游戏平台", // PlayStation → 游戏平台组
    "RULE-SET,Steam,游戏平台", // Steam → 游戏平台组
    "RULE-SET,Nintendo,游戏平台", // Switch → 游戏平台组
    "RULE-SET,YouTube,油管视频", // YouTube → 油管视频组
    "RULE-SET,Netflix,奈飞视频", // Netflix → 奈飞视频组
    "RULE-SET,ChinaMedia,国内媒体", // 国内流媒体 → 国内媒体组
    "RULE-SET,ProxyMedia,国外媒体", // 国外流媒体 → 国外媒体组
    "RULE-SET,ProxyGFWlist,节点选择", // GFW列表 → 节点选择组
    "RULE-SET,ChinaDomain,全球直连", // 中国域名 → 直连
    "RULE-SET,ChinaCompanyIp,全球直连", // 中国公司IP → 直连
    "RULE-SET,Download,全球直连", // 下载工具 → 直连

    // ==================== 【第三优先级】地理位置规则 ====================
    "GEOIP,CN,全球直连", // 中国大陆IP → 直连

    // ==================== 【最后】兜底规则 ====================
    "MATCH,漏网之鱼", // 所有上面都不匹配的 → 漏网之鱼组（通常走代理）
  ];

  // 返回修改后的配置对象
  return config;
}
