# CLAUDE.md

## Proje: DaD Build Designer

Dark and Darker için Path of Building benzeri build tasarım aracı. **Kullanıcının ilk
uygulama geliştirme projesi — amaç süreçte öğrenmek.** Adımları açıklayarak ilerle,
hazır sonuç fırlatma; kararları gerekçeleriyle anlat. Açıklamalar Türkçe.

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
- Sıradaki: **Faz 2 — hesap motoru** (computeStats + testler, UI'sız).
- TODO'lar JSON dosyalarının `_todo` alanlarında ve docs/kaynaklar.md'de.

## Oyun kuralları özeti

- 7 ana attribute: STR, VIG, AGI, DEX, WILL, KNOW, RES (sınıf bazları toplamı 105).
- Bileşik rating'ler: Health = 0.25·STR + 0.75·VIG; Action Speed = 0.25·AGI + 0.75·DEX;
  Interaction = 0.25·DEX + 0.75·RES.
- Rarity → enchantment: Poor/Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 4, Unique 5 (craft +1).
- Fighter: 4 perk slotu (lv15), 2 skill slotu, base tüm statlar 15 → 125 HP.
