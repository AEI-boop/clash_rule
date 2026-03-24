/**
 * Clash 配置主函数
 * @param {Object} config - 原始配置对象
 * @returns {Object} - 修改后的配置对象
 */
function main(config) {
  // ==================== DNS ====================

  const cnDns = ['https://223.5.5.5/dns-query', 'https://1.12.12.12/dns-query']
  const trustDns = [
    'https://dns.cloudflare.com/dns-query',
    'https://dns.google/dns-query',
    'https://1.1.1.1/dns-query',
  ]

  config.dns = {
    enable: true,
    // "prefer-h3": true, // DoH3 加速，部分 DNS 不支持，遇到解析异常时可启用测试

    // default-nameserver 必须是纯 IP，用于解析其他 DNS 服务器的域名（避免鸡生蛋）
    'default-nameserver': ['223.5.5.5', '119.29.29.29', '1.12.12.12'],
    nameserver: trustDns,
    // 解析代理节点域名用国内 DNS，防止代理节点本身无法被解析
    'proxy-server-nameserver': cnDns,
    'nameserver-policy': {
      'geosite:cn': cnDns,
      'geosite:gfw': trustDns,
      'geosite:google': trustDns,
    },
    // fallback 与 nameserver 不同，避免互为备用时失效
    fallback: ['https://dns.google/dns-query', 'https://dns.cloudflare.com/dns-query'],
    'fallback-filter': {
      geoip: true,
      'geoip-code': 'CN',
      geosite: ['gfw'],
      ipcidr: ['240.0.0.0/4'],
      domain: ['+.google.com', '+.facebook.com', '+.youtube.com'],
    },
  }

  // ==================== 连接优化 ====================

  config['unified-delay'] = true
  config['tcp-concurrent'] = true
  config.profile = { 'store-selected': true, 'store-fake-ip': true }
  config.sniffer = {
    enable: true,
    sniff: {
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, '8080-8880'], 'override-destination': true },
    },
  }
  config['geodata-mode'] = true

  // ==================== GEO 数据库 ====================

  // 国内访问 GitHub 慢，通过镜像加速 GEO 数据库下载
  // fastgh.lainbo.com 是 GitHub 反代镜像，直接替换域名即可，不拼接完整 URL
  const rawGeoxURLs = {
    geoip: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat',
    geosite: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat',
    mmdb: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb',
  }
  config['geox-url'] = Object.fromEntries(
    Object.entries(rawGeoxURLs).map(([k, url]) => [k, url.replace('https://github.com', 'https://fastgh.lainbo.com')])
  )

  // ==================== 代理组 ====================

  // 地区自动测速组工厂（消除重复的 interval/tolerance/lazy 字段）
  const regionGroup = (name, icon, filter, excludeFilter) => ({
    name,
    icon: `https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/${icon}.png`,
    'include-all': true,
    type: 'url-test',
    interval: 300,
    tolerance: 50,
    lazy: true,
    ...(filter ? { filter } : {}),
    ...(excludeFilter ? { 'exclude-filter': excludeFilter } : {}),
  })

  // 服务手动选择组工厂
  const serviceGroup = (name, icon, proxies) => ({
    name,
    icon: `https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/${icon}.png`,
    type: 'select',
    proxies,
  })

  const allRegions = ['香港节点', '台湾节点', '狮城节点', '美国节点', '日本节点', '韩国节点', '其他节点']
  const mainProxies = ['自动选择', ...allRegions, '手动切换', 'DIRECT']

  config['proxy-groups'] = [
    serviceGroup('节点选择', 'Proxy', mainProxies),

    // 排除香港——香港节点已有专属组，避免抢占自动组最优位置
    {
      name: '自动选择',
      icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png',
      type: 'url-test',
      'include-all': true,
      'exclude-filter': '香港|Hong Kong|HK|hk|hongkong|HongKong',
      interval: 300,
      tolerance: 50,
      lazy: true,
    },

    {
      name: '手动切换',
      icon: 'https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png',
      'include-all': true,
      type: 'select',
    },

    // AI 服务优先美国节点（多数 AI 平台有地区限制）
    serviceGroup('AI节点', 'Bot', ['美国节点', '节点选择', '自动选择', '狮城节点', '香港节点', '台湾节点', '日本节点', '韩国节点', '其他节点', '手动切换']),

    serviceGroup('电报消息', 'Telegram', ['节点选择', ...allRegions, '手动切换']),
    serviceGroup('油管视频', 'YouTube', ['节点选择', ...allRegions, '手动切换']),
    serviceGroup('奈飞视频', 'Netflix', ['节点选择', ...allRegions, '手动切换']),
    serviceGroup('国内媒体', 'DomesticMedia', ['全球直连', '节点选择']),
    serviceGroup('国外媒体', 'ForeignMedia', ['节点选择', ...allRegions, '手动切换']),
    serviceGroup('谷歌FCM', 'Google', ['节点选择', ...allRegions, '手动切换', 'DIRECT']),
    serviceGroup('微软Bing', 'Bing', ['节点选择', ...allRegions, '手动切换', 'DIRECT']),
    serviceGroup('微软云盘', 'OneDrive', ['节点选择', ...allRegions, '手动切换', 'DIRECT']),
    serviceGroup('微软服务', 'Microsoft', ['全球直连', '节点选择', ...allRegions, '手动切换']),
    serviceGroup('苹果服务', 'Apple', ['全球直连', '节点选择', ...allRegions, '手动切换']),
    serviceGroup('游戏平台', 'Game', ['节点选择', ...allRegions, '手动切换', 'DIRECT']),
    serviceGroup('全球直连', 'Direct', ['DIRECT', '节点选择']),
    serviceGroup('广告拦截', 'Reject', ['REJECT', 'DIRECT']),
    serviceGroup('应用净化', 'Reject', ['REJECT', 'DIRECT']),
    serviceGroup('漏网之鱼', 'Final', ['节点选择', ...allRegions, '手动切换', 'DIRECT']),

    regionGroup('香港节点', 'Hong Kong', '港|HK|hk|Hong Kong|HongKong|hongkong'),
    regionGroup('台湾节点', 'Taiwan', '台|新北|彰化|TW|tw|Taiwan|taiwan'),
    regionGroup('狮城节点', 'Singapore', '新加坡|坡|狮城|SG|sg|Singapore|singapore'),
    regionGroup('美国节点', 'United_States', '美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|us|United States'),
    regionGroup('日本节点', 'Japan', '日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|jp|Japan|japan'),
    regionGroup('韩国节点', 'Korea', 'KR|kr|Korea|korea|KOR|kor|首尔|韩'),
    regionGroup(
      '其他节点',
      'Global',
      null,
      '港|HK|hk|Hong Kong|HongKong|hongkong|台|新北|彰化|TW|tw|Taiwan|taiwan|新加坡|坡|狮城|SG|sg|Singapore|singapore|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|us|United States|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|jp|Japan|japan|KR|kr|Korea|korea|KOR|kor|首尔|韩'
    ),

    {
      name: 'GLOBAL',
      icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png',
      'include-all': true,
      type: 'select',
      proxies: [
        '节点选择', '自动选择', '手动切换', 'AI节点', '电报消息', '油管视频', '奈飞视频',
        '国内媒体', '国外媒体', '谷歌FCM', '微软Bing', '微软云盘', '微软服务', '苹果服务',
        '游戏平台', '全球直连', '广告拦截', '应用净化', '漏网之鱼',
        ...allRegions,
      ],
    },
  ]

  // ==================== 规则提供者 ====================

  // ACL4SSR 规则集工厂（jsDelivr 加速，国内访问更稳定）
  const acl = (name, path, behavior = 'classical') => ({
    url: `https://fastly.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/${path}`,
    path: `./ruleset/${name}.list`,
    behavior,
    interval: 86400,
    format: 'text',
    type: 'http',
  })

  // blackmatrix7 规则集工厂（jsDelivr 加速，AI、广告等规则更新更及时）
  const bm7 = (name, behavior = 'classical') => ({
    url: `https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/${name}/${name}.list`,
    path: `./ruleset/bm7_${name}.list`,
    behavior,
    interval: 86400,
    format: 'text',
    type: 'http',
  })

  config['rule-providers'] = {
    // 自定义规则优先级最高
    MyCustomDirect: {
      type: 'http',
      behavior: 'classical',
      url: 'https://fastly.jsdelivr.net/gh/AEI-boop/clash_rule@main/MyCustomDirect.list',
      path: './ruleset/MyCustomDirect.list',
      interval: 86400,
      format: 'text',
    },

    // blackmatrix7 Lan 比 ACL4SSR LocalAreaNetwork 更新更及时
    LocalAreaNetwork:  bm7('Lan'),
    UnBan:             acl('UnBan',             'UnBan.list'),
    BanAD:             acl('BanAD',             'BanAD.list'),
    BanProgramAD:      acl('BanProgramAD',      'BanProgramAD.list'),
    // AdGuard 规则比 ACL4SSR BanAD 覆盖更广，作为补充拦截层
    AdGuardFilter:     bm7('AdGuardSDNSFilter'),
    GoogleFCM:         acl('GoogleFCM',         'Ruleset/GoogleFCM.list'),
    GoogleCN:          acl('GoogleCN',          'Ruleset/GoogleCN.list'),
    SteamCN:           acl('SteamCN',           'Ruleset/SteamCN.list'),
    Bing:              acl('Bing',              'Bing.list'),
    OneDrive:          acl('OneDrive',          'OneDrive.list'),
    Microsoft:         acl('Microsoft',         'Microsoft.list'),
    Apple:             acl('Apple',             'Apple.list'),
    Telegram:          acl('Telegram',          'Telegram.list'),
    // AI 规则来自 blackmatrix7，覆盖 ChatGPT/Claude/Gemini 等主流平台，比 ACL4SSR 更全更新
    'AI-OpenAI':       bm7('OpenAI'),
    'AI-Claude':       bm7('Claude'),
    'AI-Gemini':       bm7('Gemini'),
    Epic:              acl('Epic',              'Ruleset/Epic.list'),
    Origin:            acl('Origin',            'Ruleset/Origin.list'),
    Sony:              acl('Sony',              'Ruleset/Sony.list'),
    Steam:             acl('Steam',             'Ruleset/Steam.list'),
    Nintendo:          acl('Nintendo',          'Ruleset/Nintendo.list'),
    YouTube:           acl('YouTube',           'Ruleset/YouTube.list'),
    Netflix:           acl('Netflix',           'Ruleset/Netflix.list'),
    Bahamut:           acl('Bahamut',           'Ruleset/Bahamut.list'),
    // blackmatrix7 版本不含 URL-REGEX，避免 Clash Meta 解析警告
    ChinaMedia:        bm7('ChinaMedia'),
    ProxyMedia:        bm7('GlobalMedia'),
    ProxyGFWlist:      acl('ProxyGFWlist',      'ProxyGFWlist.list'),
    // ChinaMax 比 ACL4SSR ChinaDomain 覆盖更全（含主流国内域名+常见直连服务）
    ChinaDomain:       bm7('ChinaMax'),
    // 文件内容为 IP-CIDR 格式，用 classical
    ChinaCompanyIp:    acl('ChinaCompanyIp',    'ChinaCompanyIp.list'),
    Download:          acl('Download',          'Download.list'),
    NetEaseMusic:      acl('NetEaseMusic',      'Ruleset/NetEaseMusic.list'),
  }

  // ==================== 规则 ====================
  // 从上到下匹配，首次命中即生效，高优先级放前面

  config['rules'] = [
    // 【第一优先级】自定义直连规则
    'RULE-SET,MyCustomDirect,全球直连',
    'RULE-SET,LocalAreaNetwork,全球直连',
    'RULE-SET,UnBan,全球直连',
    'RULE-SET,BanAD,广告拦截',
    'RULE-SET,BanProgramAD,应用净化',
    'RULE-SET,AdGuardFilter,广告拦截',
    'RULE-SET,GoogleFCM,谷歌FCM',
    'RULE-SET,GoogleCN,全球直连',
    'RULE-SET,SteamCN,全球直连',
    'RULE-SET,Bing,微软Bing',
    'RULE-SET,OneDrive,微软云盘',
    'RULE-SET,Microsoft,微软服务',
    'RULE-SET,Apple,苹果服务',
    'RULE-SET,Telegram,电报消息',
    'RULE-SET,AI-OpenAI,AI节点',
    'RULE-SET,AI-Claude,AI节点',
    'RULE-SET,AI-Gemini,AI节点',
    'RULE-SET,Epic,游戏平台',
    'RULE-SET,Origin,游戏平台',
    'RULE-SET,Sony,游戏平台',
    'RULE-SET,Steam,游戏平台',
    'RULE-SET,Nintendo,游戏平台',
    'RULE-SET,YouTube,油管视频',
    'RULE-SET,Netflix,奈飞视频',
    'RULE-SET,Bahamut,国外媒体',
    'RULE-SET,ChinaMedia,国内媒体',
    'RULE-SET,NetEaseMusic,国内媒体',
    'RULE-SET,ProxyMedia,国外媒体',
    'RULE-SET,ProxyGFWlist,节点选择',
    'RULE-SET,ChinaDomain,全球直连',
    'RULE-SET,ChinaCompanyIp,全球直连',
    'RULE-SET,Download,全球直连',

    // 【地理位置规则】no-resolve 避免对 IP 流量再触发 DNS 查询
    'GEOIP,LAN,全球直连,no-resolve',
    'GEOIP,CN,全球直连,no-resolve',

    // 【兜底】上面都不匹配则走代理
    'MATCH,漏网之鱼',
  ]

  return config
}
