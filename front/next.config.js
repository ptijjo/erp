/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  async redirects() {
    return [
      {
        source: "/dashboard/organisations",
        destination: "/dashboard/hq/organisations",
        permanent: false,
      },
      {
        source: "/dashboard/organisations/:path*",
        destination: "/dashboard/hq/organisations/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/fournisseurs",
        destination: "/dashboard/hq/fournisseurs",
        permanent: false,
      },
      {
        source: "/dashboard/fournisseurs/:path*",
        destination: "/dashboard/hq/fournisseurs/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/categories",
        destination: "/dashboard/hq/categories",
        permanent: false,
      },
      {
        source: "/dashboard/categories/:path*",
        destination: "/dashboard/hq/categories/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/caisse",
        destination: "/dashboard/subsidiary/caisse",
        permanent: false,
      },
      {
        source: "/dashboard/caisse/:path*",
        destination: "/dashboard/subsidiary/caisse/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/compte",
        destination: "/dashboard/subsidiary/compte",
        permanent: false,
      },
      {
        source: "/dashboard/compte/:path*",
        destination: "/dashboard/subsidiary/compte/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/spirituel",
        destination: "/dashboard/evenements",
        permanent: false,
      },
      {
        source: "/dashboard/spirituel/:path*",
        destination: "/dashboard/evenements/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/synthese-commandes",
        destination: "/dashboard/comptabilite",
        permanent: false,
      },
    ];
  },
};

export default config;
