# 19 Ekim 2026 değişikliklerini yayınlama notu

Bu belge, bu çalışma kapsamında eklenen müşteri talepleri, bülten onayı/çıkışı, kargo durumu, yorum doğrulaması, sadakat puanı ve sepet kurtarma değişiklikleri içindir. Canlıya dağıtım, migration veya gerçek e-posta gönderimi bu çalışma sırasında yapılmadı. Ödeme sağlayıcısı ve para iadesi kapsam dışındadır.

Kaynaklar: [ana Compose dosyası](../docker-compose.yml), [Dokploy rehberi](../deploy/DOKPLOY.md), [backend Dockerfile](../deploy/backend.Dockerfile), [storefront Dockerfile](../deploy/storefront.Dockerfile). Buradaki ana yol, repo kökündeki `docker-compose.yml` ile Dokploy/Traefik dağıtımıdır. `deploy/docker-compose.yml` ayrı Caddy kurulumudur; iki Compose projesinin volume adları ve yedek düzeni birbirinin yerine kullanılmamalıdır. Güncel kök Compose'ta görseller `backend_static` adlı volume'dadır.

**1. Sürüm ve yerel kontroller**

Yayınlanacak commit kimliğini, önceki çalışan backend/storefront imaj kimliklerini ve mevcut Compose proje adını kaydedin. Aynı yayın paketinde hem backend hem storefront olmalı: yeni formlar yeni API'leri ve tabloları kullanıyor.

Bağımlılıkları kurulu yerel/CI ortamında repo kökünden:

```sh
npm --prefix medusa-backend/apps/backend run test:unit
node medusa-backend/node_modules/typescript/bin/tsc --noEmit --project medusa-backend/apps/backend/tsconfig.json
npm --prefix testerestore run test:unit
npm --prefix testerestore run test:regression
npm --prefix testerestore run lint
node testerestore/node_modules/typescript/bin/tsc --noEmit --project testerestore/tsconfig.json
```

Backend paketinin `build` komutu `medusa build`, `start` komutu `medusa start`tır. Frontend `build` komutu `next build`tir; üretim Docker imajı standalone `server.js` dosyasını çalıştırır. Tarayıcı regresyon testleri, kurulu Playwright tarayıcısı ve test yapılandırmasının başlattığı yerel sunucuyu kullanır. Bu testler gerçek kargo veya e-posta teslimatının yerine geçmez.

**2. Ortam değişkenlerini kontrol edin**

Gizli değerleri belgeye, ekran görüntüsüne veya build loguna kopyalamayın. Bu sürüm için gerekli isimler ve kullanım yerleri:

