const AZ_MONTHS = {
  yanvar: 0, fevral: 1, mart: 2, aprel: 3, may: 4, iyun: 5,
  iyul: 6, avqust: 7, sentyabr: 8, oktyabr: 9, noyabr: 10, dekabr: 11,
};

/**
 * "15 oktyabr 2026, 17:00", "15 oktyabr 2026-cı il", "15.10.2026" kimi
 * formatları ISO 8601-ə çevirir. Format tanınmırsa (qeyri-müəyyəndirsə),
 * TƏXMİN ETMİR — null qaytarır ki, çağıran kod orijinal mətni saxlasın.
 *
 * @returns {string|null} ISO 8601 datetime, ya da null
 */
export function parseAzDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim().toLowerCase();

  // Artıq ISO formatındadırsa, birbaşa doğrula və qaytar
  const isoAttempt = new Date(raw);
  if (!isNaN(isoAttempt.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(raw.trim())) {
    return isoAttempt.toISOString();
  }

  // "15 oktyabr 2026" / "15 oktyabr 2026-cı il" / "15 oktyabr 2026, 17:00"
  const monthNamePattern = /(\d{1,2})\s+([a-zəğıöüşç]+)\s+(\d{4})(?:[^\d]*?(\d{1,2}):(\d{2}))?/i;
  const match = text.match(monthNamePattern);
  if (match) {
    const [, day, monthName, year, hour, minute] = match;
    const monthIndex = AZ_MONTHS[monthName];
    if (monthIndex !== undefined) {
      // Azərbaycan Bakı vaxtı ilə yazılıb (UTC+4, DST yoxdur) — UTC-yə
      // çevirmək üçün saatdan 4 çıxırıq (Date.UTC mənfi/aşan dəyərləri
      // avtomatik düzgün normallaşdırır).
      const localHour = hour ? parseInt(hour, 10) : 0;
      const d = new Date(Date.UTC(
        parseInt(year, 10),
        monthIndex,
        parseInt(day, 10),
        localHour - 4,
        minute ? parseInt(minute, 10) : 0
      ));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // "15.10.2026" / "15/10/2026"
  const numericPattern = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/;
  const numMatch = text.match(numericPattern);
  if (numMatch) {
    const [, day, month, year] = numMatch;
    const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), -4));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Tanınmadı — uydurmaq əvəzinə null qaytarırıq
  return null;
}
