# Günlük

**Günlük**, düşüncelerinizi tamamen çevrimdışı, şifreli ve dikkat dağıtıcı unsurlardan uzak bir ortamda kaydedebilmeniz için geliştirilmiş açık kaynaklı, çapraz platform (macOS, Windows, Linux) bir masaüstü günlük uygulamasıdır.

## Özellikler

- **Çapraz Platform:** macOS, Windows ve Linux üzerinde çalışır (Electron + React + TypeScript).
- **Yerel ve Şifreli Depolama:** Tüm günlükleriniz yalnızca kendi bilgisayarınızda, AES-256-GCM ile şifrelenmiş yerel bir kasada saklanır. Bulut senkronizasyonu veya ağ bağlantısı yoktur.
- **Yalnızca Düz Metin:** Fotoğraf, dosya, HTML etiketi ve web bağlantısı (URL) girişine izin verilmez; saf yazı deneyimi sunar.
- **Başlık ve Gövde:** Her günlük notu sade bir başlık ve gövde alanından oluşur.
- **Otomatik Tarih Kaydı:** Oluşturulan her notun yazıldığı tarih ve saat otomatik olarak kaydedilir.
- **Takvim Görünümü ve Geçmiş İnceleme:** Arayüz takvim merkezlidir. Not bulunan günler takvimde işaretlenir; geçmiş günlere tıklayarak notlarınızı inceleyebilir, düzenleyebilir veya arama yapabilirsiniz.
- **Parola ve Touch ID Koruması:** Açılışta parola ister. macOS cihazlarda Touch ID ile kilit açmayı destekler; ekran kilitlendiğinde veya belirlenen hareketsizlik süresinin sonunda kasayı otomatik kilitler.
- **Yerel Dışa Aktarma:** İstediğiniz zaman tüm günlüklerinizi düz metin (`.txt`) dosyası olarak dışa aktarabilirsiniz.

## Geliştirme ve Çalıştırma

Gereksinimler: Node.js 20+ ve npm.

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda çalıştırın
npm run dev

# Testleri çalıştırın
npm test

# Tip kontrolü
npm run typecheck
```

## Paketleme (macOS / Windows / Linux)

```bash
# Üretim derlemesi ve kurulum paketi oluşturma
npm run package
```

Derlenen paketler `release/` klasörüne çıkarılır (`dmg`/`zip` macOS, `nsis`/`portable` Windows, `AppImage`/`deb` Linux).

### macOS Kurulum Notu

Uygulama açık kaynaklıdır ve Apple Developer hesabı ile noter tasdikli (notarized) değildir. GitHub Releases üzerinden `.dmg` dosyasını tarayıcıyla indirdiğinizde macOS Gatekeeper *"hasar görmüş olduğu için açılamıyor"* veya *"geliştiricisi doğrulanamıyor"* uyarısı verirse, uygulamayı **Uygulamalar (`Applications`)** klasörüne taşıdıktan sonra Terminal'de şu komutu çalıştırın:

```bash
xattr -cr /Applications/Günlük.app
```

## Lisans

[MIT](LICENSE)
