import { db } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { isAdministrator } from '@/lib/role-access';

export async function getTeacherClassIds(userId: string): Promise<string[]> {
  const classes = await db.classGroup.findMany({
    where: {
      OR: [
        { responsibleTeacherId: userId },
        { teachers: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return classes.map((classGroup) => classGroup.id);
}

export async function canAccessStudent(user: SessionUser, studentId: string): Promise<boolean> {
  if (isAdministrator(user.role)) return true;

  const student = await db.student.findFirst({
    where: { id: studentId, deletedAt: null },
    select: { id: true, userId: true, schoolId: true },
  });

  if (!student || (user.schoolId && student.schoolId !== user.schoolId)) return false;
  if (user.role === 'STUDENT') return student.userId === user.id;

  if (user.role === 'PARENT') {
    return Boolean(
      await db.parentStudentLink.findFirst({
        where: { parentId: user.id, studentId, schoolId: student.schoolId },
        select: { id: true },
      })
    );
  }

  if (user.role === 'TEACHER') {
    const classIds = await getTeacherClassIds(user.id);
    return Boolean(
      classIds.length && await db.enrollment.findFirst({
        where: { studentId, classGroupId: { in: classIds }, endDate: null },
        select: { id: true },
      })
    );
  }

  return false;
}

export async function canAccessClass(user: SessionUser, classGroupId: string): Promise<boolean> {
  if (isAdministrator(user.role)) return true;

  if (user.role === 'TEACHER') {
    const classIds = await getTeacherClassIds(user.id);
    return classIds.includes(classGroupId);
  }

  if (user.role === 'STUDENT') {
    return Boolean(await db.enrollment.findFirst({
      where: { classGroupId, student: { userId: user.id }, endDate: null },
      select: { id: true },
    }));
  }

  if (user.role === 'PARENT') {
    return Boolean(await db.enrollment.findFirst({
      where: { classGroupId, endDate: null, student: { parentStudentLinks: { some: { parentId: user.id } } } },
      select: { id: true },
    }));
  }

  return false;
}
