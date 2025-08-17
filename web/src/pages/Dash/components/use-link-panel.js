import { ref } from "vue";

const DeepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

const BaseData = {
  url: "", // 目标地址 (改名以匹配表单)
  slug: "", // 短链接标识符
  displayName: "", // 显示名称
  notes: "", // 备注
  mode: "redirect", // 跳转模式
};

const modeList = [
  {
    value: "redirect",
    label: "跳转",
    description: "302 重定向到目标地址",
  },
  {
    value: "remind",
    label: "提醒",
    description: "用户可自行决定是否打开目标链接",
  },
  {
    value: "cloaking",
    label: "隐藏",
    description: "隐藏目标地址，让用户只看到其中的短链接",
  },
  {
    value: "proxy",
    label: "代理",
    description: "通过服务器加载目标地址并显示",
  },
];

const state = ref({
  visible: false,
  isCreate: true,
  formData: DeepClone(BaseData),
  resolve: () => {},
  reject: () => {},
});

const close = (data) => {
  if (data) state.value.resolve();
  else state.value.reject();
  state.value.visible = false;
};
function openLinkPanel(props) {
  const _data = DeepClone(Object.assign({}, BaseData, props));
  state.value.isCreate = !_data.creation;
  state.value.formData = _data;
  state.value.visible = true;
  return new Promise((resolve, reject) => {
    state.value.resolve = resolve;
    state.value.reject = reject;
  });
}

export { state, openLinkPanel, close, DeepClone, BaseData, modeList };
