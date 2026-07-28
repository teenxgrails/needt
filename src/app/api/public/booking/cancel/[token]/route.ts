import { NextRequest, NextResponse } from "next/server";

import {
  BookingConflictError,
  cancelBooking,
} from "@/services/bookings/booking-service";

import { enforceRateLimits, ipRule } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = await enforceRateLimits(
    [ipRule(request, "booking-cancel:ip", 10, 10 * 60)],
    { route: request.nextUrl.pathname }
  );
  if (limited) return limited;
  const { token } = await params;
  try {
    const booking = await cancelBooking(token);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ canceled: true });
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        { error: "The cancellation window has closed" },
        { status: 409 }
      );
    }
    throw error;
  }
}
