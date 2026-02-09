import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "countrystatecity-npm/dist/**",
      "countrystatecity-mcp/dist/**",
      "out/**",
      "node_modules/**",
      ".next/**",
    ],
  },
  eslintConfigPrettier,
];
