export const DeepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const BaseData = {
  url: "",
  slug: "",
  mode: "redirect",
  safety: "off",
  customization: "off",
  clicks: 0,
};

export const AdvancedSettings = [
  {
    label: "Mode",
    icon: "icon-[material-symbols--joystick]",
    options: [
      {
        value: "redirect",
        label: "Redirect",
        description: "302 redirects to the target address.",
      },
      {
        value: "remind",
        label: "Remind",
        description:
          "It is up to the user to choose whether to open the target link.",
      },
      {
        value: "cloaking",
        label: "Cloaking",
        description:
          "Mask your destination URL so your users only see the short link in.",
      },
      {
        value: "proxy",
        label: "Proxy",
        description:
          "Proxy the destination address through the server and display.",
      },
    ],
  },
  // {
  //   label: "Customization",
  //   icon: "icon-[material-symbols--dashboard-customize-rounded]",
  //   options: [
  //     {
  //       value: "off",
  //       label: "Off",
  //       description: "Support rich rule judgment",
  //     },
  //     {
  //       value: "on",
  //       label: "On",
  //       description: "Matching relationships, regular expression support",
  //       types: [
  //         { type: "Headers", value: "" },
  //         { type: "User-Agent", value: "" },
  //         { type: "Language", value: "" },
  //         { type: "IP Address", value: "" },
  //       ],
  //     },
  //   ],
  // },
];
