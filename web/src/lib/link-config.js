export const DeepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const BaseData = {
  url: "", // 目标地址
  slug: "", // 短链接标识符  
  displayName: "", // 显示名称
  notes: "", // 备注
  mode: "redirect", // 跳转模式
  safety: "off", // 安全设置
  customization: "off", // 自定义设置
  clicks: 0, // 点击次数
};

export const modeList = [
  {
    value: "redirect",
    label: "跳转",
    description: "302 重定向到目标地址",
    icon: "icon-[material-symbols--arrow-forward]",
  },
  {
    value: "remind", 
    label: "提醒",
    description: "用户访问时显示目标地址和备注信息",
    icon: "icon-[material-symbols--info]",
  },
  {
    value: "cloaking",
    label: "隐藏", 
    description: "隐藏目标地址，让用户只看到其中的短链接",
    icon: "icon-[material-symbols--visibility-off]",
  },
  {
    value: "proxy",
    label: "代理",
    description: "通过服务器加载目标地址，同时代理子路径", 
    icon: "icon-[material-symbols--public]",
  },
];

export const AdvancedSettings = [
  {
    label: "Mode",
    icon: "icon-[material-symbols--joystick]",
    options: modeList,
  },
];