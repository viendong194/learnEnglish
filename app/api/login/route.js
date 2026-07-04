import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const validUsername = process.env.APP_USERNAME;
    const validPassword = process.env.APP_PASSWORD;

    if (!validUsername || !validPassword) {
      return NextResponse.json(
        { error: 'Server chưa cấu hình APP_USERNAME/APP_PASSWORD.' },
        { status: 500 }
      );
    }

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' }, { status: 401 });
    }

    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error('[api/login]', err);
    return NextResponse.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
