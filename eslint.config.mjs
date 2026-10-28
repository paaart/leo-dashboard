import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // Existing components intentionally load and reset local state from
      // effects; keep the pre-Next-16 lint behavior for this codebase.
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default eslintConfig;
