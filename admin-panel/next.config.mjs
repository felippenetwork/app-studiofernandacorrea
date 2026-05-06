import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use realpathSync to get the canonical Windows path.
// This prevents Node.js from loading the same module twice
// under different casings (e.g. C:\projetos vs C:\Projetos),
// which would create two React instances and break all hooks.
const realRoot = fs.realpathSync(__dirname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.join(realRoot, 'node_modules'),
      'node_modules',
    ];
    return config;
  },
};

export default nextConfig;
