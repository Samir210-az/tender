/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit fs-ə bağlı (AFM font metrikaları) və webpack bundling ilə build
  // zamanı xəta verir ("path argument must be of type string"). Bu paketi
  // Next.js-in bundle etməsinin qarşısını alıb runtime-da native Node
  // require ilə yükləməyə məcbur edirik.
  serverExternalPackages: ['pdfkit', 'dejavu-fonts-ttf'],
  outputFileTracingIncludes: {
    '/api/tenders/[id]/generate': ['./node_modules/dejavu-fonts-ttf/ttf/*.ttf'],
  },
};

export default nextConfig;
