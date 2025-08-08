/** @type {import('next').NextConfig} */
const nextConfig = {
  // Chrome 확장 프로그램 관련 에러 방지
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self';",
        },
      ],
    },
  ],
  
  // 개발 모드에서 외부 스크립트 에러 무시
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig