/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit fs-ə bağlı (AFM font metrikaları) və webpack bundling ilə build
  // zamanı xəta verir. Bu paketi Next.js-in bundle etməsinin qarşısını alıb
  // runtime-da native Node require ilə yükləməyə məcbur edirik.
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
