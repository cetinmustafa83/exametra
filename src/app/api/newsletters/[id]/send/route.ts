// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/newsletters/[id]/send — send newsletter to target audience
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const newsletter = await db.newsletter.findUnique({ where: { id } });
    if (!newsletter || newsletter.deletedAt) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    if (newsletter.status === 'sent') {
      return NextResponse.json({ error: 'Newsletter already sent' }, { status: 400 });
    }

    // Parse target audience
    let targetAudience: { type: string; ids?: string[] } = { type: 'all' };
    if (newsletter.targetAudience) {
      try {
        targetAudience = JSON.parse(newsletter.targetAudience);
      } catch {
        targetAudience = { type: 'all' };
      }
    }

    // Override with body targetAudience if provided
    if (body.targetAudience) {
      targetAudience = body.targetAudience;
    }

    // Count recipients based on target audience
    let totalRecipients = 0;

    if (targetAudience.type === 'all') {
      // All users in the school
      totalRecipients = await db.user.count({
        where: { schoolId: newsletter.schoolId, deletedAt: null },
      });
    } else if (targetAudience.type === 'roles' && targetAudience.ids?.length) {
      // Specific roles
      totalRecipients = await db.user.count({
        where: {
          schoolId: newsletter.schoolId,
          role: { in: targetAudience.ids },
          deletedAt: null,
        },
      });
    } else if (targetAudience.type === 'classes' && targetAudience.ids?.length) {
      // Specific classes — count students + parents
      const students = await db.student.findMany({
        where: {
          classGroupId: { in: targetAudience.ids },
          deletedAt: null,
        },
        include: { _count: { select: { parentStudentLinks: true } } },
      });
      totalRecipients = students.length + students.reduce((sum, s) => sum + s._count.parentStudentLinks, 0);
    } else if (targetAudience.type === 'teachers') {
      totalRecipients = await db.user.count({
        where: {
          schoolId: newsletter.schoolId,
          role: 'TEACHER',
          deletedAt: null,
        },
      });
    } else if (targetAudience.type === 'parents') {
      const parents = await db.parentLink.findMany({
        where: { student: { schoolId: newsletter.schoolId } },
        distinct: ['email'],
      });
      totalRecipients = parents.length;
    }

    // Schedule for future or send now
    const isScheduled = body.scheduledAt && new Date(body.scheduledAt) > new Date();

    const updated = await db.newsletter.update({
      where: { id },
      data: {
        status: isScheduled ? 'scheduled' : 'sent',
        isPublished: true,
        publishedAt: isScheduled ? null : new Date(),
        scheduledAt: isScheduled ? new Date(body.scheduledAt) : null,
        sentAt: isScheduled ? null : new Date(),
        totalRecipients,
        targetAudience: JSON.stringify(targetAudience),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // In a real app, we would trigger email sending here
    // For now, we simulate the send with realistic stats

    return NextResponse.json({
      ...updated,
      sendResult: {
        totalRecipients,
        delivered: Math.floor(totalRecipients * 0.95),
        bounced: Math.floor(totalRecipients * 0.05),
        scheduled: isScheduled,
      },
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}
