export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-6 text-center text-xs text-neutral-600">
      <p>© {year} Bütün hüquqları qorunur</p>
      <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block hover:text-neutral-400">
        By securtiy_group
      </a>
    </footer>
  );
}
