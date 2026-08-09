import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    unoptimized: true,
  },
  output: 'export',
};

const withMDX = createMDX();

export default withMDX(config);
