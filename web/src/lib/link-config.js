import { i18n } from '@/locales'

export const DeepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const BaseData = {
  url: "", // 目标地址
  slug: "", // 短链接标识符
  displayName: "", // 显示名称
  notes: "", // 备注
  mode: "redirect", // 跳转模式
  passcode: "", // 访问密码
  clicks: 0, // 点击次数
};

// 获取国际化的模式列表
export function getModeList() {
  const { t } = i18n.global
  return [
    {
      value: "redirect",
      label: t('modes.redirect'),
      description: t('modes.redirectDesc'),
    },
    {
      value: "remind",
      label: t('modes.remind'),
      description: t('modes.remindDesc'),
    },
    {
      value: "cloaking",
      label: t('modes.cloaking'),
      description: t('modes.cloakingDesc'),
    },
    {
      value: "proxy",
      label: t('modes.proxy'),
      description: t('modes.proxyDesc'),
    },
  ]
}

// 为了向后兼容，保留原有的modeList导出
export const modeList = [
  {
    value: "redirect",
    label: "跳转",
    description: "302 重定向到目标地址",
  },
  {
    value: "remind",
    label: "提醒",
    description: "用户访问时显示目标地址和备注信息",
  },
  {
    value: "cloaking",
    label: "隐藏",
    description: "隐藏目标地址，让用户只看到其中的短链接",
  },
  {
    value: "proxy",
    label: "代理",
    description: "通过服务器加载目标地址，同时代理子路径",
  },
];

export const AdvancedSettings = [
  {
    label: "Mode",
    options: modeList,
  },
];
