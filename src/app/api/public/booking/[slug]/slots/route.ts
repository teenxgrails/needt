import { NextRequest, NextResponse } from "next/server";

import { getBookingSlots } from "@/services/bookings/booking-service";

import { enforceRateLimits, ipRule } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const limited = await enforceRateLimits(
    [ipRule(request, "booking-slots:ip", 30, 60)],
    { route: request.nextUrl.pathname }
  );
  if (limited) return limited;
  const { slug } = await params;
  const fromValue = request.nextUrl.searchParams.get("from");
  const from = fromValue ? new Date(fromValue) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  const result = await getBookingSlots(slug, { from, days: 14 });
  if (!result) {
    return NextResponse.json({ error: "Booking page not found" }, { status: 404 });
  }
  return NextResponse.json({
    timeZone: result.page.timeZone,
    durationMinutes: result.page.durationMinutes,
    slots: result.slots,
  });
}
