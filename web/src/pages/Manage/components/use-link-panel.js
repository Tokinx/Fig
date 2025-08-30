import { ref } from "vue";
import { DeepClone, BaseData, modeList } from "@/lib/link-config";

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

export { state, openLinkPanel, close };
