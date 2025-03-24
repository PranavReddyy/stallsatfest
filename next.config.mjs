/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['firebasestorage.googleapis.com', 'storage.googleapis.com'],
    },
    webpack: (config, { isServer }) => {
        // For Socket.io support
        if (!isServer) {
            config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
        }
        return config;
    },
}

export default nextConfig;
