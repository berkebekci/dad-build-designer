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
- Faz 5a tamam: build kaydet/paylaş — `buildCodec.ts` (base64url), localStorage otokayıt,
  `#b=` hash'ten yükleme, `sanitizeBuild` (güvensiz girdi ayıklama). Tarayıcıda round-trip ✓.
- Faz 5b tamam: **10 sınıfın tamamı.** `data/classes/*.json` (perk/silah: wiki aynası;
  base stat + skill: API, `scripts/build-classes.mjs` merge eder — sadece BOŞ alanları doldurur).
  - **required_class bit maskesi ÇÖZÜLDÜ** (silah listesi × mask kesişimiyle, çıkış sırası):
    fighter=1, barbarian=2, rogue=4, ranger=8, wizard=16, cleric=32, bard=64, warlock=128,
    druid=256, sorcerer=512. `class_mask` her sınıf dosyasında.
  - gearRules maske-öncelikli: item.classMask & class_mask; maskesiz iteme isim-listesi/
    malzeme fallback. Perk kancaları (`perk_gear_hooks`): weapon_mastery→tüm silahlar,
    slayer→plate yasak, demon_armor→plate açılır, spear_proficiency→mızraklar.
  - 48 birim testi yeşil; prod build ✓ (chunk uyarısı: items.json 1.5MB → ileride code-split).
- Faz 6 tamam (kullanıcının 5 önerisi, 2026-07-12):
  1. Item seçici yeniden tasarlandı: arama → arketip önerisi → renkli rarity çipleri
     (`ItemPicker`, GearPanel.tsx). Rarity değişince enchant'lar korunur, yeni havuza
     kelepçelenir (`carryEnchants`).
  2. Max Health & Move Speed tam sayı gösterimi (Math.round); MS yanında oyun yüzdesi
     (330 MS = %100).
  3. Silah vuruş kombosu hasarları: `data/rules/weapon_hits.json` (35 silah, wiki
     "Impact Zones" hücrelerinden birebir; riposte dahil). Eksik silahlar tek %100
     vuruş fallback'i alır (Haze Blade, Magic/Ceremonial Staff, Pavise, shield bash).
  4. Hasar simülatörü: `engine/damage.ts` — wiki'nin resmî formül sırası; dummy PDR/MDR/
     headshot-reduction ayarlı; bölge çarpanları `data/rules/combat.json`
     (head 1.5, body 1.0, arms 0.8, hands 0.7, legs 0.6, feet 0.5). UI: DamageSimPanel.
  5. Armor/Magic Penetration hesaba dahil: effDR = DR × (1 − pen) (pen yalnızca saldırana
     yarar). Headshot Damage Bonus (gear) kafa vuruşlarına uygulanır.
  - ÖNEMLİ refaktör: additional_ ve true_ hasarlar AYRI kovalarda (formülde farklı
    aşamalarda girerler); additional_weapon_damage artık gearWeaponDamage (combo/zone
    SONRASI eklenir). 59 test yeşil.
