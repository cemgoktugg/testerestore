import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Medusa backend lives in its own project — typed against Medusa's tsconfig:
    "medusa-backend/**",
  ]),
  {
    // React 19 / eslint-plugin-react-hooks v6 çok katı iki kural. Bizim
    // kullanımlarımızın büyük çoğunluğu GEÇERLİ ve ZORUNLU desenler:
    //   - set-state-in-effect: localStorage/cookie/browser API okuma
    //     (ThemeContext, Analytics, WishlistButton), veri yükleme
    //     (ProductReviews, CustomerContext) ve event aboneliği. Bunlar
    //     SSR-güvenliği için effect içinde OLMAK ZORUNDA — error olarak
    //     zorlamak SSR'ı bozar. Görünür kalsın diye "warn".
    //   - purity: useAsync'te fresh-cache seed için Date.now() (bilinçli,
    //     skeleton flash'ı önlüyor).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
