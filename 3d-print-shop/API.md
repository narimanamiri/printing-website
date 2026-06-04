# 3D Print Shop API Documentation

Complete API reference for the 3D printing service backend.

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

---

## 📤 Upload Endpoint

### Upload STL File
Create a new order by uploading an STL file.

**Endpoint**: `POST /api/upload`

**Content-Type**: `multipart/form-data`

**Request Parameters**:
```
file: File (required)
  - Type: .stl file (ASCII or binary)
  - Max size: 100MB
email: string (required)
  - Customer email address
  - Format: valid email
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@model.stl" \
  -F "email=customer@example.com"
```

**Success Response (200)**:
```json
{
  "success": true,
  "orderId": "order-1704067200000-abc123def",
  "filename": "8e4f5c3a-model.stl",
  "weight": 25.5,
  "cost": 765000,
  "volume": 20639
}
```

**Error Response (400)**:
```json
{
  "error": "Only STL files are accepted"
}
```

---

## 💰 Calculate Cost Endpoint

### Calculate Printing Cost
Get the price for a specific weight (without file upload).

**Endpoint**: `POST /api/calculate`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "weight": 25.5
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"weight": 25.5}'
```

**Success Response (200)**:
```json
{
  "success": true,
  "weight": 25.5,
  "cost": 765000,
  "pricePerGram": 30000
}
```

---

## 📦 Order Endpoints

### Get Order Details
Retrieve information about a specific order.

**Endpoint**: `GET /api/orders?orderId=...`

**Query Parameters**:
```
orderId: string (required)
  - Order ID from upload response
  - Format: "order-{timestamp}-{randomId}"
```

**Example Request**:
```bash
curl http://localhost:3000/api/orders?orderId=order-1704067200000-abc123def
```

**Success Response (200)**:
```json
{
  "success": true,
  "order": {
    "id": "order-1704067200000-abc123def",
    "email": "customer@example.com",
    "filename": "8e4f5c3a-model.stl",
    "filesize": 1048576,
    "weight": 25.5,
    "cost": 765000,
    "status": "pending",
    "stripe_payment_intent": null,
    "uploaded_at": "2024-01-01T12:00:00Z",
    "payment_confirmed_at": null,
    "completed_at": null,
    "notes": null
  }
}
```

**Error Response (404)**:
```json
{
  "error": "Order not found"
}
```

---

## 💳 Payment Endpoints

### Confirm Payment
Mark an order as paid and add to print queue.

**Endpoint**: `POST /api/payment`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "orderId": "order-1704067200000-abc123def",
  "paymentIntentId": "pi_demo_1234567890"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-1704067200000-abc123def",
    "paymentIntentId": "pi_1234567890"
  }'
```

**Success Response (200)**:
```json
{
  "success": true,
  "order": {
    "id": "order-1704067200000-abc123def",
    "email": "customer@example.com",
    "filename": "8e4f5c3a-model.stl",
    "filesize": 1048576,
    "weight": 25.5,
    "cost": 765000,
    "status": "paid",
    "stripe_payment_intent": "pi_demo_1234567890",
    "uploaded_at": "2024-01-01T12:00:00Z",
    "payment_confirmed_at": "2024-01-01T12:05:00Z",
    "completed_at": null,
    "notes": null
  }
}
```

---

## 🔐 Admin Endpoints

All admin endpoints require authorization.

### Get All Orders
Retrieve all orders with optional status filtering.

**Endpoint**: `GET /api/admin/orders`

**Authorization**: Required (Bearer Token or Development Mode)

**Query Parameters**:
```
status: string (optional)
  - Values: pending, paid, confirmed, printing, completed
```

**Example Request**:
```bash
curl http://localhost:3000/api/admin/orders?status=paid \
  -H "Authorization: Bearer admin-secret-key"
```

