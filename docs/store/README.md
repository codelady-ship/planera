# Mağazalara yayım (#67)

Developer hesabları açılmadan hazırlanan hər şey buradadır: mağaza mətnləri,
gizlilik siyasəti, imzalı build və yükləmə workflow-ları. Hesablar açılanda
yalnız aşağıdakı addımlar qalır.

## Hazır olanlar

- Gizlilik siyasəti (hər iki mağaza tələb edir): https://planera-az.vercel.app/privacy
  (az), `/en/privacy`, `/ru/privacy`. Hesabın silinməsi qaydası da oradadır
  (Play "Account deletion" tələbi üçün eyni link verilir).
- Mağaza mətnləri üç dildə: [listing.md](./listing.md).
- İkonlar: `frontend/android/app/src/main/res` və `frontend/ios/App/App/Assets.xcassets`
  (`node scripts/mobile-assets.mjs` ilə brend işarəsindən yaradılır). Play üçün 512x512
  ikon: `frontend/public/icons/icon-512.png`.
- Ekran şəkilləri: `docs/screenshots/*.png` (sayt); telefon ölçüsündə şəkillər aşağıda.
- `Release Android` workflow: imzalı `.aab` + `.apk`, istəyə görə Play internal track-ə yükləmə.
- `Release iOS` workflow: arxiv və TestFlight-a yükləmə (App Store Connect API açarı ilə).

## Google Play

1. Hesab: https://play.google.com/console (25 USD birdəfəlik, şəxsiyyət təsdiqi).
2. Upload açarı (bir dəfə, kompüterdə): `scripts/android-keystore.sh` -> çıxışdakı `gh secret set`
   əmrlərini işlədin (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`). Keystore faylını və şifrəni saxlayın.
3. Actions -> **Release Android** -> Run workflow (versiya məsələn `1.0.0`) -> artifact-dan
   `app-release.aab` endirin.
4. Play Console -> Create app -> ad `Planera`, default dil Azerbaijani, Free, App ->
   "Set up your app" bölməsini [listing.md](./listing.md) ilə doldurun (privacy policy linki,
   data safety cavabları, content rating anketi, target audience 18+).
5. Testing -> Internal testing -> Create release -> `.aab` yükləyin -> test siyahısına
   e-poçtlar əlavə edin. Fərdi hesabda production-dan əvvəl 20 testçi ilə 14 günlük
   qapalı test (Closed testing) məcburidir.
6. Avtomatik yükləmə üçün: Play Console -> Setup -> API access -> service account yaradın
   (Google Cloud), ona "Release manager" icazəsi verin, JSON açarını `PLAY_SERVICE_ACCOUNT_JSON`
   secret-inə yazın; bundan sonra workflow seçilən track-ə özü yükləyir.

## Apple App Store

1. Hesab: https://developer.apple.com/programs/enroll (99 USD/il).
2. App Store Connect -> Users and Access -> Integrations -> App Store Connect API ->
   açar yaradın (App Manager) -> `.p8` faylını endirin. GitHub Secrets:
   `APPLE_TEAM_ID` (Membership səhifəsində), `ASC_KEY_ID`, `ASC_ISSUER_ID`,
   `ASC_KEY_BASE64` (`base64 -w0 AuthKey_XXXX.p8`).
3. App Store Connect -> Apps -> New App: platform iOS, ad `Planera`, bundle ID `az.planera.app`
   (Identifiers-də əvvəlcə yaradın: Capabilities -> Push Notifications lazım deyil, lokal bildiriş
   istifadə olunur; Siri qısayolu üçün heç bir xüsusi capability lazım deyil).
4. Actions -> **Release iOS** -> Run workflow -> build TestFlight-da görünür (10-15 dəq);
   TestFlight -> Internal testers ilə iPhone-da yoxlayın.
5. App Store -> versiya yaradın, [listing.md](./listing.md) mətnləri və ekran şəkilləri ->
   Submit for review.

## Ekran şəkilləri

Hər iki mağaza telefon ölçüsündə şəkil istəyir (Play: ən azı 2, 16:9 və ya 9:16, 320-3840 px;
App Store: 6.7" 1290x2796 və 6.5" 1284x2778). Chrome DevTools-da "Pixel 7" / "iPhone 15 Pro Max"
emulyasiyası ilə bu səhifələri çəkin: ana səhifə, axtarış, mütəxəssis profili, randevu sihirbazı
(saat seçimi), kabinet -> gündəlik, bildiriş ayarları. Mətnlər sayt dilində olduğu üçün az/en/ru
üçün ayrıca dəst çəkilə bilər.

## Versiya

- Android `versionCode` = workflow-un `run_number`-i (hər dəfə artır), `versionName` = input.
- iOS `CFBundleVersion` = `run_number`, `MARKETING_VERSION` = input.
