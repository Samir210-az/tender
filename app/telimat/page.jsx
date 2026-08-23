export default function TelimatPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-neutral-100">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← Geri</a>

        <h1 className="mt-4 text-3xl font-bold">İstifadə Təlimatı</h1>
        <p className="mt-2 text-neutral-400">
          Tender AI-nin bütün funksiyalarının ətraflı izahı — qeydiyyatdan son sənədin təqdiminə qədər.
        </p>

        <TOC />

        <Section id="umumi" title="1. Tender AI nə edir?">
          <P>
            Tender AI dövlət və özəl tenderlərə qatılan şirkətlər üçün hazırlanıb. Platforma üç əsas işi görür:
          </P>
          <Ul items={[
            'Tender sənədlərini oxuyur, tələbləri (hüquqi, maliyyə, texniki, təcrübə və s.) çıxarır',
            'Bu tələbləri sənin şirkət profilinlə müqayisə edir, uyğun olub-olmadığını göstərir',
            'Uyğunluq nəticələrinə əsasən real, rəsmi formata uyğun Texniki Təklif və Qiymət Cədvəli hazırlayır',
          ]} />
          <Warn>
            Vacib prinsip: sistem heç vaxt yoxdan məlumat uydurmur. Şirkət profilində olmayan sertifikat,
            layihə və ya rəqəm heç vaxt "var" kimi göstərilmir — "məlumat yoxdur" yazılır. Bu, qəsdən belədir:
            yalan uyğunluq real tenderdə sənin əleyhinə işləyər.
          </Warn>
        </Section>

        <Section id="qeydiyyat" title="2. Qeydiyyat və Giriş">
          <P>
            Əsas səhifədə "Başla" ilə qeydiyyatdan keçirsən (şirkət adı, telefon, PIN, aylıq/illik plan).
            Qeydiyyat göndəriləndən sonra ödəniş WhatsApp vasitəsilə təsdiqlənir, admin tərəfindən
            aktivləşdirilirsən.
          </P>
          <P>
            Başqa cihazdan/brauzerdən daxil olmaq üçün "Artıq hesabım var — Giriş" düyməsindən
            telefon + PIN ilə giriş edə bilərsən.
          </P>
        </Section>

        <Section id="sirket-profili" title="3. Şirkət Profili — ən vacib addım">
          <P className="font-medium text-amber-400">
            Bu, bütün sistemin ən vacib hissəsidir. AI yalnız burada yazdığın məlumatlarla işləyir —
            nə qədər dolğun və dəqiq doldursan, uyğunluq nəticələri bir o qədər düzgün olacaq.
          </P>
          <P>Bunu <b>/company</b> səhifəsindən idarə edirsən. Doldurulmalı bölmələr:</P>

          <SubHeading>3.1. Əsas məlumatlar</SubHeading>
          <Ul items={[
            'Hüquqi ad, VÖEN, hüquqi ünvan — dəqiq, rəsmi sənədlərdəki kimi',
            'Fəaliyyət sahələri — hansı sektorlarda işləyirsən (tikinti, İKT, konsaltinq və s.)',
            'İşçi sayı — bəzi tenderlər minimum işçi sayı tələb edir',
            'Dövriyyə (son 2 il) — demək olar hər tenderdə "maliyyə tələbi" bölməsi buna baxır',
          ]} />

          <SubHeading>3.2. Analoji layihələr (təcrübə)</SubHeading>
          <P>
            Hər analoji layihə üçün: ad, müştəri, müqavilə dəyəri, başlama/bitmə tarixi, təsvir.
            "Minimum 3 il təcrübə" və ya "500,000 AZN-lik analoji layihə" kimi tələblər birbaşa buradan
            yoxlanılır. Nə qədər çox real layihə əlavə etsən, təcrübə tələbləri bir o qədər güclü qarşılanır.
          </P>
          <Warn>
            Diqqət: bitmə tarixini bugünkü və ya gələcək tarix qoyma, əgər layihə həqiqətən tamamlanmayıbsa —
            sistem bunu avtomatik ziddiyyət kimi tuta və xəbərdarlıq verə bilər.
          </Warn>

          <SubHeading>3.3. Sənədlər</SubHeading>
          <P>
            Hüquqi (qeydiyyat şəhadətnaməsi və s.), maliyyə (hesabatlar), sertifikat, lisenziya, referans
            məktubları. Sertifikat/lisenziya yükləyərkən <b>bitmə tarixini</b> də göstər — sistem müddəti
            bitənləri avtomatik xəbərdarlıq edir.
          </P>

          <SubHeading>3.4. Məhsul/Xidmət kataloqu</SubHeading>
          <P>
            Təkrar satdığın məhsul/xidmətlərin adı və qiyməti. Bu, Qiymət Cədvəli hazırlayanda avtomatik
            qiymət təklifi üçün istifadə olunur (aşağıda, 6-cı bölmə).
          </P>

          <SubHeading>3.5. Sənəd yazı üslubu və imza bloku</SubHeading>
          <P>
            Yazı üslubunu (rəsmi/texniki/qısa) seç. "İmzalayan şəxs" və "Vəzifə" sahələrini doldur —
            bunlar hazırlanan sənədlərin imza blokunda avtomatik istifadə olunur.
          </P>
        </Section>

        <Section id="tender-daxil-et" title="4. Tenderi sistemə daxil etmək">
          <P>İki yol var:</P>

          <SubHeading>4.1. Sənəddən avtomatik yaratmaq (tövsiyə olunur)</SubHeading>
          <P>
            Əsas səhifədə <b>"📄 Sənəddən yarat"</b> düyməsi ilə elan olunmuş tenderin sənədini
            (PDF/DOCX/şəkil) birbaşa yüklə. AI sənədi oxuyur, tender adını, satınalan təşkilatın adını,
            son tarixi və tender nömrəsini <b>özü tapıb doldurur</b>, tender avtomatik yaranır və
            yüklədiyin fayl ona ilk sənəd kimi əlavə olunur.
          </P>
          <P>
            AI-nin tapdığı məlumat səhv və ya natamam ola bilər — tender səhifəsində başlığın yanındakı
            "✎ Redaktə et" ilə istənilən vaxt düzəldə bilərsən.
          </P>

          <SubHeading>4.2. Əl ilə yaratmaq</SubHeading>
          <P>
            "+ Yeni tender" ilə ad, təşkilat, son tarix, yurisdiksiyanı özün yazıb yaradırsan, sonra
            sənədləri ayrıca yükləyirsən.
          </P>

          <SubHeading>4.3. Sənədi analiz etmək</SubHeading>
          <P>
            Hər yüklənən sənədin yanında <b>"Analiz et"</b> düyməsi var. Basanda AI sənədi oxuyur,
            kateqoriyalaşdırır (elan/texniki şərtnamə/maliyyə forması və s.) və içindəki hər konkret
            tələbi ayrıca maddə kimi çıxarır — kateqoriya, məcburi/opsional, mənbə sitatı, etibarlılıq
            səviyyəsi ilə birlikdə. Adi PDF/DOCX/XLS Groq ilə, skan olunmuş sənəd və şəkillər Gemini
            (vizual AI) ilə analiz olunur — sən heç nə seçmirsən, sistem özü müəyyən edir.
          </P>
        </Section>

        <Section id="uygunluq" title="5. Uyğunluğu yoxlamaq">
          <P>
            Bir və ya bir neçə sənəd analiz olunduqdan sonra, Tələblər bölməsinin yuxarısında
            <b> "Uyğunluğu yoxla"</b> düyməsi görünür. Basanda hər tələb şirkət profilinlə müqayisə olunur:
          </P>
          <Ul items={[
            '✓ Uyğundur — profil datası tələbi tam qarşılayır, konkret dəlil göstərilir',
            '~ Qismən uyğun — datan var, amma tələbdən azdır (məs. dövriyyə çatışmır)',
            '✗ Uyğun deyil — açıq şəkildə uyğun gəlmir',
            'Məlumat yoxdur — profildə bu barədə heç nə tapılmadı',
            'Aidiyyatı yoxdur — tələb sənə aid deyil',
            'Yoxlanılmalıdır — qeyri-müəyyən, özün qərar ver',
          ]} />
          <P>
            Nəticədə həm ümumi <b>Tender Readiness</b> balı (kateqoriya üzrə faiz), həm də
            <b> "Tenderə qatılaqmı?"</b> paneli (BƏLİ/NƏZƏRDƏN KEÇİR/YOX, səbəblərlə) görünür.
            Bu, qərar-dəstək vasitəsidir — son qərarı sən verirsən.
          </P>
        </Section>

        <Section id="texniki-teklif" title="6. Texniki Təklif hazırlamaq (FORMA 1)">
          <P>
            Uyğunluq yoxlaması bitdikdən sonra "Sənəd hazırla" bölməsində <b>"Hazırla"</b> düyməsi aktiv
            olur. Sistem DOCX + PDF formatında, rəsmi FORMA 1 strukturuna uyğun sənəd yaradır: ünvanlayıcı
            bloku, rəsmi bəyanat bəndləri (a–j), örtük məktubu, şirkət təqdimatı, uyğunluq bəyanatı,
            imza bloku.
          </P>
          <P>
            Hazırlandıqdan sonra ikinci bir AI keçidi (Final Verification) mətni yenidən yoxlayır —
            uydurma iddia, səhv rəqəm/tarix axtarır. Nəticə sənədin altında görünür.
          </P>
          <Warn>Bu sənəd AI tərəfindən yaradılıb — təqdim etməzdən əvvəl mütləq özün oxu və yoxla.</Warn>
        </Section>

        <Section id="qiymet-teklifi" title="7. Qiymət Cədvəli hazırlamaq (FORMA 2)">
          <P>
            Tender səhifəsində "Maliyyə Təklifi" bölməsində sətir-sətir əlavə edirsən: təsvir, ölçü
            vahidi, miqdar. Təsvir kataloqundakı məhsul adına bənzərsə, qiymət avtomatik təklif olunur
            (dəyişə bilərsən). Bütün sətirlərə qiymət daxil edəndən sonra "Cədvəli hazırla" — real FORMA 2
            strukturunda (Preambula + cədvəl + yekun cəm) DOCX/PDF yaranır.
          </P>
          <P>
            Bu sənəddə qiymətlər AI tərəfindən <b>yaradılmır</b> — birbaşa sənin daxil etdiyin rəqəmlərdir.
          </P>
        </Section>

        <Section id="paket" title="8. Təqdimat Paketi">
          <P>
            Hər iki sənəd hazır olanda, ən aşağıda "Təqdimat Paketi" bölməsində <b>"ZIP hazırla"</b> —
            Texniki Təklif + Qiymət Cədvəlini (DOCX+PDF) bir ZIP faylında birləşdirir, təqdimata hazır edir.
          </P>
        </Section>

        <Section id="meslehet" title="9. Müsbət nəticə üçün məsləhətlər">
          <Ul items={[
            'Şirkət profilini boş qoyma — hər boş sahə "Məlumat yoxdur" kimi işarələnəcək',
            'Bütün analoji layihələrini əlavə et, hətta kiçik olsa belə — təcrübə tələbləri kumulyativ qiymətləndirilir',
            'Sertifikat/lisenziyaların bitmə tarixini dəqiq yaz — müddəti bitmiş sənəd real tenderdə rədd səbəbi ola bilər',
            'Dövriyyə rəqəmlərini illik hesabatlara uyğun, dəqiq yaz',
            'Tender sənədini yükləyəndən sonra MÜTLƏQ "Analiz et" et — bunsuz uyğunluq yoxlaması işləməyəcək',
            'AI-nin hazırladığı hər sənədi təqdim etməzdən əvvəl özün oxu — sistem çox diqqətli olsa da, son yoxlama sənindir',
          ]} />
        </Section>

        <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Sualın olsa, WhatsApp vasitəsilə əlaqə saxla — dəstək xəttimiz qeydiyyat ekranında göstərilir.
        </div>
      </div>
    </main>
  );
}

function TOC() {
  const items = [
    ['umumi', '1. Tender AI nə edir?'],
    ['qeydiyyat', '2. Qeydiyyat və Giriş'],
    ['sirket-profili', '3. Şirkət Profili'],
    ['tender-daxil-et', '4. Tenderi daxil etmək'],
    ['uygunluq', '5. Uyğunluğu yoxlamaq'],
    ['texniki-teklif', '6. Texniki Təklif (FORMA 1)'],
    ['qiymet-teklifi', '7. Qiymət Cədvəli (FORMA 2)'],
    ['paket', '8. Təqdimat Paketi'],
    ['meslehet', '9. Məsləhətlər'],
  ];
  return (
    <nav className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Mündəricat</p>
      <ul className="space-y-1 text-sm">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-indigo-400 hover:text-indigo-300">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="text-xl font-bold text-neutral-50">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }) {
  return <h3 className="mt-4 text-sm font-semibold text-neutral-200">{children}</h3>;
}

function P({ children, className = '' }) {
  return <p className={`text-sm leading-relaxed text-neutral-400 ${className}`}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul className="ml-1 space-y-1.5 text-sm text-neutral-400">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-emerald-500">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Warn({ children }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-300">
      ⚠ {children}
    </div>
  );
}
