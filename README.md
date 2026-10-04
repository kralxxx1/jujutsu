# jujutsu

**Shibuya Olayı**: Jujutsu Kaisen'den esinlenmiş, tarayıcıda çalışan 3D dövüş oyunu (Three.js / WebGL).

Oyun tek dosyada: [`jujutsu-3d.html`](jujutsu-3d.html). Tarayıcıda aç, başka kurulum gerekmez.
Three.js CDN'den yüklendiği için internet bağlantısı gerekir.

## Karakterler

**Ryomen Sukuna**

| Tuş | Yetenek |
| --- | --- |
| 1 | **Cleave**: ortadan giden büyük kesiş. İsabet ederse rakibin üstüne ışınlanıp küçük kesişler atar, sert bir replik söyler |
| 2 | **Dismantle**: yükseğe zıplar, "KAI!" diyerek uzun düz bir kesiş atar |
| 3 | **Örümcek Ağı**: yerden ağ biçiminde kesiş. Rakip havaya uçar, Sukuna kafasından tutup yere çakar |
| 4 | **Black Flash** |
| R | **İyileşme** (ters lanet tekniği) |
| G | **Dört kollu form**: 1 Dünya Kesişi, 2 Çapraz Dünya Kesişi, 3 Kare Dünya Kesişi, 4 Alan Açılımı (Fukuma Mizushi). Alan bitince **R = Fuga** (alev oku) |

**Gojo Satoru**

| Tuş | Yetenek |
| --- | --- |
| 1 | **Ao (Mavi)**: rakibi çeker. Tekrar 1: şiddetli tekme |
| 2 | **Aka (Kırmızı)**: uzaktan, sarsıcı patlama |
| 3 | **Seri Darbe**: yakınken hızlı yumruk ve tekmeler, karna iki vuruş, yukarı savuran tekme |
| 4 | **Karşı Saldırı**: vurulunca Mavi ile yere çökertir, arkaya ışınlanıp tekme atar |
| R | **Işınlanma**: nişan aldığın (ya da fareyle gösterdiğin) yere |
| G | **Sonsuz Boşluk**: 0.2 sn alan, 3 sn çok hızlı koşu, ardından tek ulti yeteneği: **%200 Hollow Purple** (1 veya G) |

## Kontroller

| Tuş | İşlev |
| --- | --- |
| W A S D | Hareket (kameraya göre) |
| Fare | Kamera. Tıklayınca fare kilitlenir. Kilit yoksa sağ tuşu basılı tutup sürükle |
| Boşluk | Zıpla (havada bir kez daha) |
| Shift | Atılma (kısa dokunulmazlık) |
| Sol tık / F | Temel vuruş (3'lü kombo) |
| C | Blok |
| 1 2 3 4 / R / G | Yetenekler / özel yetenek / ulti |
| Q / Tab | Hedef kilidi aç/kapat |
| ← → | Kamerayı döndür |
| Esc / P | Duraklat |
| M | Sesi aç/kapat |

Ulti barı vurdukça, vuruldukça ve zamanla dolar. Savaşa başlarken oyuncunun barı dolu gelir.
Dokunmatik ekranda sanal çubuk ve düğmeler otomatik çıkar.

Menüde **Antrenman** modu hareketsiz bir rakip ve sürekli hazır ulti verir, yetenekleri denemek için kullanışlıdır.
