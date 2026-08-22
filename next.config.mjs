/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDF generasiyası üçün DejaVu Sans TTF fayllarının Vercel serverless
  // bundle-ına daxil edildiyindən əmin oluruq (dinamik fs yolları Next.js-in
  // avtomatik file-tracing-i tərəfindən buraxıla bilər).
  outputFileTracingIncludes: {
    '/api/tenders/[id]/generate': ['./node_modules/dejavu-fonts-ttf/ttf/*.ttf'],
  },
};

export default nextConfig;
