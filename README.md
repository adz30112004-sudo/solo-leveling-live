# 🎮 TIKTOK LIVE INTERACTIVE GAME TEMPLATE (PHỐ ĐI BỘ GHÉP ĐÔI)

Dự án mẫu hoàn chỉnh cho **Game Tương Tác TikTok Live** (TikTok Interactive Web Game), kết nối trực tiếp sự kiện Donate Quà, Chat, Thả Tim từ phòng Live TikTok thật về máy chủ thời gian thực (Real-time).

---

## 🌟 Điểm Nổi Bật & Tính Năng
- **100% Miễn Phí, Không Cần Mua API:** Tích hợp `piratetok-live-js` kết nối trực tiếp đến Webcast WebSocket của TikTok, giải mã nhị phân Protobuf, không cần API key hay EulerStream.
- **Không Cần Đăng Nhập:** Không yêu cầu mật khẩu hay phiên đăng nhập của streamer, đảm bảo an toàn tuyệt đối cho tài khoản TikTok.
- **Độ Nét Chuẩn Studio 1080p (Auto-Fit Engine):** Tự động co giãn theo tỷ lệ 9:16 (Auto Vector Scaling), sắc nét 100% trong TikTok Live Studio & OBS mà không cần kéo dãn thủ công.
- **Bảng Điều Khiển Admin Đa Năng:**
  - Giả lập test đầy đủ: Vào hàng đợi, tặng quà, cướp bồ, chúc phúc, phá duyên, phát âm thanh.
  - Điều khiển máy chủ từ xa: Cho phép dán link web online (Render) để điều khiển trực tiếp.
  - Kết nối Live thật 1 chạm: Nhập Username kênh TikTok Live là nhận dữ liệu ngay.
- **Hạ Tầng Âm Thanh & Đồ Hoạ Tích Hợp:** Bộ âm thanh hiệu ứng đầy đủ (coin, fanfare, sấm sét, lồng tiếng cướp bồ, nhạc nền BGM loop) cùng kho icon quà tặng chuẩn TikTok.

---

## 📂 Cấu Trúc Mã Nguồn

```text
tiktok-matchmaker/
├── server.js               # Máy chủ Node.js: Xử lý Socket.IO & kết nối TikTok Live
├── package.json            # Cấu hình thư viện và lệnh khởi chạy
├── .gitignore              # Bỏ qua node_modules, binary và file log
├── README.md               # Tài liệu hướng dẫn sử dụng và nhân bản
│
└── public/                 # Giao diện Frontend hiển thị cho Streamer & Khán giả
    ├── index.html          # Màn hình Game chính (Dán link vào TikTok Live Studio / OBS)
    ├── admin.html          # Bảng điều khiển quản trị & kết nối Live
    │
    ├── css/
    │   └── style.css       # Toàn bộ hiệu ứng CSS, sân khấu, bục hoa, hoạt ảnh
    │
    ├── js/
    │   └── game.js         # Logic game, xếp hàng, tính % phù hợp, hàng đợi toast quà
    │
    └── assets/             # Tài nguyên đồ họa & âm thanh
        ├── male_body.png           # Nhân vật Nam
        ├── female_body.png         # Nhân vật Nữ
        ├── street_background.png   # Hình nền Phố đi bộ Hồ Gươm (Cầu Thê Húc & Tháp Rùa)
        ├── icons/                  # 20+ Icon quà tặng TikTok (Rose, TikTok, Finger Heart...)
        └── sounds/                 # Âm thanh hiệu ứng (WAV) & BGM
```

---

## 🚀 Hướng Dẫn Khởi Chạy Local (Trên Máy Tính)

1. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```

2. Khởi động server game:
   ```bash
   npm start
   ```

3. Mở trên trình duyệt:
   - **Màn hình Game (OBS):** `http://localhost:3000`
   - **Trang Quản Trị (Admin):** `http://localhost:3000/admin.html`

---

## 🌐 Hướng Dẫn Triển Khai Lên Render (Chạy Online 24/7 Miễn Phí)

1. Đẩy mã nguồn lên GitHub của bạn:
   ```bash
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
2. Vào **[Render.com](https://dashboard.render.com)** ➔ Bấm **New Web Service** ➔ Chọn repository GitHub vừa tạo.
3. Cài đặt:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Bấm **Deploy Web Service**. Sau 1 - 2 phút bạn sẽ có link online vĩnh viễn:
   - Link Game Live: `https://<ten-game>.onrender.com`
   - Link Admin: `https://<ten-game>.onrender.com/admin.html`

---

## 🛠️ Hướng Dẫn Nhân Bản Làm Game Mới Tương Tự

Khi muốn phát triển một game tương tác mới (ví dụ: *Đua xe tặng quà, Tháp sinh tồn, Đại chiến PK Bang hội, Đố vui có thưởng...*):

1. **Nhân bản thư mục:**
   ```bash
   cp -r tiktok-matchmaker my-new-tiktok-game
   cd my-new-tiktok-game
   ```

2. **Tùy biến Game Logic (`server.js`):**
   - Trong hàm `connectToTikTok(username)`:
     - Giữ nguyên cơ chế bắt sự kiện `EventType.GIFT`, `EventType.CHAT`, `EventType.LIKE`.
     - Thay đổi bảng ánh xạ quà (`giftName` hoặc `diamonds`) để cộng điểm, đẩy thuyền, bắn đạn, nâng cấp tướng... theo luật chơi của game mới.

3. **Tùy biến Giao Diện (`public/index.html` & `public/css/style.css`):**
   - Thay ảnh nền trong `public/assets/street_background.png` bằng hình nền chủ đề mới.
   - Thay các nhân vật và hiệu ứng trên sân khấu.
   - Giữ nguyên khối script **Auto-Fit Studio** trong `index.html` và `style.css` để game tự động căn nét chuẩn 1080p trên mọi màn hình live.

4. **Tùy biến Bảng Test (`public/admin.html`):**
   - Giữ nguyên cụm điều khiển máy chủ từ xa và ô kết nối TikTok Live thật.
   - Thêm/bớt các nút giả lập quà tặng và hành động phù hợp với gameplay mới.

