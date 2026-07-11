# CLAUDE.md

## Proje: DaD Build Designer

Dark and Darker için Path of Building benzeri build tasarım aracı. **Kullanıcının ilk
uygulama geliştirme projesi — amaç süreçte öğrenmek.** Adımları açıklayarak ilerle,
hazır sonuç fırlatma; kararları gerekçeleriyle anlat. Açıklamalar Türkçe.

> **DİL KURALI (kullanıcı kararı, 2026-07-11):** Tüm veri dosyaları, kod, yorumlar,
> UI metinleri ve commit mesajları **İngilizce** — Türkçe karakter ve çeviriyle
> uğraşılmayacak. Yalnızca kullanıcıyla sohbet Türkçe.

## Çekirdek tasarım

- **Data-first:** oyun verisi `data/*.json` içinde sürümlenir (patch gelince veri güncellenir, kod değişmez).
- Uygulamanın kalbi saf fonksiyon: `computeStats(class, perks, skills, gear, enchants) → statlar`.
- Statlar lineer DEĞİL: `data/stat_curves.json` parçalı-doğrusal breakpoint eğrileri
  (points=[[girdi,çıktı],...], ara değer lineer interpolasyon).
- Planlanan stack: TypeScript + React + Vite, backend yok, statik JSON.

## Veri kaynakları (kritik bilgi)

- **darkanddarker.wiki.gg bu ağdan ERİŞİLEMEZ (401, IP engeli).**
  Ayna kullan: `darkanddarker.wiki.spellsandguns.com` (WebFetch ile çalışıyor).
- Item veritabanı: `api.darkerdb.com/v1/items` (çalışıyor, şema docs/kaynaklar.md'de).
- Doğrulama durumu ve eksikler: `docs/kaynaklar.md`.

## Durum (2026-07-11)

- Faz 0-1 tamam: Fighter (base stat, 15 perk, 12 skill, silah/zırh listeleri),
  stat eğrileri (PP bonus, HP, move/action speed, PDR tablosu...), rarity→enchantment kuralları.
- Faz 2 tamam: `src/engine/` — `curves.ts` (parçalı-doğrusal interpolasyon),
  `computeStats.ts` (saf fonksiyon; ExternalModifiers ile gear girdilerine hazır),
  `validateBuild.ts` (slot/duplicate/id kuralları), `data.ts` (JSON bağlayıcı).
  24 birim testi: `npm test` (vitest), typecheck: `npm run typecheck`.
- Faz 3 tamam: MVP UI — `src/App.tsx` + `src/ui/` (PickList, StatPanel).
- Faz 4 tamam: **gear & enchantment sistemi.**
  - `scripts/fetch-items.mjs`: darkerdb'den 1639 ekipman → `data/items/items.json` (1.5 MB).
    API tuzakları: sayfa 1 dar şema (detay çağrısı gerekir), sayfa 2+ geniş şema (tüm
    attribute'lar satırda); detay ucu effect_* adları + yüzdeleri ONDA-BİR olarak tutar,
    geniş satırlar düz ad + gerçek yüzde. items.json GENİŞ ada + gerçek yüzdeye normalize.
  - `src/engine/itemStats.ts`: ATTR_RULES (attribute/flat/percent), gearTotals (perfect-roll
    base + seçilen enchant rollleri). `gearRules.ts`: slot yasallığı — Fighter silah listesi
    fighter.json'dan; Weapon Mastery → tüm silahlar, Slayer → plate yasak; 2H → off-hand kilit.
  - UI: `GearPanel.tsx` (11 slot, item seçici, rarity→N enchant satırı, havuzdan seçim,
    min/max kelepçeli roll input). GearPreview kaldırıldı.
  - Tarayıcıda doğrulandı: Legendary Longsword → WD 41, MS 270, 4 enchant slotu, off-hand
    kilitli; Action Speed enchant +3% statlara yansıyor. 40 birim testi yeşil.
- Sıradaki: **Faz 5** — (a) build kaydet/paylaş (localStorage + URL hash), (b) diğer 9 sınıf
  (`data/api/classes.json` çekildi — base attribute içeriyor mu bak; yoksa wiki aynasından).
- TODO'lar JSON dosyalarının `_todo` alanlarında ve docs/kaynaklar.md'de.
- **required_class bit maskesi hâlâ çözülmedi** (Fighter için gerek yoktu — isim listesi
  kullanılıyor). Yeni sınıflar eklerken ya maskeyi ampirik çöz ya da sınıf başına silah
  listesi kur.

## Oyun kuralları özeti

- 7 ana attribute: STR, VIG, AGI, DEX, WILL, KNOW, RES (sınıf bazları toplamı 105).
- Bileşik rating'ler: Health = 0.25·STR + 0.75·VIG; Action Speed = 0.25·AGI + 0.75·DEX;
  Interaction = 0.25·DEX + 0.75·RES.
- Rarity → enchantment: Poor/Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 4, Unique 5 (craft +1).
- Fighter: 4 perk slotu (lv15), 2 skill slotu, base tüm statlar 15 → 125 HP.
