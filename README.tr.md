<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/logo/logo-dark.svg">
    <img src=".github/logo/logo-light.svg" width="520" alt="rudywizz motion">
  </picture>
</h1>

**Koddan render edilen sinematik motion graphics.**

Kinetik tipografi · 3D başlıklar · harita uçuşları · alt yazı bantları, altyazılar ve sohbet hikâyeleri · sepya tarih belgeselleri · kendi çekimlerinden reels — <br>
gerçek kamera hareketleri, 20 shader geçişi, film tadında renk ve motion blur ile.

[![CI](https://github.com/Rudywizz/rudywizz-motion/actions/workflows/ci.yml/badge.svg)](https://github.com/Rudywizz/rudywizz-motion/actions/workflows/ci.yml)
[![Lisans: MIT](https://img.shields.io/badge/lisans-MIT-blue.svg)](LICENSE)
![Node 18+](https://img.shields.io/badge/node-18%2B-339933)
![Telemetri yok](https://img.shields.io/badge/telemetri-yok-success)

<img src="gallery/hero.webp" width="100%" alt="rudywizz-motion vitrin videosu">

**Bir CLI ve bir dizi ajan skill'i.** Tek komut → MP4, kurgu programın için şeffaf MOV/WebM, GIF ya da animasyonlu WebP.<br>
After Effects yok, satın alınacak şablon yok, yapay zekâ video modeli yok: her kare kodla çiziliyor, aynı girdi her seferinde aynı videoyu verir.

**[Web sitesi ve canlı galeri](https://rudywizz.github.io/rudywizz-motion/)** · [Galeri](#galeri) · [Kurulum](#kurulum) · [Hızlı başlangıç](#hızlı-başlangıç) · [Şablonlar](#şablonlar) · [Ajanlar](#claude-code-ya-da-başka-bir-ajanla) · [Referans](#referans) · [English](README.md)

</div>

---

## Galeri

36 stil. Aşağıdaki her önizleme `npm run gallery` ile üretilmiş gerçek bir render.

### Kinetik tipografi

| | | |
|:-:|:-:|:-:|
| <img src="gallery/word-stack.webp" width="240"><br>**word-stack** | <img src="gallery/glitch-title.webp" width="240"><br>**glitch-title** | <img src="gallery/scramble.webp" width="240"><br>**scramble** |
| <img src="gallery/ticker-rows.webp" width="240"><br>**ticker-rows** | <img src="gallery/typewriter.webp" width="240"><br>**typewriter** | <img src="gallery/highlight-quote.webp" width="240"><br>**highlight-quote** |
| <img src="gallery/beat-cut.webp" width="240"><br>**beat-cut** | <img src="gallery/lyric-video.webp" width="240"><br>**lyric-video** | <img src="gallery/murmuration.webp" width="240"><br>**murmuration** |
| <img src="gallery/neon-sign.webp" width="240"><br>**neon-sign** | <img src="gallery/inflate.webp" width="240"><br>**inflate** | <img src="gallery/ink-bleed.webp" width="240"><br>**ink-bleed** |
| <img src="gallery/halftone-press.webp" width="240"><br>**halftone-press** | <img src="gallery/led-marquee.webp" width="240"><br>**led-marquee** | <img src="gallery/split-flap.webp" width="240"><br>**split-flap** |
| <img src="gallery/vhs-memory.webp" width="240"><br>**vhs-memory** | <img src="gallery/pixel-quest.webp" width="240"><br>**pixel-quest** | <img src="gallery/signal-tune.webp" width="240"><br>**signal-tune** |

### 3D

| | | |
|:-:|:-:|:-:|
| <img src="gallery/extrude-3d.webp" width="240"><br>**extrude-3d** | <img src="gallery/cube-spin.webp" width="240"><br>**cube-spin** | <img src="gallery/particle-sphere.webp" width="240"><br>**particle-sphere** |
| <img src="gallery/text-tunnel.webp" width="240"><br>**text-tunnel** | <img src="gallery/retro-grid.webp" width="240"><br>**retro-grid** | <img src="gallery/card-carousel.webp" width="240"><br>**card-carousel** |

Her stil kamerayla 3D uzaya da taşınabilir: `--camera orbit`, `tilt-reveal`, `tilt-left`, `vertigo`…

### Sosyal medya ve yayın

| | | |
|:-:|:-:|:-:|
| <img src="gallery/lower-third.webp" width="240"><br>**lower-third** | <img src="gallery/chat-story.webp" width="240"><br>**chat-story** | <img src="gallery/bar-chart.webp" width="240"><br>**bar-chart** |
| <img src="gallery/countdown.webp" width="240"><br>**countdown** | <img src="gallery/cta-follow.webp" width="240"><br>**cta-follow** | <img src="gallery/captions.webp" width="240"><br>**captions** |
| <img src="gallery/odometer.webp" width="240"><br>**odometer** | <img src="gallery/receipt.webp" width="240"><br>**receipt** | <img src="gallery/orbit-ring.webp" width="240"><br>**orbit-ring** |

`--alpha --out isim.mov` ekle, çıkan dosyayı Premiere, Final Cut, DaVinci Resolve ya da CapCut'ta doğrudan görüntünün üstüne bırak.

### Haritalar, tarih ve kendi görsellerin

| | | |
|:-:|:-:|:-:|
| <img src="gallery/map-globe.webp" width="240"><br>**map-route** · küre | <img src="gallery/map-atlas.webp" width="240"><br>**map-route** · atlas | <img src="gallery/map-turkey.webp" width="240"><br>**map-route** · Türkiye |
| <img src="gallery/look-engrave.webp" width="240"><br>**image** · `--look engrave` | <img src="gallery/history-title.webp" width="240"><br>**history-title** | <img src="gallery/parchment-letter.webp" width="240"><br>**parchment-letter** |
| <img src="gallery/look-sketch.webp" width="240"><br>**image** · `--look sketch` | <img src="gallery/transitions.webp" width="240"><br>**20 geçiş** | |

## Neden farklı?

- **Kare kare, birebir aynı:** Her kare `t = kare / fps` ile hesaplanıp ffmpeg'e veriliyor. Ekran kaydı yok, kare atlama yok; aynı seed aynı videoyu verir (CI'da test ediliyor).
- **Gerçek bir compositor:** Her sahne kendi tuvalinde çiziliyor. Üstüne WebGL2 zinciri kamera, geçiş, bloom, lens, kromatik aberasyon, ışık sızıntısı, film hasarı ve renk grade'i ekliyor.
- **Motion blur'lu kamera:** 19 hareket var (punch-in, whip, orbit, tilt-reveal, vertigo, ritme oturan beat-punch…). Hızlı hareketler gerçek obtüratör gibi bulanıklaşıyor.
- **Her format:** 9:16, 1:1, 4:5, 16:9, istediğin boyutta. Metin sığdırılıyor, satıra bölünüyor, gerekirse heceleniyor; kadrajdan asla taşmıyor.
- **Çevrimdışı haritalar:** Dünya küresi, düz dünya haritası ve Türkiye'nin 81 ili. Şehir adlarını yaz, uçuş animasyonu hazır.
- **Kendi çekimlerin:** Klip ve fotoğraflarına hız rampası, el kamerası, altyazı, parallax katmanları ve grade.
- **Önce Unicode:** Gelen 17 fontun hepsi Latin Extended'ı destekliyor (ğ ş ı İ ç ö ü…). Büyük harf çevirme dile duyarlı (`i → İ`).

## Kurulum

**Node 18+** ve **ffmpeg** gerekir (macOS `brew install ffmpeg` · Windows `winget install ffmpeg` · Linux `sudo apt install ffmpeg`).

**CLI**
```bash
git clone https://github.com/Rudywizz/rudywizz-motion && cd rudywizz-motion
npm install
npx playwright install chromium     # tek seferlik; ya da kurulu Chrome/Edge kullanılır
npx rudywizz-motion doctor          # Node ✓  ffmpeg ✓  tarayıcı ✓  WebGL2 ✓
```

**Claude Code eklentisi**
```text
/plugin marketplace add Rudywizz/rudywizz-motion
/plugin install rudywizz-motion@rudywizz
```

**Skill okuyan her ajan** (Claude Code, Codex, Cursor…)
```bash
npx skills add Rudywizz/rudywizz-motion
```

## Hızlı başlangıç

```bash
npx rudywizz-motion render glitch-title --text "Sinyal / kayıp" --grade cyber
npx rudywizz-motion render extrude-3d --text "Büyük / haber" --format 16:9
npx rudywizz-motion render lower-third --text "Deniz Aydın / Sunucu" --alpha --out isim.mov
npx rudywizz-motion render map-route --set 'route=["İstanbul","Kapadokya","Antalya"]' --text "Rota"
npx rudywizz-motion render image --image portre.jpg --look engrave --grade sepia --film 0.6
npx rudywizz-motion render stats-recap          # hazır bir şablonun tamamı
npx rudywizz-motion preview neon-sign           # tarayıcıda canlı önizleme
```

Taslakları `--size 540` ile hızlıca al, son hâli varsayılan 1080'de render et.

> **Windows (PowerShell / cmd):** komut satırında JSON tırnaklamak zahmetli. Seçenekleri bir dosyaya yazıp
> `--params secenekler.json` ver ya da `npx rudywizz-motion init` ile bir kompozisyon dosyası oluştur.

## Şablonlar

`npx rudywizz-motion templates` listeler; adıyla render et ya da JSON'unu kopyalayıp düzenle.

| Şablon | Ne yapar | Format |
|---|---|---|
| `showreel` | Yukarıdaki vitrin: kinetik tipografi, 3D, harita ve geçişler | 16:9 |
| `kinetic-promo` | Glitch açılış → iki yana yaslı kelime yığını → şifre çözme → kayan poster satırları | 9:16 |
| `3d-title` | 3D başlık → dönen küp → parçacık küresi → synthwave kapanış | 16:9 |
| `youtube-intro` | Şifre çözen başlık → kelime yığını → sunucu alt bandı | 16:9 |
| `stats-recap` | Geri sayım → dönen büyük sayı → bar chart yarışı → takip butonu | 9:16 |
| `chat-reel` | Bir sohbet akar → glitch'li sürpriz → takip çağrısı | 9:16 |
| `quote-card` | Fosforlu kalemle vurgulanan alıntı kartı | 4:5 |
| `event-countdown` | 3·2·1 → tarih ve yerle kalkış panosu → neon kapanış | 9:16 |
| `travel-reel` | Küre üstünde uçuş → kalkış panosu → mesafe sayacı → neon kapanış | 9:16 |
| `history-short` | Sepya belgesel: yıl kartı → atlas → gravür → mektup | 9:16 |
| `lyric-teaser` | Ritme oturan kelimeler → şarkı sözü satırları → VHS kapanış (parçanı ekle) | 9:16 |
| `launch` | TV açılışı → dönen özellik halkaları → krom açılış → risograf kapanış | 9:16 |
| `tour` | Orijinal stillerin 30 saniyelik turu | 9:16 |

## Kendi çekimlerinden reel

```json
{
  "$schema": "https://raw.githubusercontent.com/Rudywizz/rudywizz-motion/main/skills/rudywizz-motion/schema/composition.schema.json",
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
`$schema` satırı sayesinde VS Code ve diğer editörler her stil seçeneğini otomatik tamamlar.
Yazım hataları render'dan önce yakalanır: `unknown camera "orbt". Did you mean "orbit"?`

## Claude Code ya da başka bir ajanla

Eklentiyi kurduktan sonra sadece iste:

> *bu kliplerden 15 sn'lik bir reel yap, başta İstanbul → Roma harita intro olsun*<br>
> *kanalım "Haftalık Kod" için 16:9 bir YouTube intro'su, glitch'li olsun, sonunda adımla alt bant*<br>
> *şu rakamlarla dikey bir bar chart yarışı, sonunda takip butonu*

Ya da bir skill'i doğrudan çağır: `/rudywizz-motion:glitch-title Sinyal kayıp`, `/rudywizz-motion:reel`, `/rudywizz-motion:history-video 1071 Malazgirt`.
Ajan render'dan önce kontrol kareleri alır, böylece yerleşim sorunları erkenden yakalanır.

## Referans

```text
rudywizz-motion list | templates | doctor | init [dosya] | --version
rudywizz-motion render  <stil|şablon|comp.json|image|clip> [seçenekler]
rudywizz-motion still   <…> --at <saniye>
rudywizz-motion preview <…>
```

| Seçenek | |
|---|---|
| `--text` | Metin (satır sonu için `" / "` ya da `\n`) |
| `--image` / `--clip` | Kendi görsel ya da klibini canlandır |
| `--set anahtar=değer` · `--params dosya.json` | Stil seçenekleri (JSON değer olabilir) |
| `--camera` | `static drift push-in pull-out punch-in crash-zoom whip-from-left whip-from-right whip-from-top spin-in rise orbit tilt-reveal tilt-left tilt-right vertigo handheld float beat-punch` |
| `--look` | `engrave sketch oldphoto duotone halftone posterize noir` |
| `--grade` | `teal-orange kodak fuji sepia noir bleach cyber sunset matte` |
| `--bloom --grain --leak --film --aberration --vignette` | Efektler, 0–1 |
| `--motion-blur n` | Kare başına alt kare (4–8 = sinematik) |
| `--format` · `--size` | `9:16` (varsayılan) `1:1` `4:5` `16:9` · kısa kenar px |
| `--out` | `.mp4` · `.mov` (ProRes 4444 + alfa) · `.webm` (VP9 + alfa) · `.gif` · `.webp` |
| `--alpha` · `--audio` · `--bpm` · `--lang` · `--seed` · `--fps` · `--duration` · `--strict` | |

Kompozisyon şeması ve ajan iş akışının tamamı: [`skills/rudywizz-motion/SKILL.md`](skills/rudywizz-motion/SKILL.md).

## Güvenle çalıştır

- **Ağ yok, telemetri yok.** Render sırasında hiçbir şey yüklenmez ya da indirilmez; fontlar, haritalar ve veriler repoyla gelir.
- **Tek bağımlılık:** Playwright (Microsoft). Motor, derleme adımı olmayan, okunabilir düz JavaScript.
- Render sunucusu yalnızca `127.0.0.1`'i dinler, her çalıştırmada rastgele bir anahtarla korunur ve render bitince kapanır.
- Ayrıntılar ve gizli güvenlik bildirimi: [SECURITY.md](SECURITY.md).


rudywizz-motion sana After Effects başında bir akşam kazandırdıysa, bir ⭐ başkalarının da bulmasına yardım eder.

## Katkı

Bir stil tek bir dosyadır. Nasıl ekleneceği [CONTRIBUTING.md](CONTRIBUTING.md) içinde anlatılıyor. Fikirlerini [issue](https://github.com/Rudywizz/rudywizz-motion/issues/new/choose) olarak açabilirsin; Türkçe de yazabilirsin.

## Lisans

[MIT](LICENSE): kişisel ve ticari kullanım serbest. Hazırlayan: [Rudywizz](https://github.com/Rudywizz).
Fontlar SIL OFL (Fontsource), harita verisi Natural Earth (kamu malı). Demo çizimleri ve galeri CC0.
Tam liste: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Kullanım hakkına sahip olduğun görsel ve klipleri kullan.
