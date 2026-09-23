# Triển khai Phát Long Phước trên backend Z76 hiện tại

Backend duy nhất cung cấp hai nhánh API:

- `/api/*` dùng `db.js`, kết nối `3400.TAG_Duy`.
- `/api/plp/*` dùng `db2.js`, kết nối `3402.TAG_Duy`.

Không cần service hoặc reverse proxy thứ hai. JWT chứa tenant và không thể dùng chéo hai nhánh API.

## Cấu hình

Thêm các biến trong `server/.env.db2.example` vào file `.env` đang chạy backend. Nếu server, user và password của hai cổng giống nhau thì chỉ cần:

```env
DB2_PORT=3402
DB2_DATABASE=TAG_Duy
PLP_UNIT_ID=1
```

Frontend dùng chung domain:

```env
VITE_Z76_API_URL=https://z76api.z76.vn/api
VITE_PLP_API_URL=https://z76api.z76.vn/api/plp
```

Nếu không cấu hình `VITE_PLP_API_URL`, frontend tự nối `/plp` vào URL Z76.

## Database PLP

Sau khi tạo schema-only `3402.TAG_Duy`:

1. Chạy `server/sql/migrations/20260921_plp_tenant_isolation.sql`.
2. Chạy `server/sql/plp/sync_products_from_qtkd.sql`.
3. Chạy `server/sql/plp/configure_plan_source.sql`.
4. Chạy `node scripts/seed-plp-defects.js` nếu cần sao chép danh mục lỗi chuẩn ban đầu.
5. Kiểm tra `GET /api/plp/health`.

Tài khoản PLP được xác thực tại `3402.TAG_System`, sau đó liên kết JIT vào `3402.TAG_Duy`. Quản trị viên đầu tiên được cấp bằng `server/sql/plp/grant_initial_admin.sql`.
