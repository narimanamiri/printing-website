# 3D Print Shop - Setup Guide

## 🚀 Getting Started

Your 3D printing service website is ready! Follow these steps to get it running locally.

### Prerequisites
- **Node.js** 18.17+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- A code editor like VS Code

---

## 📦 Installation & Setup

### Step 1: Install Dependencies
```bash
cd d:\Folders\printing-website\3d-print-shop
npm install
```

This will install all required packages including:
- Next.js 16
- React 19
- Tailwind CSS
- SQLite for the database
- And more...

### Step 2: Start Development Server
```bash
npm run dev
```

You should see output like:
```
  ▲ Next.js 16.2.7
  - Local:        http://localhost:3000
```

### Step 3: Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

---

## 🎯 Features Ready to Use

### Customer Portal (Home Page)
✅ **Upload STL Files**
- Drag-and-drop upload
- File validation
- Real-time feedback

✅ **Instant Price Calculation**
- Automatic STL parsing
- Volume & weight calculation
- Cost based on 30,000 Toman per gram

✅ **Checkout Page**
- Order summary
- Payment form (demo mode)
- Order tracking

### Admin Dashboard (`/admin`)
✅ **Login**
- Demo password: `admin`
- In-progress orders view
- Status filtering

✅ **Order Management**
- View all orders
- Filter by status
- Confirm payments
- Move to print queue

---

## 📂 Project Structure

```
3d-print-shop/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── upload/          # File upload
│   │   ├── calculate/       # Cost calculation
│   │   ├── payment/         # Payment handling
│   │   ├── orders/          # Order queries
│   │   └── admin/           # Admin operations
│   ├── admin/               # Admin dashboard
│   ├── checkout/            # Checkout page
│   ├── components/          # React components
│   ├── page.tsx            # Home page
│   └── layout.tsx          # Root layout
├── lib/
│   ├── utils.ts            # Utilities
│   ├── db.ts               # Database
│   ├── stl-parser.ts       # STL parsing
│   └── form-parser.ts      # Form handling
├── public/
│   ├── uploads/            # Uploaded files
│   └── print-queue/        # Confirmed files
└── data/
    └── printing-shop.db    # SQLite database
```

---

## 🔧 Configuration

### Change Pricing
Edit `lib/stl-parser.ts`:
```typescript
export function calculateCost(weightGrams: number, pricePerGram: number = 30000): number {
  // Change 30000 to your desired price per gram
  return Math.ceil(weightGrams * pricePerGram);
}
```

### Change Admin Password
Edit `app/admin/page.tsx`:
```typescript
const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  if (password === 'admin') {  // ← Change this
    setIsAuthorized(true);
    localStorage.setItem('admin-auth', 'true');
    setError('');
  } else {
    setError('Invalid password');
  }
};
```

### Customize Material Density
Edit `lib/stl-parser.ts`:
```typescript
const FILAMENT_DENSITY = 1.24; // g/cm³ for PLA
// Change based on your material:
// PLA: 1.24
// ABS: 1.04
// PETG: 1.27
```

---

## 📊 Database

The SQLite database automatically stores:
- ✅ Order information
- ✅ File names and sizes
- ✅ Weight calculations
- ✅ Payment status
- ✅ Print queue status
- ✅ Timestamps

Database file: `data/printing-shop.db` (created automatically)

---

## 🧪 Test the Application

### 1. Test File Upload
- Go to home page
- Enter your email
- Upload a sample STL file (test.stl)
- Verify price calculation

### 2. Test Admin Dashboard
- Navigate to `/admin`
- Login with: `admin`
- See your uploaded order
- Confirm payment
- Check print queue

### 3. View Files
- Uploaded files: `public/uploads/`
- Print queue files: `public/print-queue/`

---

## 📱 Responsive Design

The website looks great on:
- ✅ Desktop (1920px and up)
- ✅ Laptop (1024px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

---

## 🔐 Security Notes (for Production)

⚠️ **Current Implementation is Demo-Only**

For production, you must:

1. **Authentication**
   - Use proper password hashing (bcrypt)
   - Implement JWT tokens
   - Use environment variables

2. **Payment Processing**
   - Integrate Stripe (not demo)
   - Set up webhooks
   - Use HTTPS only

3. **File Upload**
   - Validate file types server-side
   - Implement virus scanning
   - Use secure storage

4. **Database**
   - Use PostgreSQL or MySQL instead of SQLite
   - Enable regular backups
   - Use encrypted connections

5. **Environment Variables**
   - Create `.env.local`:
     ```
     STRIPE_SECRET_KEY=sk_live_...
     STRIPE_PUBLISHABLE_KEY=pk_live_...
     ADMIN_PASSWORD=your_secure_password
     DATABASE_URL=your_database_url
     ```

---

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)
1. Push to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Environment variables auto-configured
4. Automatic deployments on push

### Deploy to Other Services
- AWS EC2: Node.js runtime needed
- DigitalOcean: Similar to EC2
- Self-hosted: Use PM2 for process management

---

## 📧 Next Steps - Features to Add

### High Priority
- [ ] Stripe integration for real payments
- [ ] Email notifications (nodemailer)
- [ ] STL file preview (Three.js)
- [ ] Customer order history page

### Medium Priority
- [ ] Discount codes
- [ ] Multiple material options
- [ ] Bulk pricing
- [ ] Customer reviews

### Low Priority
- [ ] Mobile app
- [ ] Live chat support
- [ ] Analytics dashboard
- [ ] Referral program

---

## 🐛 Troubleshooting

### "npm: command not found"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Close and reopen terminal

### Database locked error
- Delete `data/printing-shop.db-wal` and `data/printing-shop.db-shm`
- Restart development server

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

### Styles not showing
- Clear Next.js cache: `rm -r .next`
- Reinstall: `npm install`

---

## 📞 Support Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Common Issues
- STL parsing problems: Check binary vs ASCII format
- Payment issues: See Stripe docs
- Database issues: Check SQLite documentation

---

## 💡 Tips & Best Practices

1. **Testing Files**: Use sample STL files from [Thingiverse](https://www.thingiverse.com/)
2. **Backup Data**: Regularly backup `data/` folder
3. **Monitor Logs**: Check browser console for errors
4. **Keep Dependencies Updated**: `npm update`
5. **Use TypeScript**: Catch errors before production

---

## 📝 License

MIT - Free to use and modify

---

**Ready to launch?** Start with `npm install && npm run dev` 🚀
