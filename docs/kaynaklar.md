# Veri Kaynakları ve Erişim Notları

Tarih: 2026-07-11

## Birincil kaynaklar

| Kaynak | URL | Durum | Kullanım |
|--------|-----|-------|----------|
| DaD Wiki (resmi topluluk) | darkanddarker.wiki.gg | ❌ Bu ağdan erişilemiyor (401 — IP bazlı engel; WebFetch, headless Chromium ve uygulama içi tarayıcının üçünde de) | — |
| **Wiki aynası (spellsandguns)** | darkanddarker.wiki.spellsandguns.com | ✅ Çalışıyor, 2026-06-30 güncel | Sınıf, perk, skill, stat eğrileri, enchantment kuralları |
| **darkerdb API** | api.darkerdb.com/v1 | ✅ Çalışıyor (v1.0.7) | Item veritabanı (`/v1/items`), market verisi (`/v1/market`) |
| Gameslantern | darkanddarker.gameslantern.com | Denenmedi | Perk listesi / build örnekleri (yedek kaynak) |

## darkerdb item şeması (örnek: /v1/items?limit=3)

Alanlar: `id`, `archetype`, `name`, `item_type` (armor/weapon/...), `slot_type` (foot/head/...),
`armor_type` (leather/plate/...), `rarity`, `gear_score`, `inventory_width/height`,
`required_class`, `num_primary_attributes`, `num_secondary_attributes`, `hand_type`,
`weapon_type`, `is_droppable`, `is_tradable`, `icon_url`...

→ Faz 4'te gear veritabanımızı bu API'den türeteceğiz (elle yazmak yerine).

## Doğrulama durumu

- ✅ **Fighter 125 HP çapraz kontrolü:** base 15/15 stat → health rating 15 → eğriden 100 + 25 = 125. Wiki değeriyle birebir.
- ✅ **PDR tablosu aritmetik tutarlılık:** tüm segment uçları per-point değerlerle yeniden hesaplanıp doğrulandı.
- ⚠️ **Perk/skill etkileri** wiki'den özetle alındı — oyunu bilen biri (Berke) oyun içi değerlerle karşılaştırmalı.
- ⚠️ **Manual Dexterity** eğrisi cap ile çelişiyor (eğri 55'e gidiyor, cap %50) — wiki'de tekrar bakılacak.

## Eksikler (TODO)

1. MR → Magical Damage Reduction tam tablosu (`Magical_Damage_Reduction` sayfası)
2. Debuff Duration tam breakpoint tablosu
3. Enchantment roll aralıkları (slot bazlı min/max tabloları — Enchantments sayfasındaki büyük tablolar)
4. Silah base damage / attack speed verileri (darkerdb API'den gelecek)
5. Zırh parçalarının armor rating + stat değerleri (darkerdb API'den gelecek)

## Patch takibi

Oyun verisi patch'lerle değişir. Her veri dosyasının `_meta.fetched_at` ve `_meta.game_patch`
alanı vardır. Yeni sezon çıktığında bu dosyalar yeniden çekilip commit'lenmeli — kod değişmez.
