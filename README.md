# Sansan POS Backend

Backend POS dùng NestJS + Prisma + PostgreSQL.

## Module

- `auth`
- `users`
- `product`
- `inventory`
- `order`
- `revenue-log`
- `invoice`
- `audit-log`
- `reports`

## Lệnh chạy

```bash
npm install
npx prisma migrate dev
npm run seed
npm run start
```

## Test

```bash
npm test -- --runInBand
```

## File quan trọng

- [schema.prisma](/Users/viethung-phenikaax/Desktop/phenikaaX/POS-System/sansan-store-be/prisma/schema.prisma)
- [order.service.ts](/Users/viethung-phenikaax/Desktop/phenikaaX/POS-System/sansan-store-be/src/order/order.service.ts)
- [protect_financial_integrity migration](</Users/viethung-phenikaax/Desktop/phenikaaX/POS-System/sansan-store-be/prisma/migrations/20260417032000_protect_financial_integrity/migration.sql>)
- [harden_append_only_integrity migration](</Users/viethung-phenikaax/Desktop/phenikaaX/POS-System/sansan-store-be/prisma/migrations/20260417035200_harden_append_only_integrity/migration.sql>)

Xem hướng dẫn đầy đủ ở [README.md](/Users/viethung-phenikaax/Desktop/phenikaaX/POS-System/README.md).
