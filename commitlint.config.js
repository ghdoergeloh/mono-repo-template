export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Long lines in the body and footer (URLs, log output, paths) are fine:
    // warn only. The header limit stays an error.
    "body-max-line-length": [1, "always", 100],
    "footer-max-line-length": [1, "always", 100],
  },
};
