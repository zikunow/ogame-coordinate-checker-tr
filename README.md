# Koordinatlar — OGame Türkiye

Türkiye evren birleşmesi için bağımsız ve açık kaynaklı koordinat kontrol aracı.

**Türkiye sitesi:** https://zikunow.github.io/ogame-coordinate-checker-tr/

**Ayrı Rusya sitesi:** https://zikunow.github.io/ogame-coordinate-checker/

## Kapsam

Bu depo yalnızca Türkiye (TR) verilerini indirir ve yayımlar. İzin verilen 14 evren `site/config.json` içinde tanımlıdır:

| Evren | Sunucu numarası |
| --- | --- |
| Evren 1 | 1 |
| Lacerta | 190 |
| Vela | 251 |
| Wurren | 252 |
| Delphinus | 259 |
| Eris | 260 |
| Fafnir | 261 |
| Grus | 262 |
| Hercules | 263 |
| Imai | 264 |
| Jishui | 265 |
| Keid | 266 |
| Lyra | 267 |
| Mars | 268 |

Evren 1, lobi API’sinde `Evr1` olarak adlandırılır. Arayüzde `Evren 1` gösterilir. Liste dışındaki Türkiye evrenleri ve bütün RU sunucuları hariçtir. Testler izin listesini, TR API adreslerini ve veri kimliğini doğrular.

## Dil seçimi

Sağ üstteki TR / RU anahtarı arayüz dilini değiştirir. Rusça arayüz `ru.html` sayfasındadır; iki dil de yalnızca aynı Türkiye verilerini kullanır. Seçilen oyuncu ve evrenler korunur. Rusça dosyalar `scripts/build_locales.py` ve `scripts/locales/ru.json` ile üretilir.

## Kullanım

1. Kendi evrenini seç.
2. Oyuncu adının bir bölümünü veya ID numarasını yaz ve önerilerden oyuncuyu seç.
3. Karşılaştırılacak evrenleri seçip **Koordinatları kontrol et** düğmesine bas.

Sonuçta bütün gezegenler, diğer evrenlerdeki sahipler, oyuncu durumları ve toplam puan sıralaması gösterilir. Aylar hesaba katılmaz. Kendi evrenin otomatik olarak hariç tutulur. Özet sütunu ve üst sayaçlar aynı dört durumu kullanır:

| Durum | Anlamı |
| --- | --- |
| Boş | Diğer seçili evrenlerde bu konumda gezegen yok. |
| Muhtemelen boş | Yalnızca tatilde olmayan inaktif oyuncular var. |
| Muhtemelen dolu | En az bir tatil oyuncusu var; inaktif olup olmadığı önemli değil. |
| Dolu | En az bir aktif oyuncu var. |

Öncelik: aktif → tatil → inaktif → boş. Bilinmeyen durumlar, diğer özel durumlar veya eksik veriler varsa koordinat ihtiyatlı olarak **Muhtemelen dolu** sayılır. Detayda neden belirtilir. Aktif, API’de özel işaret olmadığı anlamına gelir; çevrimiçi olduğunu kanıtlamaz. Sayaçlar her koordinatı bir kez sayar; toplam gezegen sayısına eşittir.

Sıra etiketi toplam puan sırasını gösterir. Üzerine gelince tam puan görünür. CSV dışa aktarımı, paylaşılabilir kontrol bağlantısı, sayısal koordinat sıralaması ve mobilde yatay kaydırma desteklenir.

## Resmî API ve veri tarihleri

- https://lobby.ogame.gameforge.com/api/servers — evren listesi.
- `https://s{number}-tr.ogame.gameforge.com/api/serverData.xml` — evren ayarları.
- `https://s{number}-tr.ogame.gameforge.com/api/players.xml` — oyuncular ve durumları.
- `https://s{number}-tr.ogame.gameforge.com/api/universe.xml` — gezegenler ve sahipleri.
- `https://s{number}-tr.ogame.gameforge.com/api/highscore.xml?category=1&type=0` — oyuncuların toplam puan sıralaması.

Belgeler: https://forum.origin.ogame.gameforge.com/forum/thread/44-ogame-api/

Harita genellikle haftada bir, oyuncu durumları günde bir, sıralama saatte bir API tarafından güncellenir. Sitemizin 6 saatte bir çalışması API’nin kendi verisini daha hızlı güncellemez. Bütün kaynak zamanları UTC olarak gösterilir. Sonradan yapılan taşınma ve kolonileşmeler haritada henüz bulunmayabilir. Sonuçlar bir risk değerlendirmesidir; kimin hangi hedef evrene ne zaman taşınacağını veya ücretsiz yer değiştirmenin verileceğini garanti etmez.

Her evren için `site/data/tr-{number}.json` üretilir. `manifest.json` kaynak zamanlarını ve veri durumlarını taşır. Tarayıcı sadece bu depodaki statik JSON dosyalarını okur; giriş, API anahtarı veya oyun çerezi gerekmez. Oyuncular evren içinde ID ile eşleştirilir. Aynı isim farklı evrenlerde aynı kişiyi kanıtlamaz.

Bir API hatasında önceki kayıt korunur ve `stale` olarak işaretlenir. Hiç kayıt yoksa `unavailable` gösterilir. Eksik veriler boş konum sayılmaz. Sıralama API’si çalışmıyorsa diğer bilgiler kullanılabilir. Bütün kaynaklar başarısızsa önceki yayımlanmış site korunur.

## Otomatik güncelleme ve yayımlama

GitHub Actions kod değiştiğinde, elle ve her 6 saatte bir UTC 00:37, 06:37, 12:37, 18:37 saatlerinde çalışır. Verileri indirir, testleri çalıştırır, TR JSON dosyalarını depoya kaydeder ve `site/` klasörünü GitHub Pages’e yayımlar. GitHub zamanlanmış işleri geciktirebilir veya uzun süre etkinlik olmayan herkese açık depolarda durdurabilir.

Fork için Settings → Pages → Source bölümünde **GitHub Actions** seç; Actions üzerinden **Update API snapshots and deploy Pages** işini başlat. Gizli anahtar gerekmez. Başka bir forkta bağlantıları `site/index.html` ve README içinde kendi adreslerine göre değiştir.

## Yerel geliştirme

Python 3.10+ ve testler için Node.js 22+ yeterlidir. Haricî paket gerekmez.

```sh
python scripts/update_data.py
npm run check
npm test
python -m unittest discover -s tests -p 'test_*.py'
python -m http.server 8000 --directory site
```

http://localhost:8000 adresini aç. Siteyi doğrudan dosya olarak değil, HTTP üzerinden çalıştır.

Kod [MIT](LICENSE) lisanslıdır. API verilerinin hakları sağlayıcısına aittir. OGame, Gameforge markasıdır; bu proje Gameforge ile bağlantılı değildir.
