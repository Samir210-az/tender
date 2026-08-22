/**
 * AZƏRBAYCAN — Dövlət Satınalmaları Hüquqi Konteksti
 *
 * MƏNBƏ: "Dövlət satınalmaları haqqında" Azərbaycan Respublikasının Qanunu
 * № 988-VIQ, 14 iyul 2023-cü il, 1 yanvar 2024-cü il tarixdən qüvvədədir.
 *
 * DİQQƏT: Köhnə qanun (№ 245-IIQ, 27 dekabr 2001) 1 yanvar 2024-də LƏĞV
 * OLUNUB. İnternetdə hələ də köhnə qanunun mətni geniş yayılıb — bu fayl
 * YALNIZ yeni, hazırda qüvvədə olan qanundan doğrulanmış faktları ehtiva edir.
 *
 * BU MODUL NECƏ İSTİFADƏ OLUNUR:
 * Aşağıdakı mətn AI-nin sistem prompt-una ƏLAVƏ REFERANS kimi qoşulur —
 * AI-yə "nəyə diqqət etmək lazımdır" istiqaməti verir. AI bunu HEÇ VAXT
 * tender sənədinin özündən üstün tutmamalıdır: real compliance qərarı
 * yalnız konkret tender sənədində yazılana əsaslanmalıdır. Qanun mətni
 * dəyişə bilər — bu referans mütəmadi yenilənməlidir və hüquqi məsləhət
 * DEYİL, yalnız AI-yə istiqamətverici kontekstdir.
 *
 * Son yoxlama: 2026-08-22 (web axtarışı ilə doğrulanıb)
 */

export const AZ_LEGAL_CONTEXT_VERSION = '2026-08-22-v1';

export const AZ_LEGAL_CONTEXT = `
AZƏRBAYCAN HÜQUQİ KONTEKSTİ (referans, tender sənədinin mətnini üstələmir):

Qüvvədə olan qanun: "Dövlət satınalmaları haqqında" AR Qanunu № 988-VIQ (14.07.2023), 01.01.2024-dən qüvvədə. Köhnə qanun (№ 245-IIQ, 2001) ləğv edilib — köhnə qanuna istinad edən sənədlər diqqətlə yoxlanılmalıdır.

Bu qanuna əsasən bilinən struktur elementlər (referans üçün, YALNIZ tender sənədində uyğun bənd tapılarsa doğrulanmış hesab et):

1. SƏNƏDLƏŞDİRMƏ DİLİ: Satınalmalara dair sənədlər (ixtisas uyğunluğu sənədləri, tender əsas şərtlər toplusu, elan) Azərbaycan Respublikasının dövlət dilində tərtib olunmalıdır. Sənədlər arasında ziddiyyət olarsa, dövlət dilində olan mətnə üstünlük verilir.

2. VAHİD İNTERNET PORTALI: Qapalı tender və məxfi satınalmalar istisna olmaqla, demək olar ki, bütün satınalma prosedurları dövlət satınalmalarının vahid internet portalı vasitəsilə aparılır.

3. TENDER KOMİSSİYASI: Tək sayda (ən azı 5 nəfər) üzvdən ibarət olmalıdır.

4. ŞİKAYƏT MÜDDƏTİ: Təchizatçı hüququnun pozulduğunu bildiyi/bilməli olduğu gündən 15 iş günü ərzində satınalan təşkilata şikayət verə bilər (müqavilə qüvvəyə minənə qədər). Satınalan təşkilat şikayəti 10 iş günü ərzində araşdırıb qərar verir, 1 iş günü ərzində cavab göndərir.

5. MÜQAVİLƏNİN BAĞLANMASI: Elektron açıq tender qalibi ilə müqavilə portalda elektron qaydada bağlanır; satınalan təşkilat aksept edildikdən sonra 3 bank günü ərzində müqaviləni hazırlayıb portala yerləşdirir.

6. YENİ QANUNDA TƏRİFLƏR: benefisiar mülkiyyətçi, çərçivə sazişi, sadə satınalma müqaviləsi, etibarsız təchizatçı (blacklist) anlayışları yeni qanunla təsbit olunub — tender sənədində bu terminlər keçirsə, yeni qanuna istinad ediləcəyi ehtimal olunur.

VACIB QEYDLƏR:
- Bu referans TAM qanun mətni deyil, yalnız bilinən struktur elementlərdir.
- Tender sənədində göstərilən konkret rəqəm/müddət/tələb HƏMİŞƏ bu referansdan üstündür — uyğunsuzluq varsa, sənədin özünə istinad et və "DATA CONFLICT" kimi qeyd et, öz mülahizənlə "düzəltmə".
- Bu referansı istifadə edərək HEÇ VAXT tender sənədində olmayan tələb yaratma — yalnız sənəddə tapılan tələbi düzgün kateqoriyalaşdırmaq üçün kontekst kimi istifadə et.
`.trim();