- Faz 7 tamam (kullanıcının 2. geri bildirim listesi, 2026-07-12):
  1. ItemPicker odaklanınca TAM arketip listesi açılır (boş sorguda; scrollable);
     öneriler onMouseDown ile seçilir (blur yarışı yok).
  2. Unique rarity enchantment sayısı 5→1 düzeltildi (IronMace değişikliği).
  3-5. SPELL SİSTEMİ: `data/spells/spells.json` (6 caster; maliyet=tier varsayımı,
     Bard şarkıları/Sorcerer merged maliyetsiz). `engine/spells.ts`:
     hasar=(base+staff Magical Damage)×(1+MPBonus×scaling) vs dummy MDR+MagicPen;
     projectile'lar headshot alır; heal dummy'den bağımsız. Memory Capacity meter
     (aşımda kırmızı uyarı). Staff "magical_damage" artık spellFlatDamage kovası
     (melee DEĞİL — Crystal Sword tarzı magic_weapon_damage melee'de kalır).
  4. MR→MDR eğrisi eklendi (wiki tablosu, cap %65; Will 15→%13.8). StatPanel
     Defense: MDR% kalıcı satır. Damage sekmesi dummy'si: Armor Rating SAYI girişi
     → PDR eğriden türetilip gösterilir; MDR % girişi; headshot red %.
  6. Sekmeli UI: Class (perk/skill/spell) | Gear & Stats | Damage (interaktif:
     dummy config + silah vuruş tablosu + spell hasar tablosu).
  7. Reset düzeltildi: resetNonce ile ItemPicker'lar remount (orta-seçim temizlenir).
  - buildCodec v1 + opsiyonel 'm' (spellIds) alanı — eski linkler çalışır.
  - 66 test yeşil. NOT: panel odak testleri headless'ta güvenilmez
    (document.hasFocus()=false → focus olayı bastırılır; focusin manuel dispatch ile
    doğrulandı).
- Faz 9 tamam (tester feedback + dnd.wiki UI incelemesi, 2026-07-12):
  - **KRİTİK ikon düzeltmesi:** İki hata vardı. (1) Ayna resim host'u yanlıştı —
    `www.spellsandguns.com` 404, doğrusu `darkanddarker.wiki.spellsandguns.com`.
    (2) Item thumbnail'ları 96px'te YOK (400) — tam-boy `/images/X/YY/Name.png`
    her zaman çözülüyor. Her iki fetch script'i düzeltildi; icons.json + spells +
    class dosyaları toplu değiştirildi (554 URL). Tarayıcıda 27/27 yetenek +
    41/41 item ikonu yükleniyor. darkerdb CDN ikonları (cdn.darkerdb.com) zaten
    çalışıyordu; sadece ayna-kaynaklı olanlar bozuktu.
  - **Artifact + legend rarity:** DB'de `artifact` (25 silah, en üst tier) ve
    `legend` (2 başlangıç item'i, veri tuhaflığı) tanımsızdı → görünmez/bozuktu.
    artifact tier eklendi (order 7, renk #ff4dd2, filtre çipi); legend →
    legendary alias'landı (rarity_aliases, data.ts tierFor). Artifact enchant
    sayısı 1 varsayıldı (VERİFY gerek — _todo).
  - **2H off-hand motor-seviyesi zorlaması:** UI slotu gizliyordu ama kalıcı/
    paylaşılan build (eski localStorage: 2H + off-hand) off-hand'i gizli tutup
    STATLARA katıyordu. `normalizeLoadout` (gearRules) 2H primary'de secondary'yi
    düşürür; toEngineLoadout VE sanitizeBuild'de uygulanır. Doğrulandı: Magic Staff
    (2H) + Crystal Ball paylaşım linki → yalnız primary kalıyor, off-hand disabled.
  - Görsel yenileme: PickList/SpellPanel artık ikon-karo grid'i; item seçicide
    ikonlar + rarity filtre çipleri + "named" rozeti. NumberField (0-yapışması ve
    negatif giriş düzeltmesi).
  - **Veri notu:** class JSON weapon name-list'leri (ör. wizard'da "Longsword")
    item mask'leriyle çelişebilir; mask (`required_class`) YÖNETİR (nativelyEquippable),
    name-list yalnız mask'siz item fallback'i. Longsword mask=641 (fighter/warlock/
    sorcerer), wizard değil — stale liste zararsız.
  - 76 test yeşil.
- Kalan fikirler: DPS/eHP metrikleri; skill/spell buff toggle sistemi (dnd.wiki
  tarzı, statlara canlı işleyen — EN BÜYÜK oynanış değeri); canavar hedefleri + TTK
  (dnd.wiki'de Skeleton Warlord HP 4344, undead ırkı → Undead/Demon Damage statları
  devreye girer); spell cost=tier oyun-içi doğrulama; items.json dynamic import;
  class JSON weapon-list temizliği (opsiyonel).
- TODO'lar JSON dosyalarının `_todo` alanlarında ve docs/kaynaklar.md'de.

## Oyun kuralları özeti

- 7 ana attribute: STR, VIG, AGI, DEX, WILL, KNOW, RES (sınıf bazları toplamı 105).
- Bileşik rating'ler: Health = 0.25·STR + 0.75·VIG; Action Speed = 0.25·AGI + 0.75·DEX;
  Interaction = 0.25·DEX + 0.75·RES.
- Rarity → enchantment: Poor/Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 4, Unique 5 (craft +1).
- Fighter: 4 perk slotu (lv15), 2 skill slotu, base tüm statlar 15 → 125 HP.
