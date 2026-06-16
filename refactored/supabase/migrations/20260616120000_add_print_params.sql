-- Store the authoritative slicer breakdown computed server-side at order time.
-- { quality, layerHeight, walls, topLayers, bottomLayers, support, surfaceAreaCm2,
--   bbox, filamentLengthM, printTimeMin, shellG, infillG, supportG, priceFactor }
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_params JSONB;

-- ── Pricing-integrity hardening ──────────────────────────────────────────
-- Orders are now created exclusively by the trusted server function
-- (createOrder), which re-slices the STL and writes the price itself. Clients
-- must not be able to insert orders (and thus pick their own price).
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
REVOKE INSERT ON public.orders FROM authenticated;

-- Customers may only attach a receipt and move a pending order to
-- 'awaiting_confirmation'. They must not be able to edit price, weight, or jump
-- straight to 'confirmed'. Column-level UPDATE privileges enforce the first;
-- the tightened WITH CHECK enforces the second.
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (receipt_path, status) ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Users can update receipt on their pending orders" ON public.orders;
CREATE POLICY "Users can attach a receipt to their pending orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending_payment', 'awaiting_confirmation'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending_payment', 'awaiting_confirmation'));
