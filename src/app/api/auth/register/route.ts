import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: '公開註冊已停用，請由管理員建立帳號' },
    { status: 403 },
  );
}
