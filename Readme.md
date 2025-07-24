# 🚀 Barkod & Stok Yönetimi (Next.js)

Küçük/orta ölçekli işletmeler için modern, güvenli ve hızlı barkodlu stok & satış yönetimi. Next.js (App Router), MongoDB, Tailwind, koyu/açık tema, Excel ile toplu yükleme ve gelişmiş analiz özellikleriyle.

---

## 🔧 Kurulum

### Gereksinimler

- Node.js >= 18
- npm veya yarn
- MongoDB bağlantı adresi

### Adımlar

```bash
cd barkod-nextjs
cp .env.local.example .env.local # .env dosyanı oluştur
npm install
npm run dev
```

### .env.local Örneği

```
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/dbadi
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

---

## 🚀 Kullanım

- Uygulama: `http://localhost:3000`
- Tüm API ve frontend tek Next.js projesinde
- Tüm ayarlar `.env.local` dosyasından alınır

---

## 🌟 Özellikler

- Barkod ile ürün arama ve satış
- Ürün ekleme, silme, düzenleme (tekil & Excel ile toplu)
- Satış işlemleri ve geçmişi, Excel'e aktarım
- Stok durumu ve kritik stok uyarıları
- Analitik sayfasında grafiklerle satış ve stok analizi
- Koyu/açık tema (otomatik ve manuel)
- Safe-area ve responsive tasarım (mobil/tablet/masaüstü)
- Tüm finansal veriler için gizlilik (göz simgesiyle göster/gizle)
- Gelişmiş modal ve input okunabilirliği
- 20'li sayfalama (pagination) ürün listesinde
- Güvenli httpOnly cookie ve güvenlik önlemleri

---

## 📁 Ana Dosya & Klasörler

- `src/app/api/` : Next.js API route'ları (ürün, satış, analiz)
- `src/components/` : React bileşenleri (ProductsPage, SalesPage, AnalyticsPage, Header, Navigation, BarcodeScanner, ProductForm, SaleModal, SalesHistory)
- `src/contexts/ThemeContext.tsx` : Tema yönetimi
- `public/example-bulk-products.xlsx` : Toplu yükleme için örnek Excel

---

## 📊 Toplu Ürün Yükleme (Excel)

- "Toplu Ürün Ekle" ile Excel dosyası yükleyin
- Gerekli başlıklar: `barcode`, `name`, `price`, `stock`, `category`, `brand`
- Örnek dosya: `public/example-bulk-products.xlsx`

---

## 🤝 Katkıda Bulunma

- PR gönderebilir, issue açabilirsin.
- Kodun okunabilir ve temiz olmasına özen göster.

## 📄 Lisans

MIT

## 📬 İletişim

---

> Modern, güvenli ve hızlı stok yönetimi için tasarlandı.
