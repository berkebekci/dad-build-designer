# DaD Build Designer

**Dark and Darker için build tasarım aracı** — Path of Building Community'den ilham alan,
oyunun gerçek kuralları ve verileriyle çalışan bir teorycraft uygulaması.

## Ne yapar?

1. **Sınıf seç** → perk ve skill slotlarını oyundaki kurallarla doldur (4 perk, 2 skill)
2. **Ekipman kuşan** → sınıfının kullanabildiği silah/zırhlar arasından seç
3. **Enchantment** → item rarity'sine göre açılan slotlara (Uncommon 1 → Unique 5) oyunun
   izin verdiği havuzdan enchantment seç
4. **Sonucu gör** → nihai statlar (Strength, Agility, Action Speed, Move Speed, PDR...)
   oyunun gerçek breakpoint eğrileriyle canlı hesaplanır

## Mimari (data-first)

```
data/          ← oyun verisi (JSON, sürümlenebilir — patch gelince sadece bu güncellenir)
  stat_curves.json          stat breakpoint eğrileri (parçalı-doğrusal)
  classes/fighter.json      sınıf: base stat, perk, skill, silah/zırh listeleri
  rules/rarity_enchantments.json   rarity → enchantment kuralları
src/           ← (Faz 2+) hesap motoru + UI (TypeScript + React + Vite)
docs/          ← kaynaklar, kararlar, doğrulama notları
```

Çekirdek fikir: uygulama özünde tek bir saf fonksiyondur —
`computeStats(class, perks, skills, gear, enchants) → statTablosu`

## Yol haritası

- [x] **Faz 0 — Veri keşfi:** kaynaklar bulundu (wiki aynası + darkerdb API), Fighter verisi çekildi
- [x] **Faz 1 — Veri modeli (ilk taslak):** stat eğrileri, Fighter, rarity kuralları JSON'da
- [x] **Faz 2 — Hesap motoru:** `computeStats` saf fonksiyonu + 24 birim testi (`npm test`)
- [x] **Faz 3 — MVP arayüz:** Vite+React; perk/skill seçici (slot limitli), canlı stat paneli
      (`npm run dev` → localhost:5173)
- [x] **Faz 4 — Gear & Enchantment:** darkerdb'den 1639 item (`scripts/fetch-items.mjs`),
      11 ekipman slotu, sınıf+perk bazlı yasallık (Weapon Mastery/Slayer), rarity→enchantment
      slotları, item-başına havuz ve roll aralıkları (min/max kelepçeli)
- [x] **Faz 5a — Kaydet/Paylaş:** localStorage otomatik kayıt + URL hash ile build paylaşımı
      (Share Build düğmesi), güvenli geri yükleme (bilinmeyen id ayıklama, roll kelepçeleme)
- [x] **Faz 5b — 10 sınıfın tamamı:** tüm sınıflar perk/skill/base-stat/silah haklarıyla;
      `required_class` bit maskesi çözüldü (fighter=1 ... sorcerer=512) → item-bazında kesin
      yasallık; perk-gear kancaları (Weapon Mastery, Slayer, Demon Armor, Spear Proficiency)
- [ ] **Faz 6 — Cila:** DPS/efektif-HP türetilmiş metrikleri, items.json code-split,
      skill açıklamalarındaki eksik sayılar (API şablon boşlukları), UI iyileştirmeleri

## Veri güncelliği

Season 8 dönemi verisi (wiki 2026-06-30). Kaynak ayrıntıları ve doğrulama durumu:
[docs/kaynaklar.md](docs/kaynaklar.md)