| Değişken | Kontrol |
|---|---|
| `DATABASE_URL` | Backend'in mevcut üretim veritabanını göstermeli. Ana Compose bunu `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` üzerinden oluşturur. |
| `REDIS_URL` | Event, workflow ve oturum kalıcılığı için mevcut Redis'e bağlı olmalı. Ana Compose bu bağlantıyı sağlar. |
| `COOKIE_SECRET`, `JWT_SECRET` | Uzun, rastgele, varsayılan olmayan değerler olmalı. Bülten/sepet imzası önce `COOKIE_SECRET`, yoksa `JWT_SECRET` kullanır; imza anahtarı en az 32 karakter olmalı. Bu sürüm için çalışan anahtarı sebepsiz değiştirmeyin. |
| `STOREFRONT_URL` | Kullanıcının eriştiği HTTPS mağaza kökü. Bülten ve sepet kurtarma bağlantıları buradan üretilir. |
| `MEDUSA_BACKEND_URL` | HTTPS API/admin kökü; görseller ve admin şifre sıfırlama bağlantısı için de kullanılır. |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | Gerçek storefront/admin origin'leriyle eşleşmeli; oturumlu talepler ve yorum gönderimi doğrulanmalı. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | Gerçek gönderim için gerekli yapılandırma. Gönderen adresinin sağlayıcıda kullanılabildiği doğrulanmalı. Anahtar yoksa üretimde gönderim artık başarısız sayılır; servis bütünüyle açılmayı bırakmaz. |
| `CONTACT_TO_EMAIL` | İsteğe bağlı iletişim bildirimi alıcısı. Kod bunu destekler, mevcut Compose bunu backend'e geçirmiyor. Farklı alıcı isteniyorsa Compose `backend.environment` bölümüne de eklenmeli; aksi halde `RESEND_FROM_EMAIL` kullanılır. Talepler e-postadan bağımsız admin gelen kutusuna kaydedilir. |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` | Frontend build sırasında gömülür. API, mevcut satış kanalı anahtarı ve mağaza kökü doğru olmalı; değişiklik yeniden build gerektirir. |
| `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_DEFAULT_CURRENCY` | Mağazanın mevcut bölge/para birimiyle tutarlı olmalı. Sadakat kazanımının mevcut uygulaması TRY siparişlerini işler. |
| `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `NEXT_PUBLIC_SENTRY_DSN` | Kullanılan hizmetler için gerçek değerlerle build edilmeli. İzin verilmeden takip istekleri oluşmadığı ayrıca kontrol edilmeli. |
| `SEED_ON_BOOT` | Mevcut mağazanın bu sürüm güncellemesinde `0` olmalı; katalog/ayar seed'i bu değişikliklerin gereği değildir. |
| `BUILD_NONCE` | Mevcut Docker düzeninde storefront build önbelleğini yenilemek için kullanılabilir. |

Ödeme anahtarları bu sürüm çalışmasının parçası olarak değiştirilmez. Bülten veya kurtarma bağlantıları oluşturulduktan sonra imza anahtarını değiştirmek önceki bağlantıları geçersiz kılar; oturumlar da etkilenebilir.

**3. Yedek ve bakım penceresi**

Ana Compose zaten `db-backup` servisi içerir. Günlük yedeğin başarılı olması, bu yayından hemen önce alınmış ve geri yüklenebilir bir yedeğin yerine geçmez.

Önce yeni imajları hazırlayın. Ardından bakım penceresinde müşteri/admin yazmalarını ve uygulama işçilerini durdurun; `postgres`, `redis` ve `db-backup` çalışır kalsın. Yeni sipariş, talep veya kupon yazımı sürerken eski bir yedeğe dönmek sonradan oluşan verileri kaybettirir.

Dokploy'da mevcut `db-backup` container'ının terminalinde:

```sh
set -eu
release_stamp=$(date -u +%Y%m%dT%H%M%SZ)
release_backup="/backups/pre_release_${release_stamp}.dump"
pg_dump --format=custom --file="$release_backup"
pg_restore --list "$release_backup" > "/backups/pre_release_${release_stamp}.contents.txt"
tar -czf "/backups/pre_release_${release_stamp}_static.tar.gz" -C /static .
ls -lh "$release_backup" "/backups/pre_release_${release_stamp}_static.tar.gz"
```

Bu komutlar container'da zaten tanımlı `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` değerlerini kullanır; parolayı komut satırına yazmaz. `pg_restore --list` arşivin okunabildiğini kontrol eder. Gerçek geri yükleme denemesi ayrı, geçici bir veritabanında yapılmalıdır.

Veritabanı ve görsel arşivini sunucu dışındaki mevcut yedek hedefine de kopyalayın. `pre_release_*` adlı bu elle alınan yedekler günlük `db_*` temizleme desenine girmez; saklama süresini ayrıca yönetin. Redis'teki bekleyen event/iş durumu için mevcut volume yedek düzenini de koruyun.

**4. Migration ve yeniden başlatma sırası**

Yeni migration'lar:

| Modül | Migration | Etki |
|---|---|---|
| `customerRequest` | `Migration20261019090000` | `customer_request` tablosu; talep numarası/tekrar gönderim anahtarı benzersizliği; sipariş başına tek açık iade/değişim talebi. |
| `newsletter` | `Migration20261019091000` | Onay/çıkış zamanları, nonce ve izin metni sürümü; yeni onay akışı için e-posta benzersizliği. Eski abonelikler silinmez, geçmişte doğrulanmış izin varmış gibi doldurulmaz. |
| `loyalty` | `Migration20261019120000` | Hesap ve hareket benzersizliği, idempotency alanları, `loyalty_redemption` tablosu ve kupon dönüşüm durumları. |

Sadakat migration'ı aynı müşterinin birden fazla aktif puan hesabı varsa bilinçli olarak durur: `Duplicate loyalty accounts require reconciliation before this migration`. Bu durumda hesapları otomatik silmeyin veya bakiyeleri tahmin ederek birleştirmeyin. Yedek üzerinden gerçek hareketler/bakiyeler uzlaştırılmadan yayına devam etmeyin. Migration motorunun tüm modülleri tek küresel transaction içinde geri alacağını varsaymayın; hata durumunda diğer modüllerin uygulanmış olabileceğini kontrol edin.

Aşağıdaki Compose komutları **mevcut dağıtım dizininde, aynı Compose proje adı ve aynı Environment ile** uygulanacak örnek sıradır. Dokploy kurulumu için panelin kullandığı proje/dizin bağlamını koruyun. İlk `ps` çıktısı mevcut üretim container'larını göstermiyorsa devam etmeyin; yanlış proje adı yeni, boş volume'lar oluşturabilir.

İmajları mevcut backend erişilebilirken hazırlayın:

```sh
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml build backend storefront
```

Bakım penceresine girildikten ve yukarıdaki güncel yedek alındıktan sonra:

```sh
docker compose -f docker-compose.yml stop storefront backend
docker compose -f docker-compose.yml run --rm --no-deps backend npx medusa db:migrate
docker compose -f docker-compose.yml up -d --no-deps backend
docker compose -f docker-compose.yml logs --tail=100 backend
```

Backend sağlık kontrolü geçtikten sonra:

```sh
docker compose -f docker-compose.yml up -d --no-deps storefront
docker compose -f docker-compose.yml ps
```

`run ... npx medusa db:migrate` yeni backend imajındaki derlenmiş sunucuyu ve migration'ları kullanır; normal başlatma komutunu geçici olarak değiştirir. Mevcut `deploy/backend.Dockerfile` normal backend açılışında da `npx medusa db:migrate` çalıştırır. Önceden uygulanmış migration'lar tekrar uygulanmaz. Ayrı migration adımı kullanılıyorsa bunu tek süreçle yürütün; aynı anda başka deploy/migration başlatmayın.

Dokploy panelinden doğrudan Deploy/Redeploy tercih edildiğinde de aynı yedek, bakım, yeni commit ve Environment kontrolleri geçerlidir; Dockerfile migration'ı otomatik çalıştıracağı için logdaki başarı görülmeden storefront'u kullanıma açmayın. `docker compose down -v` veya volume silme bu güncellemenin parçası değildir.

**5. Yayın kabul kontrolleri**

Önce ödeme içermeyen test verileriyle staging ortamında; ardından üretimde yalnızca kontrollü sağlık/erişim kontrolleriyle doğrulayın.

| Akış | Kabul ölçütü |
|---|---|
| Sağlık ve admin | API `/health` başarılı; admin açılıyor; ürün görselleri mevcut; yeni “Müşteri Talepleri” menüsü görünüyor. |
| İletişim / teklif | Form talep numarası döndürüyor; tam mesaj admin gelen kutusunda. Aynı istek anahtarı yeniden gönderildiğinde ikinci talep oluşmuyor. Staging'de e-posta sağlayıcısı başarısızken de kayıt korunuyor. |
| İade / değişim | Müşteri kendi siparişindeki ürünü, geçerli adedi ve sebebi seçebiliyor; talep ve admin yanıtı sipariş ekranında görünüyor. Başka müşterinin siparişi, yabancı kalem, fazla/negatif/kesirli adet reddediliyor. Talep açılması veya “sonuçlandırıldı” durumu siparişi/stoğu otomatik değiştirmiyor. |
| Bülten | İzin kutusu işaretlenmeden kayıt yapılamıyor. Form gönderimi aboneliği hemen aktifleştirmiyor. E-posta bağlantısındaki onaydan sonra `confirmed_at` doluyor; çıkış bağlantısı aboneliği kapatıyor. Eski/bozulmuş/48 saati geçmiş onay bağlantısı etkinleştirmiyor. Çıkış sonrası tekrar abonelik yeniden onay gerektiriyor. |
| Sepet kurtarma | Yalnızca doğrulanmış, aktif ve çıkış yapmamış bülten abonelerine hatırlatma gönderiliyor. 48 saatlik imzalı bağlantı doğru sepeti açıyor; üye sepeti başka hesapla alınamıyor. E-postada abonelikten çıkış bağlantısı bulunuyor. 30 dakikalık job'ın 1–6 saat aralığındaki sepetleri ele aldığı dikkate alınmalı. |
| Kargo | Admin önce standart hazırlık kaydını oluşturuyor, yeni widget'tan bu kaydı seçip takip bilgisiyle gönderiyor. Gerçek fulfillment `shipped_at` ve takip etiketleri oluşuyor; müşteri ekranı ve e-posta aynı gönderiyi gösteriyor. Hazırlanmış/gönderilmiş veya eski kargo metadata'sı bulunan siparişte müşteri iptali engelleniyor. |
| Yorum | Oturumlu müşterinin ilgili ürünü gerçekten gönderilmiş/tamamlanmış siparişi varsa doğrulanmış rozet oluşuyor. İptal edilmiş sipariş veya başka ürünün gönderimi rozet kazandırmıyor. Admin onaylamadan yorum herkese açılmıyor. |
| Sadakat | TRY siparişi tamamlandığında puan yalnızca bir kez yazılıyor. Aynı olayın tekrarı bakiyeyi artırmıyor. İptal/iade ve ters sıralı event senaryoları doğru düzeltme yaratıyor. Aynı kupon dönüşüm anahtarı tekrarlandığında ikinci debit veya ikinci kupon oluşmuyor. Kupon yalnızca ilgili müşteri için ve bir kez kullanılabiliyor. |
| Yarım kupon dönüşümü | Staging'de puan ayrıldıktan sonra promosyon aktivasyonu başarısız bırakıldığında `reserved` kayıt görünür; “ayrılan puanla kuponu tamamla” ile aynı işlem sürdürülür, tekrar puan düşmez. |
| İzin / ölçümleme | İlk ziyarette ve “reddet” sonrasında analytics/marketing istekleri oluşmuyor. Tercih değişimi uygulanıyor. E-posta ve kurtarma token'ları analytics olaylarına veya loglara gönderilmiyor. |

Kargo firması API'si/etiket satın alma entegrasyonu bu değişiklikte eklenmedi: mevcut hazırlanmış gönderi, takip numarası ve firmanın HTTPS takip URL'i admin tarafından girilir. Müşteri iade/değişim kaydı bir **talep**tir; operasyon ekibinin incelemesi ve mevcut Medusa işlemleri ayrıca yürütülür. İletişim talebindeki admin “yanıt kaydı” e-postayı kendiliğinden göndermez; müşteri yanıtı ayrıca iletilir.

**6. Sadakat politikasında açık davranış**

Mevcut kodda daha önce harcanmış puanların kaynağı olan sipariş iptal/iade edilirse hesap bakiyesi eksiye inebilir. Daha önce oluşturulmuş hazır kupon otomatik olarak iptal edilmez. Yeni puan kazanımları önce bu negatif farkı kapatır; pozitif kullanılabilir bakiye olmadan yeni kupon dönüşümü yapılamaz.

Müşterinin puan ekranı negatif düzeltmeyi açıklayan metin gösterir. Bu davranışın mağazanın sadakat şartlarıyla uyumlu olduğu yayın öncesi işletme tarafından teyit edilmelidir. Kuponu iptal etmek, harcanmış indirimi geri istemek veya bakiyeyi sıfırlamak bu sürümde varsayılmış bir işlem değildir. Kupon bakiyesi tek siparişte kullanılır; kullanılmayan indirim sonraki siparişe taşınmaz ve bu bilgi kullanıcı ekranında yer alır.

**7. Geri alma sınırları**

Yeni kayıt yazılmışsa önce uygulama trafiğini/işçileri durdurun ve mevcut durumu da yedekleyin. Önceki DB yedeğini geri yüklemek, bu yedekten sonra oluşan siparişleri, talepleri, izin/çıkış kayıtlarını ve kupon hareketlerini kaybettirir. Geri yükleme ayrı ortamda denenmeden ve sonradan oluşan veriler ele alınmadan üretim veritabanının üzerine uygulanmamalıdır.

Migration'ların `down` davranışı bu sürümde kayıpsız genel geri alma değildir:

- Müşteri talebi migration'ı `customer_request` tablosunu kaldırır; kayıtlı talepler silinir.
- Bülten migration'ı yeni izin/onay/çıkış alanlarını kaldırır; bu bilgiler kaybolur. Eski uygulamanın doğrudan aktif abonelik oluşturması yeniden devreye girebilir.
- Sadakat migration'ı rollback sırasında hesap/hareket verisini korur, yeni hesap/hareket benzersizlik kısıtlarını kaldırır. Eski uygulamaya dönmek yeni kupon/redemption yaşam döngüsünü işlemez; yalnızca imajı geri almak işleyişin doğru olduğu anlamına gelmez.

Öncelik, yeni şemayı koruyan düzeltme sürümüyle sorunu gidermektir. Gerçek rollback gerekirse eski imajlar, DB, Redis'teki bekleyen event'ler ve dosya volume'ları birlikte değerlendirilmelidir. Eski event'lerin yeniden işlenmesi ve daha önce gönderilmiş e-postalar/oluşturulmuş kuponlar yalnızca DB geri yüklemesiyle geri alınamaz.

Bu belge bir uygulama talimatıdır; içindeki komutların canlı ortamda çalıştırıldığı veya dağıtımın tamamlandığı anlamına gelmez.
