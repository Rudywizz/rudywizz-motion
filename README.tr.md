<div align="center">

# rudywizz-motion

**Koddan render edilen sinematik motion graphics.**
Kinetik tipografi · harita rota animasyonları · sepya tarih belgeselleri · kendi kliplerinden reels —
gerçek kamera hareketleri, 20 shader geçişi, film tadında renk grade'i ve motion blur ile.

**Claude Code skill'i** (`/neon-sign "Still awake"`, `/reel`, `/history-video`) ya da düz **CLI** olarak çalışır.
After Effects yok, satın alınacak şablon yok, yapay zekâ video modeli yok. Her kare kodla çiziliyor; aynı girdi her seferinde aynı videoyu verir.

<img src="gallery/hero.gif" width="100%" alt="rudywizz-motion showreel">

[Kurulum](#kurulum) · [Haritalar](#haritalar) · [Tarih paketi](#tarih-paketi) · [Kendi çekimlerinden reel](#kendi-çekimlerinden-reel) · [English](README.md)

</div>

---

## Neden farklı?

- **Kare kare, birebir aynı:** Her kare `t = kare / fps` ile hesaplanıp ffmpeg'e veriliyor. Ekran kaydı yok, kare atlama yok.
- **Gerçek bir compositor:** Her sahne kendi tuvalinde çiziliyor. WebGL2 zinciri üstüne kamera, geçiş, bloom, lens, kromatik aberasyon, ışık sızıntısı, film hasarı ve renk grade'i ekliyor.
- **Motion blur'lu kamera:** 19 hareket var: punch-in, whip, orbit, tilt-reveal, vertigo, ritme oturan beat-punch… Hızlı hareketler gerçek obtüratör gibi bulanıklaşıyor.
- **20 shader geçişi:** whip, zoom-through, film yanığı, mürekkep, sıvı, glitch, küp, iris, ışık sızıntısı…
- **Çevrimdışı haritalar:** Dünya küresi, düz dünya haritası ve Türkiye'nin 81 ili. Şehir adlarını yaz, uçuş animasyonu hazır.
- **Tarih paketi:** Herhangi bir portre ya da tablo kendini mürekkep gravürü olarak çiziyor, sonra sepyaya boyanıyor. Altın yaldızlı yıl kartları, antik atlaslar, kendi kendini yazan mektuplar.
- **Kendi çekimlerin:** Klip ve fotoğraflarına hız rampası, el kamerası, altyazı, parallax katmanları ve grade.
- **Önce Türkçe:** Gelen 17 fontun hepsi ğ ş ı İ ç ö ü harflerini destekliyor. Büyük harf çevirme dile duyarlı (`i → İ`).

## Kurulum

**Claude Code eklentisi**
```text
/plugin marketplace add Rudywizz/rudywizz-motion
/plugin install rudywizz-motion@rudywizz
```

**Skill okuyan her ajan** (Claude Code, Codex, Cursor…)
```bash
npx skills add Rudywizz/rudywizz-motion
```

**Düz CLI**
```bash
git clone https://github.com/Rudywizz/rudywizz-motion && cd rudywizz-motion
npm install
npx rudywizz-motion doctor        # ffmpeg ✓  tarayıcı ✓  WebGL2 ✓
```
Node 18+ ve ffmpeg gerekir. Tarayıcı kontrolü başarısız olursa `npx playwright install chromium` çalıştır.

## 30 saniyede başla

```bash
npx rudywizz-motion render neon-sign --text "Hâlâ / uyanık" --camera orbit --grade teal-orange --bloom 0.4
npx rudywizz-motion render map-route --set 'route=["İstanbul","Kapadokya","Antalya"]' --text "Rota"
npx rudywizz-motion render image --image portre.jpg --look engrave --grade sepia --film 0.6
npx rudywizz-motion render tour      # 30 saniyelik vitrin videosu
```
Claude Code'da sadece iste: *"bu kliplerden 15 sn'lik bir reel yap, başta İstanbul → Roma harita intro olsun"* ya da `/history-video 1071 Malazgirt` yaz.

## Haritalar

```bash
npx rudywizz-motion render map-route --set 'route=["İstanbul","Roma","Londra"]' --text "Avrupa Turu"
npx rudywizz-motion render map-route --set theme='"atlas"' --set 'route=["Söğüt","Bursa","Edirne","İstanbul"]' --text "Bir Beylikten Cihana"
```
- Yerler: ~7.400 dünya şehri, 81 il, Türkçe şehir adları (*Londra, Viyana, Kudüs, Semerkant…*), önemli yerler (*Kapadokya, Efes, Göbeklitepe, Karacabey…*) ya da `"enlem,boylam"`.
- `mode`: `globe` · `flat` · `turkey` · `auto` — `theme`: `dark` · `atlas` · `light` — `icon`: `plane` · `ship` · `dot`.
- `--camera tilt-reveal` ile harita 3D eğik açıdan açılıyor.

## Tarih paketi

```bash
npx rudywizz-motion render history-short          # şablon: yıl kartı → atlas → gravür → mektup
npx rudywizz-motion render history-title --text "1453 / İstanbul'un Fethi / Bir çağın sonu" --grade sepia --film 0.6
npx rudywizz-motion render image --image tablo.jpg --look engrave --camera push-in --grade sepia --film 0.6
npx rudywizz-motion render parchment-letter --text "Sevgili kardeşim, …" --set place='"Selanik, 1897"' --set signature='"Ahmet"'
```
`engrave` görünümü GPU'da çalışır: önce kenarlar mürekkeple çizilir, gölgeler taranır, sonra sepya boya dolar. Kullanım hakkına sahip olduğun her portre, tablo ya da fotoğrafla çalışır.

## Kendi çekimlerinden reel

```json
{
  "lang": "tr",
  "look": { "grade": "teal-orange", "bloom": 0.3, "leak": 0.2 },
  "scenes": [
    { "style": "map-route", "route": ["İstanbul", "Kaş"], "duration": 5, "transition": { "type": "whip", "duration": 0.45 } },
    { "clip": "drone.mp4", "in": 4, "duration": 3, "speed": "ramp-mid", "camera": "punch-in",
      "overlay": { "style": "captions", "text": "Kaş, Antalya" }, "transition": { "type": "burn", "duration": 0.8 } },
    { "style": "neon-sign", "text": "Yakında / görüşürüz", "duration": 3 }
  ]
}
```
```bash
npx rudywizz-motion render reel.json --audio parca.mp3 --out reel.mp4
```

## Tüm seçenekler

Galeri, şablon listesi ve tam referans için [İngilizce README](README.md#gallery). Kompozisyon şeması ve ajan iş akışı: [`skills/rudywizz-motion/SKILL.md`](skills/rudywizz-motion/SKILL.md).

## Lisans

MIT · [Rudywizz](https://github.com/Rudywizz). Fontlar SIL OFL (Fontsource), harita verisi Natural Earth (kamu malı). `assets/demo` içindeki çizimler orijinaldir ve CC0'dır. Kullanım hakkına sahip olduğun görsel ve klipleri kullan.
