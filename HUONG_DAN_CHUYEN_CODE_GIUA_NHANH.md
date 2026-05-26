# Huong Dan Chuyen Code Giua Nhanh

Tai lieu nay dung khi da lam xong mot tinh nang o mot nhanh, vi du `test`, va muon dua dung tinh nang do sang nhanh khac, vi du `production`, ma khong merge ca nhanh.

## 1. Kiem tra nhanh hien tai

```bash
git branch --show-current
git status --short
git log --oneline --decorate -5
```

Neu co file local khong lien quan nhu `.DS_Store` hoac cau hinh API local, khong dua vao commit:

```bash
git restore --staged server/.DS_Store sohoa-bbk-web/src/api/axiosClient.js
```

Neu chung chua staged thi chi can khong `git add` chung.

## 2. Commit tinh nang tren nhanh dang lam

Vi du dang o nhanh `test` va muon commit phan import thong so kiem:

```bash
git add server/routes/lookup.routes.js
git add sohoa-bbk-web/src/api/lookup.api.js
git add sohoa-bbk-web/src/features/DanhMuc/components/SanPhamManager.jsx
git commit -m "Them import thong so kiem"
```

Kiem tra commit vua tao:

```bash
git log --oneline --decorate -3
```

Ghi lai ma commit, vi du:

```text
abc1234 Them import thong so kiem
```

## 3. Dua commit sang nhanh production

Chuyen sang `production`:

```bash
git switch production
```

Cherry-pick commit can lay:

```bash
git cherry-pick abc1234
```

Neu muon xem truoc commit co nhung file nao:

```bash
git show --name-only --oneline abc1234
```

## 4. Neu commit co lan file khong muon lay

Dung cach cherry-pick khong commit ngay:

```bash
git cherry-pick -n abc1234
```

Loai file khong muon lay, vi du `axiosClient.js`:

```bash
git restore --source=HEAD -- sohoa-bbk-web/src/api/axiosClient.js
git restore --source=HEAD -- server/.DS_Store
```

Sau do commit lai:

```bash
git status --short
git add server/routes/lookup.routes.js
git add sohoa-bbk-web/src/api/lookup.api.js
git add sohoa-bbk-web/src/features/DanhMuc/components/SanPhamManager.jsx
git commit -m "Them import thong so kiem"
```

## 5. Neu bi conflict

Kiem tra file conflict:

```bash
git status
```

Mo tung file conflict, giu ca hai phan neu chung khong loai tru nhau. Sau khi sua xong:

```bash
git add <file-da-sua>
git cherry-pick --continue
```

Neu muon huy cherry-pick dang lam:

```bash
git cherry-pick --abort
```

## 6. Kiem tra truoc khi push

Kiem tra server:

```bash
node --check server/routes/lookup.routes.js
```

Build web:

```bash
cd sohoa-bbk-web
npm run build
cd ..
```

Kiem tra diff cuoi:

```bash
git status --short
git log --oneline --decorate -3
```

## 7. Push nhanh

Push nhanh hien tai:

```bash
git push origin production
```

Hoac neu dang o `test`:

```bash
git push origin test
```

## Ghi nho

- Dung `cherry-pick` khi chi muon lay mot tinh nang, khong muon merge toan bo nhanh.
- Khong dua `sohoa-bbk-web/src/api/axiosClient.js` vao commit neu chi thay doi baseURL de test local.
- Khong commit `.DS_Store`.
- Luon xem `git status --short` truoc khi commit.
