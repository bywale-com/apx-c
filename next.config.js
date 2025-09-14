/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase from default 1mb to 50mb
    },
  },
}

module.exports = nextConfig
