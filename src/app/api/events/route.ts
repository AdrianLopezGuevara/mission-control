import { NextResponse } from 'next/server';
import { addSSEClient, removeSSEClient } from '@/lib/data';
import crypto from 'crypto';

export async function GET() {
  const id = crypto.randomUUID();
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"connected":true}\n\n`));
      addSSEClient({ id, controller });
    },
    cancel() {
      removeSSEClient(id);
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
