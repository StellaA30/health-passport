import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadAttachment, deleteAttachment, getAttachmentUrl } from '@/lib/s3';
import { getCurrentUser } from '@/lib/session';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry?.attachmentKey) {
      return NextResponse.json({ error: 'No attachment found' }, { status: 404 });
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    if (currentUser.role === 'MANAGER') {
      const owner = await prisma.employee.findUnique({ where: { id: entry.employeeId } });
      if (owner?.managerId !== currentUser.employee.id) {
        return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
      }
    } else if (entry.employeeId !== currentUser.employee.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    const url = await getAttachmentUrl(entry.attachmentKey);
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get attachment' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry) return NextResponse.json({ error: 'Health entry not found' }, { status: 404 });
    if (!currentUser || entry.employeeId !== currentUser.employee.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `health-entries/${id}/${Date.now()}-${file.name}`;

    await uploadAttachment(key, buffer, file.type);

    // Replacing an existing document: remove the previous object so we don't
    // leave orphaned files in the bucket.
    if (entry.attachmentKey && entry.attachmentKey !== key) {
      try {
        await deleteAttachment(entry.attachmentKey);
      } catch (err) {
        console.warn(`Failed to delete replaced attachment ${entry.attachmentKey}: ${err.message}`);
      }
    }

    const updated = await prisma.healthEntry.update({
      where: { id },
      data: { attachmentKey: key },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry?.attachmentKey) return NextResponse.json({ error: 'No attachment to delete' }, { status: 404 });
    if (!currentUser || entry.employeeId !== currentUser.employee.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    await deleteAttachment(entry.attachmentKey);
    const updated = await prisma.healthEntry.update({
      where: { id },
      data: { attachmentKey: null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}