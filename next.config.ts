/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "leopackersandmovers.com",
        pathname: "/intercity/images/**",
      },
    ],
  },
};

module.exports = nextConfig;
