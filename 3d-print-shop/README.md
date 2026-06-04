# 3D Print Shop - Professional 3D Printing Service

A complete, production-ready web application for managing 3D printing orders. Customers upload STL files, get instant pricing based on weight, pay securely, and prints are automatically added to the print queue.

## Features

✨ **Core Features**
- 📤 STL file upload with drag-and-drop support
- ⚡ Automatic STL parsing and volume/weight calculation
- 💰 Instant pricing calculation (30,000 Toman per gram)
- 💳 Secure payment processing with Stripe integration
- 📋 Admin dashboard for order management
- 🖨️ Automatic print queue management
- 📧 Email notifications (ready to integrate)

✨ **Technical Features**
- Next.js 16 with App Router
- React 19 with TypeScript
- SQLite database with better-sqlite3
- Beautiful UI with Tailwind CSS
- Responsive design for all devices
- Professional animations with Framer Motion
- Real-time order tracking

## Quick Start

### Prerequisites
- Node.js 18.17 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Customer Portal
1. Go to home page
2. Upload STL file
3. View instant price estimate
4. Proceed to checkout
5. Complete payment
6. Order is automatically added to print queue

### Admin Dashboard
1. Navigate to `/admin`
2. Login with password: `admin` (demo mode)
3. View all orders
4. Filter by status (Pending, Paid, Confirmed, Printing, Completed)
5. Confirm payments
6. Track print progress
7. Mark orders as completed

## Project Structure

```
3d-print-shop/
├── app/
│   ├── api/
│   │   ├── upload/          # STL file upload endpoint
│   │   ├── calculate/       # Cost calculation endpoint
│   │   ├── payment/         # Payment confirmation endpoint
│   │   ├── orders/          # Order management endpoint
│   │   └── admin/           # Admin-only endpoints
│   ├── admin/               # Admin dashboard page
│   ├── checkout/            # Checkout page
│   ├── components/          # React components
│   ├── page.tsx            # Home page
│   └── layout.tsx          # Root layout
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── db.ts               # SQLite database interface
│   ├── stl-parser.ts       # STL file parsing and volume calculation
│   └── form-parser.ts      # Form data parsing
├── public/
│   ├── uploads/            # Uploaded STL files
│   └── print-queue/        # Confirmed print files
└── data/
    └── printing-shop.db    # SQLite database file
```

## API Endpoints

### Upload STL File
- **POST** `/api/upload`
- Request: FormData with `file` and `email`
- Response: Order details with price estimate

### Calculate Cost
- **POST** `/api/calculate`
- Request: `{ weight: number }`
- Response: `{ cost: number, pricePerGram: 30000 }`

### Confirm Payment
- **POST** `/api/payment`
- Request: `{ orderId: string, paymentIntentId: string }`
- Response: Updated order with `status: 'paid'`

### Get Order
- **GET** `/api/orders?orderId=...`
- Response: Order details

### Admin Orders
- **GET** `/api/admin/orders` (requires auth)
- Response: All orders or filtered by status

- **PUT** `/api/admin/orders` (requires auth)
- Request: `{ orderId: string, status: string }`
- Response: Updated order

## Configuration

### Pricing
Edit the price per gram in `lib/stl-parser.ts`:
```typescript
export function calculateCost(weightGrams: number, pricePerGram: number = 30000): number {
  return Math.ceil(weightGrams * pricePerGram);
}
```

### Admin Password
In development mode, login with password `admin` on `/admin`.
For production, implement proper authentication using environment variables or external services.

## STL File Processing

The application automatically:
1. Parses both ASCII and binary STL files
2. Calculates object volume using the signed volume algorithm
3. Estimates weight based on PLA filament density (1.24 g/cm³)
4. Calculates cost with a minimum weight of 0.1g

For custom materials, adjust the `FILAMENT_DENSITY` constant in `lib/stl-parser.ts`.

## Database Schema

The SQLite database contains one main table:

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  filename TEXT NOT NULL,
  filesize INTEGER NOT NULL,
  weight REAL NOT NULL,
  cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  payment_confirmed_at DATETIME,
  completed_at DATETIME,
  notes TEXT
)
```

## Environment Variables

Create a `.env.local` file for production:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
ADMIN_PASSWORD=your_secure_password
```

## Production Deployment

### Build
```bash
npm run build
```

### Start
```bash
npm start
```

### Deployment Options
- **Vercel** (recommended for Next.js)
- **AWS EC2**
- **DigitalOcean**
- **Self-hosted VPS**

⚠️ **Note**: For production, ensure to:
1. Configure proper authentication for admin panel
2. Set up Stripe webhook handlers
3. Configure email notifications
4. Use environment variables for sensitive data
5. Set up HTTPS/SSL
6. Configure CORS properly
7. Set up database backups
8. Implement rate limiting

## Features Coming Soon

- 🎨 STL file preview with Three.js visualization
- 📧 Email notifications for order status
- 📱 Mobile app
- 🎯 Order tracking via QR code
- 💬 Live chat support
- 🎁 Discount codes and loyalty program
- 📊 Advanced analytics dashboard

## Technologies Used

- **Frontend**: React 19, Next.js 16, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite with better-sqlite3
- **Payment**: Stripe (ready to integrate)
- **UI Components**: Radix UI, Lucide Icons, Huge Icons
- **Forms**: React Hook Form, Zod validation

## License

MIT

## Support

For questions or issues, contact: support@3dprintshop.com

---

Built with ❤️ for the 3D printing community
