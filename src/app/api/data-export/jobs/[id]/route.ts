import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const job = await db.dataExportJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    // Check access
    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL' &&
      job.userId !== session.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Data Export Job GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'VICE_PRINCIPAL'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const job = await db.dataExportJob.findUnique({ where: { id } });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    await db.dataExportJob.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Data Export Job DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
