import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    // Check if virtual character is enabled
    const aiSettings = await db.aISettings.findUnique({
      where: { schoolId },
      select: { virtualCharacterEnabled: true },
    });

    const enabled = aiSettings?.virtualCharacterEnabled ?? true;

    // Get or create virtual character
    let character = await db.virtualCharacter.findUnique({
      where: { userId: session.userId },
    });

    if (!character) {
      // Create default character
      character = await db.virtualCharacter.create({
        data: {
          userId: session.userId,
          schoolId,
          characterId: 'owl',
          name: 'Eule',
          color: '#10b981',
          level: 1,
          xp: 0,
          mood: 'happy',
        },
      });
    }

    return NextResponse.json({ character, enabled });
  } catch (error) {
    console.error('Virtual Character GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { schoolId } = session.user;
    if (!schoolId) {
      return NextResponse.json({ error: 'No school assigned' }, { status: 403 });
    }

    const body = await request.json();
    const { characterId, name, color, mood, accessories } = body;

    // Get existing character
    const existing = await db.virtualCharacter.findUnique({
      where: { userId: session.userId },
    });

    if (!existing) {
      // Create new character
      const character = await db.virtualCharacter.create({
        data: {
          userId: session.userId,
          schoolId,
          characterId: characterId || 'owl',
          name: name || 'Eule',
          color: color || '#10b981',
          level: 1,
          xp: 0,
          mood: mood || 'happy',
          accessories: accessories || null,
        },
      });
      return NextResponse.json(character);
    }

    // Update existing character
    const character = await db.virtualCharacter.update({
      where: { id: existing.id },
      data: {
        ...(characterId ? { characterId } : {}),
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(mood ? { mood } : {}),
        ...(accessories !== undefined ? { accessories } : {}),
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error('Virtual Character PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
