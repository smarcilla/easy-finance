/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  },
}

module.exports = nextConfig