**Success Response (200)**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "order-1704067200000-abc123def",
      "email": "customer@example.com",
      "filename": "8e4f5c3a-model.stl",
      "filesize": 1048576,
      "weight": 25.5,
      "cost": 765000,
      "status": "paid",
      "stripe_payment_intent": "pi_demo_1234567890",
      "uploaded_at": "2024-01-01T12:00:00Z",
      "payment_confirmed_at": "2024-01-01T12:05:00Z",
      "completed_at": null,
      "notes": null
    }
  ]
}
```

---

### Update Order Status
Change the status of an order and optionally move file to print queue.

**Endpoint**: `PUT /api/admin/orders`

**Authorization**: Required

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "orderId": "order-1704067200000-abc123def",
  "status": "confirmed"
}
```

**Valid Status Values**:
- `pending` - Awaiting payment
- `paid` - Payment received, awaiting confirmation
- `confirmed` - Admin confirmed, moved to print queue
- `printing` - Currently printing
- `completed` - Print finished, ready for delivery

**Example Request**:
```bash
curl -X PUT http://localhost:3000/api/admin/orders \
  -H "Authorization: Bearer admin-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-1704067200000-abc123def",
    "status": "confirmed"
  }'
```

**Success Response (200)**:
```json
{
  "success": true,
  "order": {
    "id": "order-1704067200000-abc123def",
    "email": "customer@example.com",
    "filename": "8e4f5c3a-model.stl",
    "filesize": 1048576,
    "weight": 25.5,
    "cost": 765000,
    "status": "confirmed",
    "stripe_payment_intent": "pi_demo_1234567890",
    "uploaded_at": "2024-01-01T12:00:00Z",
    "payment_confirmed_at": "2024-01-01T12:05:00Z",
    "completed_at": null,
    "notes": null
  }
}
```

**File Operations**:
When status changes to `confirmed`:
- File is automatically copied to `public/print-queue/`
- Original file remains in `public/uploads/`
- Print queue is ready for your slicer software

---

## 📊 Order Status Workflow

```
pending
   ↓ (payment received)
paid
   ↓ (admin confirms)
confirmed
   ↓ (start printing)
printing
   ↓ (finished printing)
completed
```

---

## ❌ Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process file"
}
```

---

## 📈 Rate Limiting

Current implementation has no rate limiting. For production:
- Implement rate limiting (e.g., 100 requests/minute per IP)
- Use middleware like express-rate-limit
- Monitor for abuse

---

## 🔄 Webhook Events (Future)

Planned webhook events:
- `order.uploaded` - When file is uploaded
- `order.payment_confirmed` - When payment is confirmed
- `order.confirmed` - When admin confirms
- `order.printing_started` - When printing begins
- `order.completed` - When print is finished

---

## 📝 Example Workflow

### 1. Customer Uploads File
```bash
POST /api/upload
{
  "file": model.stl,
  "email": "customer@example.com"
}
→ Response: orderId = "order-123"
```

### 2. Get Order Details
```bash
GET /api/orders?orderId=order-123
→ Response: cost = 765000, status = "pending"
```

### 3. Process Payment
```bash
POST /api/payment
{
  "orderId": "order-123",
  "paymentIntentId": "pi_123"
}
→ Response: status = "paid"
```

### 4. Admin Confirms Order
```bash
PUT /api/admin/orders
{
  "orderId": "order-123",
  "status": "confirmed"
}
→ File moved to print-queue/
```

### 5. Start Printing
```bash
PUT /api/admin/orders
{
  "orderId": "order-123",
  "status": "printing"
}
```

### 6. Mark Complete
```bash
PUT /api/admin/orders
{
  "orderId": "order-123",
  "status": "completed"
}
```

---

## 🧪 Testing

### Using cURL
```bash
# Upload file
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.stl" \
  -F "email=test@example.com"

# Get order
curl http://localhost:3000/api/orders?orderId=order-123

# Confirm payment
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{"orderId":"order-123","paymentIntentId":"pi_123"}'
```

### Using Postman
1. Import the API documentation
2. Set variables: `{{base_url}}`, `{{orderId}}`
3. Run requests in sequence

### Using JavaScript/Node.js
```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('email', 'test@example.com');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Order ID:', data.orderId);
```

---

## 📚 Related Documentation

- [Setup Guide](./SETUP.md)
- [README](./README.md)
- [STL Parser Documentation](./lib/stl-parser.ts)
- [Database Schema](./lib/db.ts)

---

**Last Updated**: January 2024
**Version**: 1.0.0
