import { ref } from "vue";

const BaseData = {
  title: "",
  description: "",
  confirm: "Confirm",
  cancel: "",
  attrs: {},
};
const state = ref({
  visible: false,
  data: { ...BaseData },
  resolve: () => {},
  reject: () => {},
});

const close = (type) => {
  if (type === "confirm") state.value.resolve();
  else state.value.reject();
  state.value.visible = false;
};
function alert(props) {
  state.value.data = { ...BaseData, ...props };
  state.value.visible = true;
  return new Promise((resolve, reject) => {
    state.value.resolve = resolve;
    state.value.reject = reject;
  });
}

export { state, alert, close };
